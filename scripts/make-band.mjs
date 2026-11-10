// The dither band: a soft, seeded field printed as 8x8 Bayer dots in grey,
// dense at the top and dissolving to nothing at the bottom. Writes public/textures/band.png.
// Run: node scripts/make-band.mjs
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const W = 1600,
  H = 220,
  CELL = 4, // px per dither cell
  DOT = 2; // px of dot inside the cell
const B8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43,
  1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
let s = 0x51f15e; // seeded value noise, so the band is the same on every run
const rand = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const G = 64;
const grid = Array.from({ length: G * G }, rand);
const vn = (x, y) => {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  const xf = x - xi,
    yf = y - yi;
  const g = (i, j) => grid[(((j % G) + G) % G) * G + (((i % G) + G) % G)];
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  return (g(xi, yi) * (1 - u) + g(xi + 1, yi) * u) * (1 - v) + (g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u) * v;
};
const fbm = (x, y) => 0.55 * vn(x, y) + 0.3 * vn(x * 2.1 + 7, y * 2.1 + 3) + 0.15 * vn(x * 4.3 + 1, y * 4.3 + 9);

const px = Buffer.alloc(W * H * 4);
for (let cy = 0; cy < H / CELL; cy++) {
  for (let cx = 0; cx < W / CELL; cx++) {
    const x = cx * CELL,
      y = cy * CELL;
    // the field: soft "reflections" (stretched noise), strongest at the top edge, gone by the bottom
    const fall = Math.pow(1 - y / H, 1.6);
    const f = fbm(x / 320, y / 46);
    const lum = Math.max(0, Math.min(1, (f - 0.4) * 3.4)) * fall + 0.12 * Math.max(0, 1 - y / 40);
    const th = (B8[(cy % 8) * 8 + (cx % 8)] + 0.5) / 64;
    if (lum <= th) continue;
    for (let dy = 0; dy < DOT; dy++)
      for (let dx = 0; dx < DOT; dx++) {
        const i = ((y + dy) * W + (x + dx)) * 4;
        px[i] = 0x8f; // --muted, the band reads grey on the page black
        px[i + 1] = 0x86;
        px[i + 2] = 0x7b;
        px[i + 3] = 255;
      }
  }
}
await sharp(px, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9, palette: true, colours: 2 })
  .toFile(join(here, '..', 'public', 'textures', 'band.png'));
console.log(`band: ${W}x${H} → public/textures/band.png`);
