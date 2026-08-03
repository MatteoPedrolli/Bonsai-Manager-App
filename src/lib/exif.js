// Legge la data di scatto (EXIF DateTimeOriginal) da un JPEG, senza dipendenze.
// Serve per ordinare le foto per quando sono state SCATTATE e non per quando
// sono state caricate: una foto del 2019 importata oggi va al suo posto.
//
// Va chiamato sul file ORIGINALE: la compressione rimuove i metadati EXIF.

const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_DATETIME_DIGITIZED = 0x9004;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD_POINTER = 0x8769;

// "2019:09:03 14:22:31" -> Date (ora locale). Formato EXIF standard.
function parseExifDate(str) {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(str || "");
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, s);
  return isNaN(date) ? null : date;
}

// Estrae le stringhe data da una IFD, seguendo il puntatore alla Exif IFD.
function readIfd(view, start, tiffStart, little, found, depth = 0) {
  if (depth > 2) return;
  const count = view.getUint16(start, little);
  for (let i = 0; i < count; i++) {
    const entry = start + 2 + i * 12;
    if (entry + 12 > view.byteLength) return;
    const tag = view.getUint16(entry, little);

    if (tag === TAG_EXIF_IFD_POINTER) {
      const offset = view.getUint32(entry + 8, little);
      if (tiffStart + offset < view.byteLength) {
        readIfd(view, tiffStart + offset, tiffStart, little, found, depth + 1);
      }
      continue;
    }

    if (tag === TAG_DATETIME_ORIGINAL || tag === TAG_DATETIME_DIGITIZED || tag === TAG_DATETIME) {
      const length = view.getUint32(entry + 4, little);
      let valueOffset = entry + 8;
      if (length > 4) valueOffset = tiffStart + view.getUint32(entry + 8, little);
      if (valueOffset + length > view.byteLength) continue;
      let str = "";
      for (let j = 0; j < length - 1; j++) str += String.fromCharCode(view.getUint8(valueOffset + j));
      if (tag === TAG_DATETIME_ORIGINAL) found.original = str;
      else if (tag === TAG_DATETIME_DIGITIZED) found.digitized = str;
      else found.modified = str;
    }
  }
}

// Ritorna un Date con la data di scatto, oppure null se non disponibile.
export async function readExifDate(file) {
  try {
    // I metadati stanno all'inizio del file: bastano i primi 256 KB.
    const head = file.slice(0, 256 * 1024);
    const view = new DataView(await head.arrayBuffer());
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null; // non JPEG

    let offset = 2;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const size = view.getUint16(offset + 2, false);

      if (marker === 0xe1) {
        // APP1: "Exif\0\0" + TIFF header
        const exifStart = offset + 4;
        if (view.getUint32(exifStart, false) !== 0x45786966) return null; // "Exif"
        const tiffStart = exifStart + 6;
        const endian = view.getUint16(tiffStart, false);
        const little = endian === 0x4949;
        if (!little && endian !== 0x4d4d) return null;
        if (view.getUint16(tiffStart + 2, little) !== 0x002a) return null;

        const ifd0 = tiffStart + view.getUint32(tiffStart + 4, little);
        const found = {};
        readIfd(view, ifd0, tiffStart, little, found);
        return parseExifDate(found.original || found.digitized || found.modified);
      }

      if (marker === 0xda) break; // inizio dati immagine: i metadati finiscono qui
      offset += 2 + size;
    }
    return null;
  } catch (e) {
    console.warn("Lettura EXIF fallita:", e);
    return null;
  }
}

// Data di scatto migliore disponibile: EXIF → data di modifica del file → ora.
export async function bestPhotoDate(file) {
  const exif = await readExifDate(file);
  if (exif) return exif;
  // lastModified è spesso la data reale del file scaricato/salvato
  if (file.lastModified) {
    const d = new Date(file.lastModified);
    if (!isNaN(d) && d.getFullYear() > 1990) return d;
  }
  return new Date();
}
