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
export const APP_VERSION = "0.9.3";

// Changelog visibile in app (spec §8). Più recente in cima.
export const CHANGELOG = [
  {
    version: "0.9.3",
    date: "2026-09-04",
    items: [
      "Corretto: con foto molto alte, didascalia e data finivano sotto il bordo dello schermo e sembravano impossibili da modificare",
    ],
  },
  {
    version: "0.9.2",
    date: "2026-09-04",
    items: [
      "Quando la foto non contiene la data, l'app lo dice invece di far passare per vera una stima",
      "Le foto con data stimata hanno un “?” sulla miniatura",
      "Nel visore puoi correggere la data oppure confermare quella proposta con “È giusta”",
    ],
  },
  {
    version: "0.9.1",
    date: "2026-09-04",
    items: [
      "Corretto: su una foto senza data, la data inserita non veniva salvata e non compariva nessun errore",
      "Le foto senza data lo dicono nel visore, invece di mostrare un campo vuoto",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-08-31",
    items: [
      "Gli interventi si registrano con la data in cui li hai fatti davvero, non per forza oggi",
      "La data parte da oggi: se l'intervento è di oggi non devi toccare nulla",
      "Registrare un intervento vecchio non fa più arretrare le date di riepilogo della scheda",
    ],
  },
  {
    version: "0.8.1",
    date: "2026-08-29",
    items: [
      "Sull'icona dell'app compare il numero degli interventi in scadenza",
      "Si vede anche senza aprire l'app, e sparisce quando non c'è più nulla in sospeso",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-08-29",
    items: [
      "Copia di sicurezza su Google Drive, facoltativa: si collega una volta sola",
      "L’app vede solo il file di backup che crea lei, il resto del tuo Drive le è invisibile",
      "Con Drive collegato l’avviso in Collezione diventa il pulsante “Salva su Drive”",
      "Il file su Drive è sempre lo stesso, aggiornato: niente copie a ripetizione",
    ],
  },
  {
    version: "0.7.1",
    date: "2026-08-28",
    items: [
      "Backup con due pulsanti distinti: “Salva sul dispositivo” e “Condividi”",
      "Il file salvato sul dispositivo resta anche se il browser cancella i dati dell’app",
      "Promemoria di backup ogni 15 giorni invece che ogni mese",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-08-28",
    items: [
      "L'app chiede al browser di NON cancellare i tuoi dati per liberare spazio",
      "Nuova sezione “Sicurezza dei dati” in Opzioni: dice se la collezione è protetta",
      "Avviso in Collezione quando i dati sono a rischio o ci sono modifiche non salvate",
      "Il backup si può condividere direttamente su Drive, mail o chat",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-08-03",
    items: [
      "Nome, specie e provenienza della scheda ora si possono correggere (matita in alto a destra)",
      "Foto in ordine dalla più recente alla più vecchia",
      "Tolto il cestino dalle miniature: le foto si eliminano dal visore, con conferma",
      "Aprendo una scheda si parte dall'inizio, tornando indietro si ritrova il punto della lista",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-08-03",
    items: [
      "Le foto si ordinano da sole per data di scatto, anche se caricate dopo",
      "Data della foto modificabile dal visore a schermo intero",
      "Data visibile sulle miniature",
      "Menu foto semplificato (la galleria include già Google Foto)",
    ],
  },
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
