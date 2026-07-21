// Genera le icone PWA (icon-192.png, icon-512.png) senza dipendenze esterne.
// Disegna un bonsai (vaso + tronco + chioma + sigillo hanko) su un buffer RGBA
// in super-risoluzione (4×) e poi lo riduce mediando i pixel → bordi morbidi.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

const PAPER = [0xe6, 0xe2, 0xd6];
const SEAL = [0xb2, 0x3a, 0x2f];
const MOSS = [0x4a, 0x5d, 0x45];
const MOSS_LIGHT = [0x5b, 0x72, 0x56];
const BARK = [0x8c, 0x7b, 0x65];
const BARK_DARK = [0x6e, 0x5e, 0x49];

// ---- PNG encoder (RGBA, filtro none) ----
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
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, y * size * 4 + size * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- disegno in coordinate normalizzate 0..1 ----
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function renderSupersampled(size, ss) {
  const S = size * ss;
  const px = Buffer.alloc(S * S * 4);
  const set = (x, y, [r, g, b]) => {
    const i = (y * S + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  const circle = (cx, cy, r, col) => ({ test: (u, v) => Math.hypot(u - cx, v - cy) <= r, col });
  const canopy = [
    circle(0.34, 0.40, 0.150, MOSS),
    circle(0.63, 0.40, 0.140, MOSS),
    circle(0.50, 0.31, 0.175, MOSS),
    circle(0.48, 0.46, 0.150, MOSS),
    circle(0.42, 0.34, 0.100, MOSS_LIGHT),
  ];

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;

      // sfondo carta washi
      let col = PAPER;

      // sigillo hanko (sole) dietro l'albero
      if (Math.hypot(u - 0.66, v - 0.30) <= 0.12) col = SEAL;

      // tronco (due segmenti con leggera curva)
      const wTrunk = 0.024;
      if (
        distToSegment(u, v, 0.50, 0.70, 0.485, 0.58) <= wTrunk ||
        distToSegment(u, v, 0.485, 0.58, 0.46, 0.47) <= wTrunk * 0.85
      ) col = BARK_DARK;

      // chioma
      for (const c of canopy) if (c.test(u, v)) col = c.col;

      // vaso (trapezio) davanti alla base del tronco
      if (v >= 0.705 && v <= 0.80) {
        const tt = (v - 0.705) / (0.80 - 0.705); // 0 in alto, 1 in basso
        const halfTop = 0.185, halfBot = 0.135;
        const half = halfTop + (halfBot - halfTop) * tt;
        if (Math.abs(u - 0.5) <= half) {
          col = v <= 0.735 ? BARK_DARK : BARK; // bordo superiore più scuro
        }
      }

      set(x, y, col);
    }
  }

  // downsample mediando ss×ss
  const out = Buffer.alloc(size * size * 4);
  const n = ss * ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const i = ((y * ss + dy) * S + (x * ss + dx)) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2];
        }
      }
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }
  return out;
}

for (const size of [192, 512]) {
  const png = encodePNG(size, renderSupersampled(size, 4));
  writeFileSync(join(OUT, `icon-${size}.png`), png);
  console.log(`icon-${size}.png (${png.length} bytes)`);
}
