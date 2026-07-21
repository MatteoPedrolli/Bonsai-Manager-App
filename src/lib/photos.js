import imageCompression from "browser-image-compression";
import { db } from "./db.js";

// Compressione lato client (spec §2, requisito hard): max ~1600px lato lungo,
// qualità ~80%, normalizzata a JPEG. Senza questo lo storage esplode.
const COMPRESSION_OPTS = {
  maxWidthOrHeight: 1600,
  initialQuality: 0.8,
  maxSizeMB: 1.5,
  useWebWorker: true,
  fileType: "image/jpeg",
};

async function compress(file) {
  try {
    return await imageCompression(file, COMPRESSION_OPTS);
  } catch (e) {
    console.warn("Compressione fallita, salvo l'originale:", e);
    return file; // fallback: meglio salvare l'originale che perdere la foto
  }
}

const now = () => new Date().toISOString();

// Aggiunge una o più foto (già compresse) alla pianta. Ritorna il numero salvato.
export async function addPhotos(plantId, fileList) {
  const files = Array.from(fileList).filter((f) => f && f.type.startsWith("image/"));
  if (files.length === 0) return 0;

  let count = 0;
  for (const file of files) {
    const blob = await compress(file);
    await db.photos.add({
      plantId,
      blob,
      caption: "",
      createdAt: now(),
      takenName: file.name || "",
    });
    count++;
  }
  return count;
}

export async function deletePhoto(id) {
  await db.photos.delete(id);
}

export async function updatePhotoCaption(id, caption) {
  await db.photos.update(id, { caption });
}

// Foto di una pianta in ordine cronologico (spec §7).
export async function getPhotos(plantId) {
  const list = await db.photos.where("plantId").equals(plantId).toArray();
  return list.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
