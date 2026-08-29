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

// -- Versione 2 --
// Aggiunge `takenAt`: la data in cui la foto è stata SCATTATA (da EXIF o scelta
// dal socio), distinta da `createdAt` che è quando è stata caricata nell'app.
// L'ordinamento cronologico usa takenAt.
// Le foto già presenti non hanno l'informazione originale: si usa createdAt
// come valore di partenza, modificabile a mano dal visore foto.
db.version(2).stores({
  plants: "++id, nome, updatedAt",
  photos: "++id, plantId, createdAt, takenAt",
  planned: "++id, data",
  meta: "&key",
}).upgrade(async (tx) => {
  await tx.table("photos").toCollection().modify((p) => {
    if (!p.takenAt) p.takenAt = p.createdAt;
  });
});

// -----------------------------------------------------------------------------
//  SEED alla prima creazione del DB (gira una sola volta per dispositivo)
// -----------------------------------------------------------------------------
//  Solo le opzioni dei tag. NIENTE piante di esempio: chi installa l'app parte
//  dalla collezione vuota e aggiunge le sue. Le tre schede dimostrative
//  (Kentaro, Hana, Ryu) sono state rimosse il 29 ago 2026.
//
//  Nota: questo blocco gira solo su database NUOVI. Sui dispositivi dove l'app
//  è già installata le tre schede restano, e vanno eliminate a mano: cancellarle
//  da qui sarebbe un'operazione distruttiva sui dati di qualcun altro, e c'è chi
//  potrebbe averle rinominate e usate come schede vere.
// -----------------------------------------------------------------------------
db.on("populate", async (tx) => {
  await tx.table("meta").bulkPut([
    { key: "tipoOptions", value: DEFAULT_TIPO_OPTIONS },
    { key: "statoOptions", value: DEFAULT_STATO_OPTIONS },
    { key: "schemaVersion", value: 2 },
  ]);
});

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
