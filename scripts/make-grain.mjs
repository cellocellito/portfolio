// The page grain: a 1-bit speckle tile in bone at low alpha, so the black reads as printed
// stock instead of a flat screen. Procedural and seeded, so it is the same tile on every run.
// Run after changing it: node scripts/make-grain.mjs (writes public/textures/grain.png, committed).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const SIZE = 192;
const DENSITY = 0.045; // share of pixels that carry a speck
let s = 0x9e3779b9; // mulberry32, fixed seed
const rand = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const px = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < SIZE * SIZE; i++) {
  px[i * 4] = 0xec;
  px[i * 4 + 1] = 0xe6;
  px[i * 4 + 2] = 0xdc;
  px[i * 4 + 3] = rand() < DENSITY ? Math.round(18 + rand() * 22) : 0;
}
const out = join(ROOT, 'public', 'textures');
await mkdir(out, { recursive: true });
await sharp(px, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .png({ compressionLevel: 9, palette: false })
  .toFile(join(out, 'grain.png'));
console.log(`grain: ${SIZE}x${SIZE} → public/textures/grain.png`);
