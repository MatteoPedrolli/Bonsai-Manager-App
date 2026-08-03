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
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `stab-bonsai-backup_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
  await setMeta("lastBackupAt", new Date().toISOString());
  return payload.counts;
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
