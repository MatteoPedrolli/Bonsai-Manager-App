import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ImageIcon, ChevronRight, CalendarClock, Download, ShieldAlert } from "lucide-react";
import { db } from "../lib/db.js";
import {
  INK, PAPER, PAPER_DEEP, SEAL, BARK, FONT_DISPLAY, FONT_BODY, colorForStato,
} from "../lib/constants.js";
import { Seal, TopBar, Banner } from "./common.jsx";
import { dueSummary } from "../lib/reminders.js";
import { sortPhotos } from "../lib/photos.js";

// Miniatura di copertina: foto più recente della pianta (per data di scatto).
function CoverThumb({ plantId }) {
  const first = useLiveQuery(
    () => db.photos.where("plantId").equals(plantId).toArray().then((a) => sortPhotos(a).at(-1)),
    [plantId]
  );
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!first?.blob) return setUrl(null);
    const u = URL.createObjectURL(first.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [first]);

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: 64, height: 64, background: "#CFC9B8", borderRadius: 3, color: BARK }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <ImageIcon size={22} />
      )}
    </div>
  );
}

function PlantCard({ plant, onOpen, statoOptions }) {
  const statoTags = plant.tags?.stato || [];
  return (
    <button
      onClick={() => onOpen(plant.id)}
      className="text-left w-full p-3 mb-3"
      style={{ background: PAPER_DEEP, border: `1px solid ${BARK}55`, borderRadius: 4 }}
    >
      <div className="flex gap-3">
        <CoverThumb plantId={plant.id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="truncate" style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: INK }}>{plant.nome}</span>
            <ChevronRight size={16} color={BARK} />
          </div>
          <div className="truncate" style={{ fontFamily: FONT_BODY, fontSize: 12, color: BARK, fontStyle: "italic" }}>{plant.specie}</div>
          <div className="mt-1 flex items-center flex-wrap">
            {statoTags.map((s) => <Seal key={s} label={s} color={colorForStato(statoOptions, s)} />)}
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>{statoTags.join(" · ")}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function FilterChips({ active, onSelect, statoOptions }) {
  const chips = ["Tutte", ...statoOptions.map((s) => s.label)];
  return (
    <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
      {chips.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="px-3 py-1 flex-shrink-0"
          style={{
            fontFamily: FONT_BODY, fontSize: 12, borderRadius: 20,
            border: `1px solid ${active === c ? SEAL : BARK}`,
            background: active === c ? SEAL : "transparent",
            color: active === c ? PAPER : INK,
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export default function Home({ plants, planned, onOpen, onNew, statoOptions, onGoTo, backupStale, dataAtRisk }) {
  const [filter, setFilter] = useState("Tutte");
  const visible =
    filter === "Tutte" ? plants : (plants || []).filter((p) => (p.tags?.stato || []).includes(filter));

  const due = dueSummary(planned);
  const dueMsg = due.overdue > 0
    ? `${due.overdue} intervento${due.overdue > 1 ? "i" : ""} in ritardo${due.soon > 0 ? `, ${due.soon} in scadenza` : ""}`
    : `${due.soon} intervento${due.soon > 1 ? "i" : ""} in scadenza`;

  return (
    <div style={{ background: PAPER, minHeight: "100dvh" }}>
      <TopBar title="Bonsai Manager" />

      <div className="px-4 pt-3">
        {due.due > 0 && (
          <Banner
            tone={due.overdue > 0 ? "warn" : "info"}
            icon={CalendarClock}
            actionLabel="Vedi ›"
            onClick={() => onGoTo?.("plan")}
          >
            {dueMsg}
          </Banner>
        )}
        {dataAtRisk && (
          <Banner tone="warn" icon={ShieldAlert} actionLabel="Vedi ›" onClick={() => onGoTo?.("opzioni")}>
            Il browser può cancellare i tuoi dati per liberare spazio. Salva un backup.
          </Banner>
        )}
        {backupStale && (
          <Banner tone="info" icon={Download} actionLabel="Backup ›" onClick={() => onGoTo?.("opzioni")}>
            {backupStale === "never"
              ? "Non hai mai fatto un backup dei tuoi dati."
              : backupStale === "changes"
              ? "Hai modifiche non ancora salvate in un backup."
              : "Sono passati più di 15 giorni dall'ultimo backup."}
          </Banner>
        )}
      </div>

      <div className="px-4 pb-3">
        <button
          onClick={onNew}
          className="w-full py-2.5 flex items-center justify-center gap-2"
          style={{ background: INK, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5, color: PAPER }}
        >
          <Plus size={15} /> Nuova scheda
        </button>
      </div>

      <div className="px-4" style={{ paddingBottom: 130 }}>
        {plants === undefined ? (
          <div style={{ fontFamily: FONT_BODY, color: BARK, fontSize: 13, padding: 20, textAlign: "center" }}>
            Carico…
          </div>
        ) : (
          <>
            {visible.map((p) => (
              <PlantCard key={p.id} plant={p} onOpen={onOpen} statoOptions={statoOptions} />
            ))}
            {visible.length === 0 && (
              <div style={{ fontFamily: FONT_BODY, color: BARK, fontSize: 13, padding: 20, textAlign: "center" }}>
                {plants.length === 0 ? "Nessuna pianta. Tocca “+ Nuova scheda”." : "Nessuna pianta con questo stato."}
              </div>
            )}
          </>
        )}
      </div>

      {/* Selettore filtro per stato: barra fissa in fondo, sopra la tab bar */}
      <div
        className="fixed left-1/2 w-full z-20 pt-2"
        style={{
          maxWidth: 480,
          transform: "translateX(-50%)",
          bottom: "calc(60px + env(safe-area-inset-bottom))",
          background: PAPER,
          borderTop: `1px solid ${BARK}44`,
          boxShadow: "0 -6px 14px rgba(28,27,25,.06)",
        }}
      >
        <FilterChips active={filter} onSelect={setFilter} statoOptions={statoOptions} />
      </div>
    </div>
  );
}
