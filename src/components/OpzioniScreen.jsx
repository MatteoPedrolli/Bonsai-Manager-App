import { useState, useRef } from "react";
import {
  Plus, Trash2, Download, Upload, ShieldCheck, ShieldAlert, Share2, Cloud,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  INK, PAPER, PAPER_DEEP, SEAL, BARK, MOSS, FONT_DISPLAY, FONT_BODY, PRESET_COLORS,
  APP_VERSION, CHANGELOG, fmtDate,
} from "../lib/constants.js";
import { Seal, TopBar } from "./common.jsx";
import { computeStats } from "../lib/stats.js";
import { formatBytes } from "../lib/storage.js";
import { canShareBackup } from "../lib/backup.js";

export default function OpzioniScreen({
  tipoOptions, statoOptions, onSaveTipo, onSaveStato, onExport, onImport, version,
  plants, lastBackupAt, storage, hasUnsavedChanges,
  drive, onCollegaDrive, onBackupDrive, onScollegaDrive,
}) {
  const stats = computeStats(plants);
  const protetto = storage?.persisted === true;
  const condivisibile = canShareBackup();
  const [newTipo, setNewTipo] = useState("");
  const [newStato, setNewStato] = useState("");
  const [newStatoColor, setNewStatoColor] = useState(PRESET_COLORS[0]);
  const [importConfirm, setImportConfirm] = useState(null); // File in attesa di conferma
  const [mostraTutteLeNovita, setMostraTutteLeNovita] = useState(false);
  const fileRef = useRef(null);

  const addTipo = () => {
    const t = newTipo.trim();
    if (!t || tipoOptions.includes(t)) return;
    onSaveTipo([...tipoOptions, t]);
    setNewTipo("");
  };
  const removeTipo = (t) => onSaveTipo(tipoOptions.filter((x) => x !== t));

  const addStato = () => {
    const l = newStato.trim();
    if (!l || statoOptions.some((s) => s.label === l)) return;
    onSaveStato([...statoOptions, { label: l, color: newStatoColor }]);
    setNewStato("");
  };
  const removeStato = (label) => onSaveStato(statoOptions.filter((s) => s.label !== label));

  const inputStyle = { border: `1px solid ${BARK}88`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13, background: "white" };
  const sectionTitle = { fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, marginBottom: 8 };

  return (
    <div style={{ background: PAPER, minHeight: "100dvh" }}>
      <TopBar title="Opzioni" />
      <div className="px-4 pt-4 pb-28">

        {/* --- Statistiche --- */}
        <div style={sectionTitle}>Statistiche</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            [stats.totale, "Piante"],
            [stats.interventiTotali, "Interventi"],
            [stats.interventiAnno, "Quest'anno"],
          ].map(([n, label]) => (
            <div key={label} className="p-2 text-center" style={{ background: PAPER_DEEP, borderRadius: 4 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: INK }}>{n}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: BARK }}>{label}</div>
            </div>
          ))}
        </div>
        {(stats.byTipo.length > 0 || stats.byStato.length > 0) && (
          <div className="p-3 mb-2" style={{ background: PAPER_DEEP, borderRadius: 4 }}>
            {stats.byTipo.length > 0 && (
              <div className="mb-2">
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: BARK, marginBottom: 4 }}>Per tipo</div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.byTipo.map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5" style={{ background: PAPER, borderRadius: 10, fontFamily: FONT_BODY, fontSize: 11, color: INK }}>
                      {k} · <b>{v}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stats.byStato.length > 0 && (
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: BARK, marginBottom: 4 }}>Per stato</div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.byStato.map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 flex items-center gap-1" style={{ background: PAPER, borderRadius: 10, fontFamily: FONT_BODY, fontSize: 11, color: INK }}>
                      <Seal label={k} color={(statoOptions.find((s) => s.label === k) || {}).color || BARK} /> {k} · <b>{v}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mb-6" style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>
          Ultima attività: {stats.ultimaAttivita ? fmtDate(stats.ultimaAttivita) : "—"}
        </div>

        {/* --- Stato di protezione dei dati --- */}
        <div style={sectionTitle}>Sicurezza dei dati</div>
        <div
          className="flex items-start gap-3 p-3 mb-3"
          style={{
            background: protetto ? `${MOSS}14` : `${SEAL}12`,
            border: `1px solid ${protetto ? MOSS : SEAL}`,
            borderRadius: 6,
          }}
        >
          {protetto
            ? <ShieldCheck size={20} color={MOSS} style={{ flexShrink: 0, marginTop: 1 }} />
            : <ShieldAlert size={20} color={SEAL} style={{ flexShrink: 0, marginTop: 1 }} />}
          <div className="min-w-0">
            <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: INK, fontWeight: 600 }}>
              {protetto ? "Dati protetti su questo dispositivo" : "Dati non protetti"}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: BARK, marginTop: 2 }}>
              {protetto
                ? "Il browser non cancellerà la collezione per liberare spazio. Resta comunque legata a questo dispositivo: se lo perdi o lo cambi, servono i backup."
                : storage?.supported === false
                ? "Questo browser non permette di bloccare la cancellazione automatica. Fai backup frequenti e conservali fuori dal dispositivo."
                : "Il browser può cancellare la collezione quando ha bisogno di spazio. Installa l’app sulla schermata home (menu del browser → “Installa app” / “Aggiungi a Home”) e riapri: il permesso viene concesso da solo."}
            </div>
            {storage?.usage > 0 && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK, marginTop: 4 }}>
                Spazio occupato: {formatBytes(storage.usage)}
                {storage.quota ? ` di ${formatBytes(storage.quota)} disponibili` : ""}
              </div>
            )}
          </div>
        </div>

        {/* --- Backup --- */}
        <div style={sectionTitle}>Backup dati</div>
        <div className="mb-2" style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: BARK }}>
          Salva o ripristina l’intera collezione (schede, foto, storico) in un unico file.
          Conservalo <b>fuori dal telefono</b> (Drive, mail, computer): è l’unica copia che
          sopravvive alla perdita del dispositivo.
        </div>
        {/* Due protezioni diverse, quindi due pulsanti distinti: il file sul
            dispositivo sopravvive alla cancellazione dei dati del sito, la
            copia condivisa sopravvive alla perdita del dispositivo. */}
        <div className="flex gap-2 mb-2">
          <button onClick={() => onExport("telefono")} className="flex-1 py-2.5 flex flex-col items-center justify-center gap-0.5" style={{ background: INK, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5 }}>
            <span className="flex items-center gap-2"><Download size={15} /> Salva sul dispositivo</span>
            <span style={{ fontSize: 9.5, opacity: 0.7 }}>resta qui, nei file scaricati</span>
          </button>
          {condivisibile && (
            <button onClick={() => onExport("condividi")} className="flex-1 py-2.5 flex flex-col items-center justify-center gap-0.5" style={{ background: MOSS, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5 }}>
              <span className="flex items-center gap-2"><Share2 size={15} /> Condividi</span>
              <span style={{ fontSize: 9.5, opacity: 0.75 }}>Drive, mail, chat</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => fileRef.current?.click()} className="flex-1 py-2 flex items-center justify-center gap-2" style={{ border: `1px solid ${INK}`, color: INK, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5, background: "transparent" }}>
            <Upload size={15} /> Importa backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportConfirm(f); e.target.value = ""; }}
          />
        </div>

        {/* --- Copia automatica su Google Drive (facoltativa) --- */}
        {drive?.configurato && (
          <div className="p-3 mb-3" style={{ background: PAPER_DEEP, borderRadius: 6 }}>
            <div className="flex items-center gap-2 mb-1">
              <Cloud size={16} color={drive.collegato ? MOSS : BARK} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: INK, fontWeight: 600 }}>
                Copia automatica su Google Drive
              </span>
            </div>

            {drive.collegato ? (
              <>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: BARK, marginBottom: 10 }}>
                  {drive.ultimo
                    ? `Ultima copia su Drive: ${fmtDate(drive.ultimo)}. Google non consente alle app nel browser di conservare il permesso, quindi l’app non lo richiede da sola ad ogni avvio: quando c’è qualcosa di nuovo trovi “Salva su Drive” in Collezione, e basta un tocco.`
                    : "Collegato. La prima copia parte al prossimo salvataggio."}
                </div>
                <div className="flex gap-2">
                  <button onClick={onBackupDrive} className="flex-1 py-2 flex items-center justify-center gap-2" style={{ background: MOSS, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12 }}>
                    <Cloud size={14} /> Salva ora su Drive
                  </button>
                  <button onClick={onScollegaDrive} className="py-2 px-3" style={{ border: `1px solid ${BARK}`, color: INK, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12, background: "transparent" }}>
                    Scollega
                  </button>
                </div>
                {/* Onestà: "Scollega" ferma l'app su questo dispositivo, ma il
                    permesso registrato su Google si toglie solo da lì. */}
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: BARK, marginTop: 8, lineHeight: 1.5 }}>
                  “Scollega” ferma l’app su questo dispositivo. Per togliere del tutto
                  il permesso a Google, vai su{" "}
                  <a
                    href="https://myaccount.google.com/connections"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: MOSS, textUnderlineOffset: 2 }}
                  >
                    Account Google → App collegate
                  </a>
                  . Il file di backup resta comunque nel tuo Drive: è tuo.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: BARK, marginBottom: 10 }}>
                  Collega il tuo Drive: la copia di sicurezza finisce lì con un tocco,
                  quando l’app ti avvisa che c’è qualcosa di nuovo da salvare. Niente
                  file da gestire. L’app può vedere <b>solo il file che crea lei</b>: il
                  resto del tuo Drive le resta invisibile.
                </div>
                <button onClick={onCollegaDrive} className="w-full py-2.5 flex items-center justify-center gap-2" style={{ background: INK, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5 }}>
                  <Cloud size={15} /> Collega Google Drive
                </button>
              </>
            )}
          </div>
        )}

        {importConfirm && (
          <div className="p-3 mb-6" style={{ border: `1px solid ${SEAL}`, borderRadius: 4, background: `${SEAL}12` }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: INK, marginBottom: 8 }}>
              Importare “{importConfirm.name}”? <b>Sostituirà tutti i dati attuali</b> su questo dispositivo.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setImportConfirm(null)} className="flex-1 py-2" style={{ border: `1px solid ${BARK}`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12, color: INK, background: "transparent" }}>
                Annulla
              </button>
              <button
                onClick={() => { const f = importConfirm; setImportConfirm(null); onImport(f); }}
                className="flex-1 py-2"
                style={{ background: SEAL, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12, color: PAPER }}
              >
                Sostituisci e importa
              </button>
            </div>
          </div>
        )}

        <div className="mb-6" style={{ fontFamily: FONT_BODY, fontSize: 11, color: hasUnsavedChanges ? SEAL : BARK }}>
          {!lastBackupAt
            ? "Nessun backup ancora effettuato."
            : hasUnsavedChanges
            ? `Ultimo backup: ${fmtDate(lastBackupAt)} — ci sono modifiche più recenti non ancora salvate.`
            : `Ultimo backup: ${fmtDate(lastBackupAt)} — aggiornato.`}
        </div>

        {/* --- Tag Tipo --- */}
        <div style={sectionTitle}>Tag “Tipo pianta”</div>
        <div className="mb-2">
          {tipoOptions.map((t) => (
            <div key={t} className="flex items-center justify-between p-2 mb-1.5" style={{ background: PAPER_DEEP, borderRadius: 4 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: INK }}>{t}</span>
              <button onClick={() => removeTipo(t)} aria-label="Elimina"><Trash2 size={15} color={BARK} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          <input value={newTipo} onChange={(e) => setNewTipo(e.target.value)} placeholder="Nuovo tag tipo…" className="flex-1 p-2" style={inputStyle} />
          <button onClick={addTipo} className="px-3" style={{ background: INK, color: PAPER, borderRadius: 4 }}><Plus size={16} /></button>
        </div>

        {/* --- Tag Stato --- */}
        <div style={sectionTitle}>Tag “Stato”</div>
        <div className="mb-2">
          {statoOptions.map((s) => (
            <div key={s.label} className="flex items-center justify-between p-2 mb-1.5" style={{ background: PAPER_DEEP, borderRadius: 4 }}>
              <span className="flex items-center gap-1" style={{ fontFamily: FONT_BODY, fontSize: 13, color: INK }}>
                <Seal label={s.label} color={s.color} /> {s.label}
              </span>
              <button onClick={() => removeStato(s.label)} aria-label="Elimina"><Trash2 size={15} color={BARK} /></button>
            </div>
          ))}
        </div>
        <div className="mb-2">
          <input value={newStato} onChange={(e) => setNewStato(e.target.value)} placeholder="Nuovo tag stato…" className="w-full p-2 mb-2" style={inputStyle} />
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>Colore:</span>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewStatoColor(c)}
                aria-label={`Colore ${c}`}
                style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: newStatoColor === c ? `2px solid ${INK}` : `1px solid ${BARK}55` }}
              />
            ))}
          </div>
          <button onClick={addStato} className="w-full py-2 flex items-center justify-center gap-2" style={{ background: INK, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13 }}>
            <Plus size={15} /> Aggiungi tag stato
          </button>
        </div>

        {/* --- Changelog (spec §8) --- */}
        <div className="mt-8" style={sectionTitle}>Novità</div>
        {/* In vista solo l'ultima versione: l'elenco completo cresce ad ogni
            rilascio e sommergeva il resto delle Opzioni. Le precedenti restano
            consultabili, ma su richiesta. */}
        <div className="mb-4">
          {(mostraTutteLeNovita ? CHANGELOG : CHANGELOG.slice(0, 1)).map((rel) => (
            <div key={rel.version} className="mb-3">
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: INK }}>v{rel.version}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: BARK }}>{fmtDate(rel.date)}</span>
              </div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                {rel.items.map((it, i) => (
                  <li key={i} style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: INK, opacity: 0.85, marginBottom: 2 }}>{it}</li>
                ))}
              </ul>
            </div>
          ))}

          {CHANGELOG.length > 1 && (
            <button
              onClick={() => setMostraTutteLeNovita((v) => !v)}
              className="flex items-center gap-1.5 py-1"
              style={{ background: "transparent", border: "none", fontFamily: FONT_BODY, fontSize: 11.5, color: BARK }}
            >
              {mostraTutteLeNovita ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {mostraTutteLeNovita
                ? "Nascondi le versioni precedenti"
                : `Mostra le versioni precedenti (${CHANGELOG.length - 1})`}
            </button>
          )}
        </div>

        <div className="mt-6 text-center" style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>
          STAB Bonsai · v{version || APP_VERSION}
        </div>
      </div>
    </div>
  );
}
