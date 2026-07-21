import { useState } from "react";
import { X, Check } from "lucide-react";
import {
  INK, PAPER, PAPER_DEEP, SEAL, BARK, MOSS, FONT_DISPLAY, FONT_BODY,
  INTERVENTIONS, todayISO,
} from "../lib/constants.js";
import { countMatches } from "../lib/repo.js";

// Selettore target (scheda/tag/tutte) + tipo con campo di dettaglio.
// Condiviso tra "Nuovo intervento" (subito) e "Pianifica intervento" (data futura).
function InterventoForm({ plants, tipoOptions, statoOptions, includeDate, onSubmit, submitLabel }) {
  const [target, setTarget] = useState("scheda");
  const [riferimento, setRiferimento] = useState("");
  const [tipoKey, setTipoKey] = useState(INTERVENTIONS[0].key);
  const [detail, setDetail] = useState("");
  const [data, setData] = useState(includeDate ? "" : todayISO());
  const [error, setError] = useState("");

  const tipoDef = INTERVENTIONS.find((i) => i.key === tipoKey);

  // Anteprima interventi di gruppo (spec §6): quante piante verranno coinvolte.
  const showCount = target === "tutte" || (target === "tag" && riferimento);
  const affected = showCount ? countMatches(plants, target, riferimento) : 0;

  const handleSubmit = () => {
    if (target === "scheda" && !riferimento) return setError("Seleziona una pianta.");
    if (target === "tag" && !riferimento) return setError("Seleziona un tag.");
    if (includeDate && !data) return setError("Indica la data prevista.");
    setError("");
    onSubmit({ target, riferimento, tipoDef, detail, data: data || todayISO() });
  };

  const inputStyle = { border: `1px solid ${BARK}88`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13, background: "white" };

  return (
    <>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK, marginBottom: 6 }}>Applica a</div>
      <div className="flex gap-2 mb-3">
        {[["scheda", "Scheda singola"], ["tag", "Un tag"], ["tutte", "Tutte le piante"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTarget(key); setRiferimento(""); setError(""); }}
            className="flex-1 py-2"
            style={{
              fontFamily: FONT_BODY, fontSize: 11.5, borderRadius: 4,
              border: `1px solid ${target === key ? SEAL : BARK}`,
              background: target === key ? SEAL : "transparent",
              color: target === key ? PAPER : INK,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {target === "scheda" && (
        <div className="mb-4">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>Pianta</label>
          <select value={riferimento} onChange={(e) => setRiferimento(e.target.value)} className="w-full p-2 mt-1" style={inputStyle}>
            <option value="">Seleziona una pianta…</option>
            {plants.map((p) => <option key={p.id} value={String(p.id)}>{p.nome} — {p.specie}</option>)}
          </select>
        </div>
      )}

      {target === "tag" && (
        <div className="mb-4">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>Tag</label>
          <select value={riferimento} onChange={(e) => setRiferimento(e.target.value)} className="w-full p-2 mt-1" style={inputStyle}>
            <option value="">Seleziona un tag…</option>
            <optgroup label="Tipo pianta">
              {tipoOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </optgroup>
            <optgroup label="Stato">
              {statoOptions.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
            </optgroup>
          </select>
        </div>
      )}

      {showCount && (
        <div
          className="mb-4 px-3 py-2"
          style={{ background: affected > 0 ? `${MOSS}18` : `${SEAL}12`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 11.5, color: INK }}
        >
          {affected > 0 ? (
            <>Verrà registrato su <b>{affected}</b> {affected > 1 ? "piante" : "pianta"}, come voce separata nello storico di ciascuna.</>
          ) : (
            <>Nessuna pianta corrisponde a questo target.</>
          )}
        </div>
      )}

      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK, marginBottom: 6 }}>Tipo di intervento</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {INTERVENTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTipoKey(key); setDetail(""); }}
            className="flex flex-col items-center justify-center gap-1 p-3"
            style={{
              border: `1px solid ${tipoKey === key ? SEAL : BARK}55`, borderRadius: 4,
              background: tipoKey === key ? `${SEAL}18` : PAPER_DEEP,
            }}
          >
            <Icon size={20} color={INK} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: INK, textAlign: "center" }}>{label}</span>
          </button>
        ))}
      </div>

      {tipoDef.autoTag && (
        <div className="mb-3 px-3 py-2" style={{ background: `${SEAL}15`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 11, color: INK }}>
          {tipoDef.autoTag.add && <>Verrà applicato automaticamente il tag “{tipoDef.autoTag.add}”.</>}
          {tipoDef.autoTag.remove && <>Verrà rimosso automaticamente il tag “{tipoDef.autoTag.remove}”.</>}
        </div>
      )}

      {tipoDef.detailType === "text" && (
        <div className="mb-4">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>{tipoDef.detailLabel}</label>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} className="w-full p-2 mt-1" style={inputStyle} />
        </div>
      )}

      {tipoDef.detailType === "select" && (
        <div className="mb-4">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>{tipoDef.detailLabel}</label>
          <div className="flex gap-2 mt-1">
            {tipoDef.detailOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setDetail(opt)}
                className="flex-1 py-2"
                style={{
                  fontFamily: FONT_BODY, fontSize: 12, borderRadius: 4,
                  border: `1px solid ${detail === opt ? SEAL : BARK}`,
                  background: detail === opt ? SEAL : "transparent",
                  color: detail === opt ? PAPER : INK,
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {includeDate && (
        <div className="mb-4">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>Data prevista</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full p-2 mt-1" style={inputStyle} />
        </div>
      )}

      {error && (
        <div className="mb-3" style={{ fontFamily: FONT_BODY, fontSize: 12, color: SEAL }}>{error}</div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full py-3 flex items-center justify-center gap-2"
        style={{ background: INK, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13 }}
      >
        <Check size={16} /> {submitLabel}
      </button>
    </>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "#00000055" }} onClick={onClose}>
      <div
        className="w-full p-5"
        style={{ maxWidth: 480, background: PAPER, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: INK }}>{title}</span>
          <button onClick={onClose} aria-label="Chiudi"><X size={20} color={INK} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function NewInterventoModal({ onClose, onSubmit, plants, tipoOptions, statoOptions }) {
  return (
    <Sheet title="Nuovo intervento" onClose={onClose}>
      <InterventoForm
        plants={plants} tipoOptions={tipoOptions} statoOptions={statoOptions}
        includeDate={false} submitLabel="Registra intervento"
        onSubmit={(payload) => { onSubmit(payload); onClose(); }}
      />
    </Sheet>
  );
}

export function PianificaModal({ onClose, onSave, plants, tipoOptions, statoOptions }) {
  return (
    <Sheet title="Pianifica intervento" onClose={onClose}>
      <InterventoForm
        plants={plants} tipoOptions={tipoOptions} statoOptions={statoOptions}
        includeDate={true} submitLabel="Salva pianificazione"
        onSubmit={({ target, riferimento, tipoDef, data }) => {
          let targetLabel = "Tutte le piante";
          if (target === "scheda") {
            const p = plants.find((x) => String(x.id) === String(riferimento));
            targetLabel = p ? p.nome : "Da specificare";
          }
          if (target === "tag") targetLabel = riferimento ? `Tag: ${riferimento}` : "Da specificare";
          onSave({ targetLabel, targetType: target, tipo: tipoDef.label, data });
          onClose();
        }}
      />
    </Sheet>
  );
}
