import { useState } from "react";
import { X, Check } from "lucide-react";
import {
  INK, PAPER, SEAL, BARK, FONT_DISPLAY, FONT_BODY, todayISO,
} from "../lib/constants.js";
import { Seal } from "./common.jsx";

export default function NewPlantModal({ onClose, onCreate, tipoOptions, statoOptions }) {
  const [nome, setNome] = useState("");
  const [specie, setSpecie] = useState("");
  const [provenienza, setProvenienza] = useState("");
  const [dataIngresso, setDataIngresso] = useState(todayISO());
  const [tipo, setTipo] = useState(null);
  const [stato, setStato] = useState([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const toggleStato = (tag) =>
    setStato((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const handleCreate = () => {
    if (!nome.trim()) return setError("Il nome è obbligatorio.");
    onCreate({ nome, specie, provenienza, dataIngresso, tipo, stato, note });
  };

  const inputStyle = { border: `1px solid ${BARK}88`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13, background: "white" };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "#00000055" }} onClick={onClose}>
      <div
        className="w-full p-5"
        style={{ maxWidth: 480, background: PAPER, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: INK }}>Nuova scheda</span>
          <button onClick={onClose} aria-label="Chiudi"><X size={20} color={INK} /></button>
        </div>

        {[
          ["Nome pianta", nome, setNome, "text"],
          ["Specie", specie, setSpecie, "text"],
          ["Provenienza", provenienza, setProvenienza, "text"],
          ["Data ingresso", dataIngresso, setDataIngresso, "date"],
        ].map(([label, value, setter, type]) => (
          <div key={label} className="mb-3">
            <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>{label}</label>
            <input
              type={type}
              value={value}
              onChange={(e) => { setter(e.target.value); if (error) setError(""); }}
              className="w-full p-2 mt-1"
              style={inputStyle}
            />
          </div>
        ))}

        <div className="mb-3">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>Tipo pianta</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {tipoOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTipo(tipo === t ? null : t)}
                className="px-2.5 py-1"
                style={{
                  fontFamily: FONT_BODY, fontSize: 11.5, borderRadius: 12,
                  border: `1px solid ${tipo === t ? SEAL : BARK}`,
                  background: tipo === t ? SEAL : "transparent",
                  color: tipo === t ? PAPER : INK,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>Stato (opzionale, più di uno)</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {statoOptions.map((s) => (
              <button
                key={s.label}
                onClick={() => toggleStato(s.label)}
                className="px-2.5 py-1 flex items-center gap-1"
                style={{
                  fontFamily: FONT_BODY, fontSize: 11.5, borderRadius: 12,
                  border: `1px solid ${stato.includes(s.label) ? s.color : BARK}`,
                  background: stato.includes(s.label) ? `${s.color}22` : "transparent",
                  color: INK,
                }}
              >
                <Seal label={s.label} color={s.color} /> {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>Note (facoltativo)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full p-2 mt-1"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && <div className="mb-2" style={{ fontFamily: FONT_BODY, fontSize: 12, color: SEAL }}>{error}</div>}

        <button
          onClick={handleCreate}
          className="w-full py-3 mt-2 flex items-center justify-center gap-2"
          style={{ background: INK, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13 }}
        >
          <Check size={16} /> Crea scheda
        </button>
      </div>
    </div>
  );
}
