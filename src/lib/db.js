import Dexie from "dexie";
import { DEFAULT_TIPO_OPTIONS, DEFAULT_STATO_OPTIONS } from "./constants.js";

// =============================================================================
//  DATABASE LOCALE — IndexedDB via Dexie
// =============================================================================
//  STRATEGIA DI MIGRAZIONE (spec §8, requisito hard)
//  -----------------------------------------------------------------------------
//  Ogni modifica alla struttura dati DEVE aggiungere un nuovo blocco
//  `db.version(N).stores({...}).upgrade(tx => { ... })` SENZA rimuovere o
//  alterare i blocchi delle versioni precedenti. Dexie applica in sequenza tutte
//  le versioni non ancora eseguite sul dispositivo del socio, preservando i dati.
//
//  Regole:
//   - Non modificare mai lo `.stores()` di una versione già pubblicata.
//   - Aggiungere/rinominare campi non-indicizzati NON richiede una nuova versione
//     (IndexedDB è schemaless sui valori); serve una nuova versione solo per
//     cambiare gli INDICI. Ma se un campo nuovo ha bisogno di un valore di
//     default sui record esistenti, usare `.upgrade()` per popolarlo.
//   - Testare sempre l'upgrade partendo da un DB con dati reali, mai da vuoto.
// =============================================================================

export const db = new Dexie("stab-bonsai");

// -- Versione 1 (schema iniziale) --
db.version(1).stores({
  // ++id = chiave primaria auto-incrementale; gli altri sono indici per query/sort
  plants: "++id, nome, updatedAt",
  photos: "++id, plantId, createdAt",   // blob foto separati dalla scheda (performance)
  planned: "++id, data",                // interventi pianificati (spec Fase 2, già persistiti)
  meta: "&key",                         // key/value: opzioni tag, versione, ecc.
});

// ESEMPIO per il futuro (NON attivare finché non serve — lasciato come riferimento):
// db.version(2).stores({ plants: "++id, nome, updatedAt, specie" })
//   .upgrade(async (tx) => {
//     await tx.table("plants").toCollection().modify((p) => {
//       if (p.nuovoCampo === undefined) p.nuovoCampo = valoreDefault;
//     });
//   });

// -----------------------------------------------------------------------------
//  SEED alla prima creazione del DB (gira una sola volta per dispositivo)
// -----------------------------------------------------------------------------
db.on("populate", async (tx) => {
  await tx.table("meta").bulkPut([
    { key: "tipoOptions", value: DEFAULT_TIPO_OPTIONS },
    { key: "statoOptions", value: DEFAULT_STATO_OPTIONS },
    { key: "schemaVersion", value: 1 },
  ]);
  await tx.table("plants").bulkAdd(seedPlants());
});

function nowISO() {
  return new Date().toISOString();
}

// Piante di esempio (dal prototipo) per mostrare l'app popolata al primo avvio.
// Il socio può eliminarle. Vengono inserite solo su DB nuovo.
function seedPlants() {
  const base = (p) => ({ ...p, createdAt: nowISO(), updatedAt: nowISO(), foto: [] });
  return [
    base({
      nome: "Kentaro",
      specie: "Juniperus procumbens",
      provenienza: "Vivaio Trentino",
      dataIngresso: "2021-04-12",
      altezza: 38, profondita: 22, larghezza: 30,
      tags: { tipo: "Sempreverde", stato: ["in mantenimento"] },
      note: "Esposizione sud, ombreggiare nelle ore centrali in estate.",
      ultimaConcimazione: "2026-06-01",
      ultimoRinvaso: "2024-03-10",
      ultimaLavorazione: "2026-05-15",
      storico: [
        { data: "2026-06-01", tipo: "Concimazione", note: "Concime organico a lento rilascio" },
        { data: "2026-05-15", tipo: "Impostazione", note: "Rimodellata chioma superiore" },
        { data: "2024-03-10", tipo: "Rinvaso", note: "Cambio contenitore, radici sane" },
      ],
    }),
    base({
      nome: "Hana",
      specie: "Acer palmatum",
      provenienza: "Raccolta 2019",
      dataIngresso: "2019-09-03",
      altezza: 45, profondita: 25, larghezza: 34,
      tags: { tipo: "Caducifoglia", stato: ["malata"] },
      note: "",
      ultimaConcimazione: "2026-04-20",
      ultimoRinvaso: "2025-03-01",
      ultimaLavorazione: "2026-04-20",
      storico: [
        { data: "2026-04-20", tipo: "Altro", note: "Fungicida su foglie ingiallite" },
      ],
    }),
    base({
      nome: "Ryu",
      specie: "Pinus thunbergii",
      provenienza: "Scambio soci",
      dataIngresso: "2022-01-20",
      altezza: 52, profondita: 30, larghezza: 40,
      tags: { tipo: "Conifera", stato: ["in formazione", "presenza di filo"] },
      note: "",
      ultimaConcimazione: "2026-05-28",
      ultimoRinvaso: "2023-02-14",
      ultimaLavorazione: "2026-06-10",
      storico: [
        { data: "2026-06-10", tipo: "Impostazione", note: "Legatura branca principale" },
        { data: "2026-05-28", tipo: "Concimazione", note: "Concime minerale" },
      ],
    }),
  ];
}

// -----------------------------------------------------------------------------
//  Helper meta (key/value)
// -----------------------------------------------------------------------------
export async function getMeta(key, fallback) {
  const row = await db.meta.get(key);
  return row ? row.value : fallback;
}

export async function setMeta(key, value) {
  await db.meta.put({ key, value });
}
