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

// I file HEIC/HEIF (foto iPhone) non sono decodificabili dai <img> nella maggior
// parte dei browser: vanno convertiti in JPEG prima della compressione, altrimenti
// la foto viene salvata ma non si visualizza. Il type può essere vuoto: controlla
// anche l'estensione.
function isHeic(file) {
  const t = (file.type || "").toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  return /\.hei[cf]$/i.test(file.name || "");
}

function isImage(file) {
  return Boolean(file) && ((file.type || "").startsWith("image/") || isHeic(file));
}

async function convertHeic(file) {
  // heic2any (libheif WASM) caricata solo quando serve, per non appesantire il bundle.
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : out;
  return new File([blob], (file.name || "foto").replace(/\.hei[cf]$/i, "") + ".jpg", {
    type: "image/jpeg",
  });
}

async function compress(file) {
  try {
    return await imageCompression(file, COMPRESSION_OPTS);
  } catch (e) {
    console.warn("Compressione fallita, salvo l'originale:", e);
    return file; // fallback: meglio salvare l'originale che perdere la foto
  }
}

const now = () => new Date().toISOString();

// Aggiunge una o più foto (compresse, HEIC convertiti) alla pianta.
// Ritorna il numero salvato.
export async function addPhotos(plantId, fileList) {
  const files = Array.from(fileList).filter(isImage);
  if (files.length === 0) return 0;

  let count = 0;
  for (const original of files) {
    let file = original;
    if (isHeic(file)) {
      try {
        file = await convertHeic(file);
      } catch (e) {
        console.warn("Conversione HEIC fallita:", e);
        // prosegue col file originale: verrà almeno salvato (compressione permettendo)
      }
    }
    const blob = await compress(file);
    await db.photos.add({
      plantId,
      blob,
      caption: "",
      createdAt: now(),
      takenName: original.name || "",
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
