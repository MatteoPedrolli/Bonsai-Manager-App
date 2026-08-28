import { db, setMeta } from "./db.js";

// Backup manuale (spec §2): un unico file JSON con dati + foto (base64),
// re-importabile su un nuovo dispositivo o come recupero. Le foto sono già
// compresse, quindi il base64 resta gestibile.

const BACKUP_VERSION = 1;

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

// ---------------------------------------------------------------------------
//  EXPORT
// ---------------------------------------------------------------------------
export async function exportBackup() {
  const [plants, planned, meta, photoRows] = await Promise.all([
    db.plants.toArray(),
    db.planned.toArray(),
    db.meta.toArray(),
    db.photos.toArray(),
  ]);

  const photos = [];
  for (const p of photoRows) {
    photos.push({
      id: p.id,
      plantId: p.plantId,
      caption: p.caption || "",
      createdAt: p.createdAt,
      takenAt: p.takenAt || p.createdAt, // data di scatto (ordinamento cronologico)
      takenName: p.takenName || "",
      dataUrl: await blobToDataURL(p.blob),
    });
  }

  const payload = {
    app: "stab-bonsai",
    backupVersion: BACKUP_VERSION,
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: { plants: plants.length, photos: photos.length, planned: planned.length },
    data: { plants, planned, meta, photos },
  };

  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `stab-bonsai-backup_${stamp}.json`;

  // Su telefono un file "scaricato" resta sullo stesso dispositivo che può
  // perderlo: se il sistema lo permette si apre la condivisione, così il socio
  // lo manda su Drive, in chat o nei file del telefono. Altrimenti, download.
  const method = (await shareFile(blob, filename)) ? "share" : download(blob, filename);

  await setMeta("lastBackupAt", new Date().toISOString());
  return { ...payload.counts, method };
}

// Errore usato quando il socio chiude il foglio di condivisione: il backup
// NON è stato salvato, quindi non va segnata la data.
export class BackupAnnullato extends Error {
  constructor() {
    super("Backup annullato");
    this.name = "BackupAnnullato";
  }
}

// Ritorna true se il file è stato condiviso, false se la condivisione non è
// disponibile (si ricade sul download). Lancia BackupAnnullato se l'utente chiude.
async function shareFile(blob, filename) {
  const file = new File([blob], filename, { type: "application/json" });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title: "Backup Bonsai Manager" });
    return true;
  } catch (e) {
    if (e?.name === "AbortError") throw new BackupAnnullato();
    return false; // condivisione fallita per altri motivi: si prova il download
  }
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "download";
}

// ---------------------------------------------------------------------------
//  IMPORT (sostituisce interamente i dati locali)
// ---------------------------------------------------------------------------
export async function importBackup(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File non valido: non è un JSON leggibile.");
  }
  if (parsed?.app !== "stab-bonsai" || !parsed.data) {
    throw new Error("File non riconosciuto come backup STAB Bonsai.");
  }

  const { plants = [], planned = [], meta = [], photos = [] } = parsed.data;

  // Ricostruisce i blob delle foto dal base64
  const photoRecords = [];
  for (const ph of photos) {
    photoRecords.push({
      id: ph.id,
      plantId: ph.plantId,
      caption: ph.caption || "",
      createdAt: ph.createdAt,
      // I backup creati prima della v0.5.0 non hanno takenAt: si ricade su createdAt.
      takenAt: ph.takenAt || ph.createdAt,
      takenName: ph.takenName || "",
      blob: await dataURLToBlob(ph.dataUrl),
    });
  }

  await db.transaction("rw", db.plants, db.photos, db.planned, db.meta, async () => {
    await Promise.all([db.plants.clear(), db.photos.clear(), db.planned.clear(), db.meta.clear()]);
    if (plants.length) await db.plants.bulkAdd(plants);
    if (planned.length) await db.planned.bulkAdd(planned);
    if (meta.length) await db.meta.bulkPut(meta);
    if (photoRecords.length) await db.photos.bulkAdd(photoRecords);
  });

  return {
    plants: plants.length,
    photos: photoRecords.length,
    planned: planned.length,
  };
}
