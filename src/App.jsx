import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./lib/db.js";
import {
  DEFAULT_TIPO_OPTIONS, DEFAULT_STATO_OPTIONS, FONT_BODY, INK,
} from "./lib/constants.js";
import * as repo from "./lib/repo.js";
import { exportBackup, importBackup } from "./lib/backup.js";
import { dueSummary } from "./lib/reminders.js";
import { TabBar, Toast } from "./components/common.jsx";
import Home from "./components/Home.jsx";
import PlantDetail from "./components/PlantDetail.jsx";
import NewPlantModal from "./components/NewPlantModal.jsx";
import { NewInterventoModal } from "./components/InterventoForm.jsx";
import PlanScreen from "./components/PlanScreen.jsx";
import OpzioniScreen from "./components/OpzioniScreen.jsx";
import UpdatePrompt from "./components/UpdatePrompt.jsx";

const MONTH_MS = 30 * 86400000;

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
  const backupStale = !hasData
    ? false
    : !lastBackupAt
    ? "never"
    : Date.now() - new Date(lastBackupAt).getTime() > MONTH_MS
    ? "stale"
    : false;

  const notify = useCallback((msg) => setToast(msg), []);
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

  // --- Handlers ---
  const openPlant = (id) => { setSelectedId(id); setView("detail"); };

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

  const handleExport = async () => {
    try {
      const c = await exportBackup();
      notify(`Backup esportato — ${c.plants} schede, ${c.photos} foto`);
    } catch (e) {
      console.error(e);
      notify("Errore durante l’export");
    }
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
          onNewIntervento={() => setShowNewIntervento(true)}
          statoOptions={statoOptions}
          onGoTo={setView}
          backupStale={backupStale}
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
        />
      )}

      {view !== "detail" && (
        <TabBar active={activeTab} onSelect={setView} badges={{ plan: due.due }} />
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
