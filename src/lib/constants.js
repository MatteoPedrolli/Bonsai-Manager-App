import {
  Leaf, Droplets, Wand2, Package, Scissors, MoreHorizontal, Unlink,
} from "lucide-react";

// --- Palette (spec §3) ---
export const INK = "#1C1B19";
export const PAPER = "#E6E2D6";
export const PAPER_DEEP = "#DAD5C6";
export const SEAL = "#B23A2F";
export const MOSS = "#4A5D45";
export const BARK = "#8C7B65";

// --- Tipografia ---
export const FONT_DISPLAY = "'Shippori Mincho', serif";
export const FONT_BODY = "'IBM Plex Sans', sans-serif";

// Versione app, mostrata in Opzioni (spec §8).
export const APP_VERSION = "0.4.0";

// Changelog visibile in app (spec §8). Più recente in cima.
export const CHANGELOG = [
  {
    version: "0.4.0",
    date: "2026-07-21",
    items: [
      "Nuova icona dell'app",
      "“Nuovo intervento” spostato nella barra in basso",
      "Filtro per stato spostato in fondo alla Collezione",
      "Eliminazione foto direttamente dalla miniatura",
      "Didascalie sulle foto",
      "Supporto alle foto in formato HEIC (iPhone)",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-07-21",
    items: [
      "Promemoria interventi in scadenza (banner e badge)",
      "Promemoria di backup periodico",
      "Statistiche di collezione",
      "Avviso “nuova versione disponibile” e changelog in-app",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-21",
    items: [
      "Interventi di gruppo (per tag / tutte) con anteprima",
      "Import foto da fotocamera, galleria e Google Drive",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-20",
    items: [
      "Schede pianta con salvataggio locale (offline)",
      "Interventi e storico automatico",
      "Foto con compressione e galleria a schermo intero",
      "Backup: esporta e importa",
    ],
  },
];

// Tag di stato applicato automaticamente da alcuni interventi.
export const FILO_TAG = "presenza di filo";

// Ogni tipo di intervento ha un campo di dettaglio e può aggiungere/rimuovere
// automaticamente un tag di stato dalla pianta (spec §5).
export const INTERVENTIONS = [
  { key: "concimazione", label: "Concimazione", icon: Droplets, detailType: "text", detailLabel: "Tipo di concime" },
  { key: "impostazione", label: "Impostazione", icon: Wand2, detailType: "text", detailLabel: "Note (stile, branche lavorate…)", autoTag: { add: FILO_TAG } },
  { key: "rinvaso", label: "Rinvaso", icon: Package, detailType: "text", detailLabel: "Substrato utilizzato" },
  { key: "potatura", label: "Potatura", icon: Scissors, detailType: "select", detailLabel: "Stagione", detailOptions: ["Invernale", "Estiva"] },
  { key: "defogliazione", label: "Defogliazione", icon: Leaf, detailType: "text", detailLabel: "Note (facoltativo)" },
  { key: "slegatura", label: "Slegatura", icon: Unlink, detailType: "text", detailLabel: "Note (facoltativo)", autoTag: { remove: FILO_TAG } },
  { key: "altro", label: "Altro", icon: MoreHorizontal, detailType: "text", detailLabel: "Specifica" },
];

export const PRESET_COLORS = [MOSS, BARK, SEAL, "#7A6A4F", "#4A5D8A", "#8A5D4A"];

export const DEFAULT_STATO_OPTIONS = [
  { label: "in formazione", color: MOSS },
  { label: "in mantenimento", color: BARK },
  { label: "malata", color: SEAL },
  { label: FILO_TAG, color: "#7A6A4F" },
];

export const DEFAULT_TIPO_OPTIONS = ["Conifera", "Caducifoglia", "Da fiore/frutto", "Sempreverde"];

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function colorForStato(statoOptions, label) {
  const found = statoOptions.find((s) => s.label === label);
  return found ? found.color : BARK;
}
