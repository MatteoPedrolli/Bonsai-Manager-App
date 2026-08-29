import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./lib/db.js";
import {
  DEFAULT_TIPO_OPTIONS, DEFAULT_STATO_OPTIONS, FONT_BODY, INK,
} from "./lib/constants.js";
import * as repo from "./lib/repo.js";
import { exportBackup, importBackup, BackupAnnullato } from "./lib/backup.js";
import { ensurePersisted, storageEstimate } from "./lib/storage.js";
import {
  isDriveConfigured, collegaDrive, scollegaDrive, backupSuDrive,
  backupSuDriveSePossibile, precaricaGis, DriveNonAutorizzato,
} from "./lib/driveBackup.js";
import { dueSummary } from "./lib/reminders.js";
import { TabBar, Toast } from "./components/common.jsx";
import Home from "./components/Home.jsx";
import PlantDetail from "./components/PlantDetail.jsx";
import NewPlantModal from "./components/NewPlantModal.jsx";
import { NewInterventoModal } from "./components/InterventoForm.jsx";
import PlanScreen from "./components/PlanScreen.jsx";
import OpzioniScreen from "./components/OpzioniScreen.jsx";
import UpdatePrompt from "./components/UpdatePrompt.jsx";

// Ogni quanto ricordare un backup, anche senza modifiche recenti.
// 15 giorni: un mese si è rivelato troppo largo (perdita dati, agosto 2026).
const BACKUP_OGNI_MS = 15 * 86400000;

