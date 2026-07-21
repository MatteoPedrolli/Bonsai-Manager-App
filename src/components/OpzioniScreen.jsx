import { useState, useRef } from "react";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import {
  INK, PAPER, PAPER_DEEP, SEAL, BARK, FONT_DISPLAY, FONT_BODY, PRESET_COLORS,
  APP_VERSION, CHANGELOG, fmtDate,
} from "../lib/constants.js";
import { Seal, TopBar } from "./common.jsx";
import { computeStats } from "../lib/stats.js";

export default function OpzioniScreen({
  tipoOptions, statoOptions, onSaveTipo, onSaveStato, onExport, onImport, version,
  plants, lastBackupAt,
}) {
  const stats = computeStats(plants);
  const [newTipo, setNewTipo] = useState("");
  const [newStato, setNewStato] = useState("");
  const [newStatoColor, setNewStatoColor] = useState(PRESET_COLORS[0]);
  const [importConfirm, setImportConfirm] = useState(null); // File in attesa di conferma
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

        {/* --- Backup --- */}
        <div style={sectionTitle}>Backup dati</div>
        <div className="mb-2" style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: BARK }}>
          Salva o ripristina l’intera collezione (schede, foto, storico) in un unico file.
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={onExport} className="flex-1 py-2.5 flex items-center justify-center gap-2" style={{ background: INK, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5 }}>
            <Download size={15} /> Esporta backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 flex items-center justify-center gap-2" style={{ border: `1px solid ${INK}`, color: INK, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5, background: "transparent" }}>
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

        <div className="mb-6" style={{ fontFamily: FONT_BODY, fontSize: 11, color: lastBackupAt ? BARK : SEAL }}>
          {lastBackupAt ? `Ultimo backup: ${fmtDate(lastBackupAt)}` : "Nessun backup ancora effettuato."}
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
        <div className="mb-4">
          {CHANGELOG.map((rel) => (
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
        </div>

        <div className="mt-6 text-center" style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>
          STAB Bonsai · v{version || APP_VERSION}
        </div>
      </div>
    </div>
  );
}
