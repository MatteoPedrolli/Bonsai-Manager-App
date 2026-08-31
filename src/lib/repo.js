import { db, setMeta } from "./db.js";
import { todayISO } from "./constants.js";

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
//  PIANTE — CRUD
// ---------------------------------------------------------------------------
export async function createPlant({ nome, specie, provenienza, dataIngresso, tipo, stato, note }) {
  const ts = now();
  return db.plants.add({
    nome: nome.trim(),
    specie: specie?.trim() || "",
    provenienza: provenienza?.trim() || "",
    dataIngresso: dataIngresso || todayISO(),
    altezza: 0, profondita: 0, larghezza: 0,
    tags: { tipo: tipo || null, stato: stato || [] },
    note: note?.trim() || "",
    ultimaConcimazione: null,
    ultimoRinvaso: null,
    ultimaLavorazione: null,
    storico: [],
    createdAt: ts,
    updatedAt: ts,
  });
}

// Patch parziale su una pianta esistente. Rilegge il record per non perdere
// aggiornamenti concorrenti (es. una foto aggiunta nel frattempo).
export async function updatePlant(id, patch) {
  await db.plants.update(id, { ...patch, updatedAt: now() });
}

export async function deletePlant(id) {
  await db.transaction("rw", db.plants, db.photos, async () => {
    await db.photos.where("plantId").equals(id).delete();
    await db.plants.delete(id);
  });
}

// ---------------------------------------------------------------------------
//  INTERVENTI — registra subito su una o più piante (spec §5, §6)
//  Aggiorna storico (in cima), la data automatica corrispondente e i tag auto.
// ---------------------------------------------------------------------------

// Predicato condiviso: dice se una pianta rientra nel target scelto.
// Riutilizzato dall'anteprima nel form e dall'applicazione effettiva.
export function plantMatchesTarget(p, target, riferimento) {
  if (target === "tutte") return true;
  if (target === "scheda") return p.id === Number(riferimento) || p.nome === riferimento;
  if (target === "tag") return p.tags?.tipo === riferimento || (p.tags?.stato || []).includes(riferimento);
  return false;
}

// Quante piante verrebbero coinvolte (per l'anteprima nel form).
export function countMatches(plants, target, riferimento) {
  return (plants || []).filter((p) => plantMatchesTarget(p, target, riferimento)).length;
}

// Ritorna il numero di piante effettivamente aggiornate.
export async function applyIntervento({ target, riferimento, tipoDef, detail, data }) {
  const when = data || todayISO();
  const noteText = detail
    ? `${tipoDef.detailLabel ? tipoDef.detailLabel + ": " : ""}${detail}`
    : "";

  let affected = 0;
  await db.transaction("rw", db.plants, async () => {
    const all = await db.plants.toArray();
    for (const p of all) {
      if (!plantMatchesTarget(p, target, riferimento)) continue;
      affected++;

      let stato = p.tags?.stato || [];
      if (tipoDef.autoTag?.add && !stato.includes(tipoDef.autoTag.add)) {
        stato = [...stato, tipoDef.autoTag.add];
      }
      if (tipoDef.autoTag?.remove) {
        stato = stato.filter((t) => t !== tipoDef.autoTag.remove);
      }

      const entry = { data: when, tipo: tipoDef.label, key: tipoDef.key, note: noteText };
      const storico = [entry, ...(p.storico || [])].sort((a, b) => (a.data < b.data ? 1 : -1));

      const patch = {
        tags: { ...p.tags, stato },
        storico,
        updatedAt: now(),
      };
      // Da quando gli interventi si possono retrodatare, queste date non si
      // aggiornano più alla cieca: registrare oggi una concimazione fatta un
      // mese fa non deve far arretrare "ultima concimazione", che diventerebbe
      // un'informazione falsa. Si tiene sempre la più recente.
      // (Date in formato "AAAA-MM-GG": il confronto fra stringhe è corretto.)
      const piuRecente = (attuale, nuova) => (!attuale || nuova > attuale ? nuova : attuale);

      if (tipoDef.key === "concimazione") patch.ultimaConcimazione = piuRecente(p.ultimaConcimazione, when);
      else if (tipoDef.key === "rinvaso") patch.ultimoRinvaso = piuRecente(p.ultimoRinvaso, when);
      else patch.ultimaLavorazione = piuRecente(p.ultimaLavorazione, when);

      await db.plants.update(p.id, patch);
    }
  });
  return affected;
}

// ---------------------------------------------------------------------------
//  PIANIFICAZIONE
// ---------------------------------------------------------------------------
export async function addPlanned(item) {
  return db.planned.add({ ...item, createdAt: now() });
}

export async function deletePlanned(id) {
  await db.planned.delete(id);
}

// ---------------------------------------------------------------------------
//  OPZIONI (tag dinamici) — salvate in meta
// ---------------------------------------------------------------------------
export async function saveTipoOptions(list) {
  await setMeta("tipoOptions", list);
}

export async function saveStatoOptions(list) {
  await setMeta("statoOptions", list);
}