export default function App() {
  const [view, setView] = useState("home"); // home | detail | plan | opzioni
  const [selectedId, setSelectedId] = useState(null);
  const [showNewPlant, setShowNewPlant] = useState(false);
  const [showNewIntervento, setShowNewIntervento] = useState(false);
  const [toast, setToast] = useState("");

  // --- Query reattive su IndexedDB ---
  const plants = useLiveQuery(() => db.plants.orderBy("nome").toArray(), []);
  const planned = useLiveQuery(() => db.planned.toArray(), [], []);
  const tipoMeta = useLiveQuery(() => db.meta.get("tipoOptions"), []);
  const statoMeta = useLiveQuery(() => db.meta.get("statoOptions"), []);
  const backupMeta = useLiveQuery(() => db.meta.get("lastBackupAt"), []);

  const tipoOptions = tipoMeta?.value ?? DEFAULT_TIPO_OPTIONS;
  const statoOptions = statoMeta?.value ?? DEFAULT_STATO_OPTIONS;
  const lastBackupAt = backupMeta?.value ?? null;

  const selected = (plants || []).find((p) => p.id === selectedId);
  const activeTab = view === "detail" ? "home" : view;

  // Promemoria (Fase 3)
  const due = dueSummary(planned);
  const hasData = (plants || []).length > 0;

  // --- Protezione dei dati ---------------------------------------------------
  // Senza storage persistente il browser può cancellare tutto senza avvisare:
  // si chiede il permesso all'avvio (su app installata è automatico e muto).
  const [storage, setStorage] = useState({ checked: false, supported: false, persisted: false, usage: 0, quota: 0 });
  const refreshStorage = useCallback(async () => {
    const p = await ensurePersisted();
    const e = await storageEstimate();
    setStorage({ checked: true, ...p, usage: e?.usage || 0, quota: e?.quota || 0 });
  }, []);
  // All'avvio, e di nuovo entrando in Opzioni: al primo giro la stima dello
  // spazio gira prima che i dati siano scritti e resterebbe ferma a zero.
  useEffect(() => {
    if (view === "opzioni" || !storage.checked) refreshStorage();
  }, [view, storage.checked, refreshStorage]);

  // "Ho modifiche non ancora salvate in un backup?" è un segnale molto più utile
  // del solo tempo trascorso: si confronta l'ultima modifica (schede o foto)
  // con la data dell'ultimo backup.
  const lastPhotoAt = useLiveQuery(
    () => db.photos.orderBy("createdAt").last().then((p) => p?.createdAt || ""),
    [], ""
  );
  const lastChangeAt = (plants || []).reduce(
    (max, p) => (p.updatedAt > max ? p.updatedAt : max),
    lastPhotoAt || ""
  );

  const backupStale = !hasData
    ? false
    : !lastBackupAt
    ? "never"
    : lastChangeAt && lastChangeAt > lastBackupAt
    ? "changes"
    : Date.now() - new Date(lastBackupAt).getTime() > BACKUP_OGNI_MS
    ? "stale"
    : false;

  // Avviso forte: i dati non sono protetti E non c'è una copia recente.
  const dataAtRisk = storage.checked && !storage.persisted && hasData;

  // --- Copia su Google Drive (facoltativa) -----------------------------------
  const driveMeta = useLiveQuery(
    async () => {
      const [c, u] = await Promise.all([
        db.meta.get("driveCollegato"),
        db.meta.get("lastDriveBackupAt"),
      ]);
      return { collegato: Boolean(c?.value), ultimo: u?.value || null };
    },
    [],
    { collegato: false, ultimo: null }
  );
  const drive = { configurato: isDriveConfigured(), ...driveMeta };

  const driveTentato = useRef(false);

  // La libreria di Google va caricata PRIMA che l'utente tocchi il pulsante:
  // aspettarla dentro il clic consuma il gesto, e il browser blocca la finestra.
  useEffect(() => { precaricaGis(); }, []);

  const notify = useCallback((msg) => setToast(msg), []);

  // Tentativo silenzioso all'apertura, una sola volta per sessione: se c'è da
  // salvare e il consenso è ancora valido, la copia parte senza chiedere nulla.
  // Se non è valido non si insiste: in Opzioni resta il pulsante.
  // (Va dopo `notify`: la dipendenza viene letta durante il render.)
  useEffect(() => {
    if (driveTentato.current || !drive.collegato || !hasData || !backupStale) return;
    driveTentato.current = true;
    backupSuDriveSePossibile().then((c) => {
      if (c) notify(`Copia salvata su Drive — ${c.plants} schede, ${c.photos} foto`);
    });
  }, [drive.collegato, hasData, backupStale, notify]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Se la pianta selezionata sparisce (eliminata), torna alla home.
  useEffect(() => {
    if (view === "detail" && plants && !selected) {
      setView("home");
      setSelectedId(null);
    }
  }, [view, plants, selected]);

  // Lo scroll è del documento e sopravvive al cambio vista: aprendo una scheda
  // dal fondo della collezione ci si ritrovava a metà pagina. Entrando in una
  // scheda si va in cima, tornando indietro si ritrova il punto della lista.
  const homeScroll = useRef(0);
  useLayoutEffect(() => {
    window.scrollTo(0, view === "home" ? homeScroll.current : 0);
  }, [view, selectedId]);

  // --- Handlers ---
  const openPlant = (id) => {
    homeScroll.current = window.scrollY;
    setSelectedId(id);
    setView("detail");
  };

  // Cambio di tab: la collezione riparte dall'alto, non dal punto memorizzato.
  const goToTab = (next) => {
    homeScroll.current = 0;
    setView(next);
  };

  const handleCreatePlant = async (data) => {
    const id = await repo.createPlant(data);
    setShowNewPlant(false);
    notify("Scheda creata");
    openPlant(id);
  };

  const handleApplyIntervento = async (payload) => {
    const n = await repo.applyIntervento(payload);
    if (n === 0) notify("Nessuna pianta coinvolta");
    else notify(`Intervento registrato su ${n} ${n > 1 ? "piante" : "pianta"}`);
  };

  const handleDeletePlant = async (id) => {
    await repo.deletePlant(id);
    setSelectedId(null);
    setView("home");
    notify("Scheda eliminata");
  };

  const handleExport = async (mode) => {
    try {
      const c = await exportBackup(mode);
      notify(
        c.method === "condividi"
          ? `Backup condiviso — ${c.plants} schede, ${c.photos} foto`
          : `Backup salvato sul dispositivo — ${c.plants} schede, ${c.photos} foto`
      );
      refreshStorage();
    } catch (e) {
      if (e instanceof BackupAnnullato) return notify("Backup annullato");
      console.error(e);
      notify("Errore durante l’export");
    }
  };

  const handleCollegaDrive = async () => {
    // Il salvataggio lo facciamo qui: l'effetto automatico non deve partire
    // anche lui appena `driveCollegato` diventa vero.
    driveTentato.current = true;
    try {
      await collegaDrive();
      const c = await backupSuDrive();
      notify(
        c.duplicati
          ? `Drive collegato — attenzione: ci sono ${c.duplicati} copie del backup, tienine una`
          : `Drive collegato — ${c.plants} schede, ${c.photos} foto salvate`
      );
    } catch (e) {
      if (e instanceof DriveNonAutorizzato) return notify(e.message);
      console.error(e);
      notify("Errore nel collegamento a Drive");
    }
  };

  const handleBackupDrive = async () => {
    try {
      const c = await backupSuDrive();
      notify(
        c.duplicati
          ? `Aggiornata — attenzione: su Drive ci sono ${c.duplicati} copie, tienine una`
          : `Copia aggiornata su Drive — ${c.plants} schede, ${c.photos} foto`
      );
    } catch (e) {
      if (e instanceof DriveNonAutorizzato) return notify(e.message);
      console.error(e);
      notify("Errore nel salvataggio su Drive");
    }
  };

  const handleScollegaDrive = async () => {
    await scollegaDrive();
    notify("Google Drive scollegato");
  };

  const handleImport = async (file) => {
    try {
      const c = await importBackup(file);
      notify(`Importate ${c.plants} schede, ${c.photos} foto`);
    } catch (e) {
      console.error(e);
      notify(e.message || "Errore durante l’import");
    }
  };

  return (
    <div style={{ fontFamily: FONT_BODY, color: INK }}>
      {view === "home" && (
        <Home
          plants={plants}
          planned={planned}
          onOpen={openPlant}
          onNew={() => setShowNewPlant(true)}
          statoOptions={statoOptions}
          onGoTo={goToTab}
          backupStale={backupStale}
          dataAtRisk={dataAtRisk}
          driveCollegato={drive.collegato}
          onBackupDrive={handleBackupDrive}
        />
      )}

      {view === "detail" && selected && (
        <PlantDetail
          plant={selected}
          onBack={() => setView("home")}
          onUpdate={repo.updatePlant}
          onDelete={handleDeletePlant}
          statoOptions={statoOptions}
          onNotify={notify}
        />
      )}

      {view === "plan" && (
        <PlanScreen
          planned={planned}
          onAdd={repo.addPlanned}
          onDelete={repo.deletePlanned}
          plants={plants || []}
          tipoOptions={tipoOptions}
          statoOptions={statoOptions}
        />
      )}

      {view === "opzioni" && (
        <OpzioniScreen
          tipoOptions={tipoOptions}
          statoOptions={statoOptions}
          onSaveTipo={repo.saveTipoOptions}
          onSaveStato={repo.saveStatoOptions}
          onExport={handleExport}
          onImport={handleImport}
          plants={plants || []}
          lastBackupAt={lastBackupAt}
          storage={storage}
          hasUnsavedChanges={backupStale === "changes" || backupStale === "never"}
          drive={drive}
          onCollegaDrive={handleCollegaDrive}
          onBackupDrive={handleBackupDrive}
          onScollegaDrive={handleScollegaDrive}
        />
      )}

      {view !== "detail" && (
        <TabBar
          active={activeTab}
          onSelect={goToTab}
          onNewIntervento={() => setShowNewIntervento(true)}
          badges={{ plan: due.due }}
        />
      )}

      {showNewPlant && (
        <NewPlantModal
          onClose={() => setShowNewPlant(false)}
          onCreate={handleCreatePlant}
          tipoOptions={tipoOptions}
          statoOptions={statoOptions}
        />
      )}

      {showNewIntervento && (
        <NewInterventoModal
          onClose={() => setShowNewIntervento(false)}
          onSubmit={handleApplyIntervento}
          plants={plants || []}
          tipoOptions={tipoOptions}
          statoOptions={statoOptions}
        />
      )}

      <Toast message={toast} />
      <UpdatePrompt />
    </div>
  );
}
