// Genera le icone PWA (icon-192.png, icon-512.png) senza dipendenze esterne.
// Disegna l'icona "hanko" a mano su un buffer RGBA e la codifica in PNG con zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

const INK = [0x1c, 0x1b, 0x19];
const PAPER = [0xe6, 0xe2, 0xd6];
const SEAL = [0xb2, 0x3a, 0x2f];
const MOSS = [0x4a, 0x5d, 0x45];
const BARK = [0x8c, 0x7b, 0x65];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels) {
  // pixels: Uint8Array RGBA length size*size*4
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    pixels.copy
      ? pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, y * size * 4 + size * 4)
      : Buffer.from(pixels.subarray(y * size * 4, y * size * 4 + size * 4)).copy(
          raw,
          y * (size * 4 + 1) + 1
        );
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function draw(size) {
  const px = Buffer.alloc(size * size * 4);
  const s = size;
  const cx = s / 2;
  const cy = s * 0.46;
  const radius = s * 0.9 * 0.5; // rounded square radius region
  const corner = s * 0.18;
  const ringR = s * 0.26;
  const ringW = s * 0.05;
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * s + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  };
  const inRounded = (x, y) => {
    // rounded square covering full canvas with corner radius
    const rx = Math.min(x, s - 1 - x);
    const ry = Math.min(y, s - 1 - y);
    if (rx >= corner || ry >= corner) return true;
    const dx = corner - rx;
    const dy = corner - ry;
    return dx * dx + dy * dy <= corner * corner;
  };
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (!inRounded(x, y)) {
        set(x, y, [0, 0, 0], 0);
        continue;
      }
      set(x, y, INK);
      const d = Math.hypot(x - cx, y - cy);
      // anello rosso (hanko)
      if (Math.abs(d - ringR) <= ringW) set(x, y, SEAL);
      // foglia verde centrale
      const lx = x - cx;
      const ly = y - cy;
      if (ly < 0 && Math.abs(lx) < (s * 0.11) * (1 + ly / (s * 0.22))) {
        set(x, y, MOSS);
      }
      // tronco
      if (Math.abs(x - cx) < s * 0.02 && y > cy && y < cy + s * 0.16) set(x, y, BARK);
    }
  }
  return px;
}

for (const size of [192, 512]) {
  const png = encodePNG(size, draw(size));
  writeFileSync(join(OUT, `icon-${size}.png`), png);
  console.log(`icon-${size}.png (${png.length} bytes)`);
}
