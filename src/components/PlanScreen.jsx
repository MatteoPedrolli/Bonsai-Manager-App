import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import {
  INK, PAPER, PAPER_DEEP, SEAL, BARK, MOSS, FONT_DISPLAY, FONT_BODY,
  INTERVENTIONS, fmtDate,
} from "../lib/constants.js";
import { TopBar } from "./common.jsx";
import { PianificaModal, NewInterventoModal } from "./InterventoForm.jsx";
import { useBackClose } from "../lib/useBackClose.js";
import { classifyPlanned, reminderLabel } from "../lib/reminders.js";
import { targetDaPianificazione } from "../lib/repo.js";

const STATUS_COLOR = { overdue: SEAL, soon: "#B8862F", future: BARK };

export default function PlanScreen({ planned, onAdd, onDelete, onApplyIntervento, plants, tipoOptions, statoOptions }) {
  const [showModal, setShowModal] = useState(false);
  useBackClose(showModal, () => setShowModal(false));

  // Pianificazione che si sta segnando come eseguita. Si passa dal pannello
  // dell'intervento invece di registrarlo di nascosto: la pianificazione non
  // contiene il dettaglio (che concime, quale substrato) e la data vera può
  // non essere quella prevista. Un tocco in più, uno storico che vale.
  const [completa, setCompleta] = useState(null);
  useBackClose(completa !== null, () => setCompleta(null));

  const bersaglio = completa ? targetDaPianificazione(completa, plants) : null;
  const piantaCompleta =
    bersaglio?.target === "scheda"
      ? (plants || []).find((p) => String(p.id) === String(bersaglio.riferimento))
      : null;
  const tipoKeyCompleta = completa
    ? (INTERVENTIONS.find((i) => i.label === completa.tipo) || INTERVENTIONS[INTERVENTIONS.length - 1]).key
    : null;

  const sorted = [...(planned || [])].sort((a, b) => new Date(a.data) - new Date(b.data));

  return (
    <div style={{ background: PAPER, minHeight: "100dvh" }}>
      <TopBar title="Pianificazione" />

      <div className="px-4 pt-3 pb-2">
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-2.5 flex items-center justify-center gap-2"
          style={{ background: INK, color: PAPER, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 13 }}
        >
          <Plus size={15} /> Pianifica intervento
        </button>
      </div>

      <div className="px-4 pb-28">
        {sorted.length === 0 && (
          <div style={{ fontFamily: FONT_BODY, color: BARK, fontSize: 13, padding: 20, textAlign: "center" }}>
            Nessun intervento pianificato.
          </div>
        )}
        {sorted.map((item) => {
          const def = INTERVENTIONS.find((i) => i.label === item.tipo) || INTERVENTIONS[INTERVENTIONS.length - 1];
          const Icon = def.icon;
          const status = classifyPlanned(item);
          const accent = STATUS_COLOR[status];
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 mb-2"
              style={{
                background: PAPER_DEEP,
                border: `1px solid ${status === "future" ? BARK + "40" : accent}`,
                borderLeft: `4px solid ${accent}`,
                borderRadius: 4,
              }}
            >
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, borderRadius: "50%", background: PAPER, color: INK }}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14.5, color: INK }}>{item.tipo}</div>
                <div className="truncate" style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: BARK }}>{item.targetLabel}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: INK }}>{fmtDate(item.data)}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: accent, fontWeight: status === "future" ? 400 : 600 }}>
                  {reminderLabel(item)}
                </div>
              </div>
              <button
                onClick={() => setCompleta(item)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5"
                style={{ background: MOSS, color: PAPER, border: "none", borderRadius: 4, fontFamily: FONT_BODY, fontSize: 11.5 }}
                aria-label="Segna come eseguito"
              >
                <Check size={13} /> Fatto
              </button>
              <button onClick={() => onDelete(item.id)} className="flex-shrink-0 p-1" aria-label="Elimina">
                <Trash2 size={15} color={BARK} />
              </button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <PianificaModal
          onClose={() => setShowModal(false)}
          onSave={onAdd}
          plants={plants} tipoOptions={tipoOptions} statoOptions={statoOptions}
        />
      )}

      {completa && (
        <NewInterventoModal
          onClose={() => setCompleta(null)}
          onSubmit={async (payload) => {
            // Prima si registra l'intervento, poi si toglie dalla
            // pianificazione: se la registrazione fallisse, la pianificazione
            // resterebbe lì invece di sparire senza aver prodotto nulla.
            await onApplyIntervento(payload);
            await onDelete(completa.id);
          }}
          plants={plants}
          pianta={piantaCompleta || undefined}
          targetIniziale={bersaglio}
          tipoIniziale={tipoKeyCompleta}
          tipoOptions={tipoOptions}
          statoOptions={statoOptions}
        />
      )}
    </div>
  );
}
