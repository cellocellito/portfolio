// Dither masks for the motion. 8x8 Bayer, 4 px cells, alpha only.
//   edge.png / edge-s.png: a horizontal fill front (rows, doors): opaque on the left, a dithered front,
//     transparent on the right; sliding mask-position-x sweeps the fill across.
//   vt-down.png / vt-up.png: the page-to-page wipe, a ragged dithered front that travels down (or up).
//   ink-v.png: a smaller vertical front for the wordmark printing in.
// Run: node scripts/make-masks.mjs (writes public/textures)
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'textures');
const B8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43,
  1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const CELL = 4;
let s = 0x2b1d3;
const rand = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// periodic 1D value noise in [-1, 1], so a repeated tile has no seam
const noise1 = (period, knots) => {
  const k = Array.from({ length: knots }, () => rand() * 2 - 1);
  return (x) => {
    const u = ((x / period) * knots) % knots;
    const i = Math.floor(u),
      f = u - i;
    const a = k[i % knots],
      b = k[(i + 1) % knots];
    const e = f * f * (3 - 2 * f);
    return a + (b - a) * e;
  };
};

// value(x, y) in [0, 1] = how much of this cell is mask (1 opaque)
async function write(name, W, H, value) {
  const px = Buffer.alloc(W * H * 4);
  for (let cy = 0; cy < H / CELL; cy++)
    for (let cx = 0; cx < W / CELL; cx++) {
      const v = value(cx * CELL + CELL / 2, cy * CELL + CELL / 2);
      const th = (B8[(cy % 8) * 8 + (cx % 8)] + 0.5) / 64;
      if (v <= th) continue;
      for (let dy = 0; dy < CELL; dy++)
        for (let dx = 0; dx < CELL; dx++) {
          const i = ((cy * CELL + dy) * W + cx * CELL + dx) * 4;
          px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 255;
        }
    }
  await sharp(px, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(join(out, name));
  console.log(`${name} ${W}x${H}`);
}
const clamp = (v) => Math.max(0, Math.min(1, v));

// horizontal fronts: opaque up to a, dithered from a to b, transparent after b
await write('edge.png', 4096, 32, (x) => clamp((2120 - x) / 240));
await write('edge-s.png', 1040, 32, (x) => clamp((520 - x) / 110));

// the page wipe: 512 wide (tiles across), 2500 tall shown at 250vh. Opaque above 1000 (the first
// viewport), transparent below 1500, a ragged front between, so it can be slid from hidden to shown.
const n = noise1(512, 9);
await write('vt-down.png', 512, 2500, (x, y) => clamp((1400 + n(x) * 90 - y) / 300));
await write('vt-up.png', 512, 2500, (x, y) => clamp((y - 1100 + n(x) * 90) / 300));

// the wordmark: 256 x 720 shown at 300% of the element's height; opaque above 240, gone below 480
const m = noise1(256, 5);
await write('ink-v.png', 256, 720, (x, y) => clamp((440 + m(x) * 30 - y) / 160));
