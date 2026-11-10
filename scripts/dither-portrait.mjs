// Build-time 1-bit portrait: grayscale, contrast curve, radial vignette that
// pushes a busy background to black, then an 8×8 Bayer ordered dither to two tones.
// Swap src/assets/portrait/portrait.{png,jpg,jpeg,webp,avif}, rebuild, done. Optional
// src/assets/portrait/portrait.json tunes the vignette for a new photo without touching code:
//   { "cx": 0.5, "cy": 0.6, "radius": 0.5, "cols": 240 }
import sharp from 'sharp';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const DIR = join(ROOT, 'src', 'assets', 'portrait');
const OUT = join(DIR, 'generated');
const B8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43,
  1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const TONES = { bone: [0xec, 0xe6, 0xdc], accent: [0xff, 0x3b, 0x21] };
const BG = [0x08, 0x07, 0x07];

const src = (await readdir(DIR)).find((f) => /^portrait\.(png|jpe?g|webp|avif)$/i.test(f));
if (!src) {
  console.log('dither-portrait: no portrait file, skipped');
  process.exit(0);
}
let cfg = { cx: 0.5, cy: 0.6, radius: 0.5, cols: 240 };
try {
  cfg = { ...cfg, ...JSON.parse(await readFile(join(DIR, 'portrait.json'), 'utf8')) };
} catch {
  /* defaults */
}

const meta = await sharp(join(DIR, src)).metadata();
const cols = cfg.cols;
const rows = Math.round((cols * (meta.height ?? 1)) / (meta.width ?? 1));
const { data } = await sharp(join(DIR, src))
  .flatten({ background: '#000' })
  .resize(cols, rows, { kernel: 'lanczos3' })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

await mkdir(OUT, { recursive: true });
for (const [tone, fg] of Object.entries(TONES)) {
  const out = Buffer.alloc(cols * rows * 3);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let l = (data[y * cols + x] ?? 0) / 255;
      l = Math.pow(Math.min(1, Math.max(0, (l - 0.06) / 0.62)), 0.78);
      const dx = (x / cols - cfg.cx) * (cols / rows) * 1.15,
        dy = (y / rows - cfg.cy) * 0.9;
      const w = 1 - Math.min(1, Math.max(0, (Math.hypot(dx, dy) - cfg.radius * 0.62) / (cfg.radius * 0.5)));
      l *= w * w * (3 - 2 * w);
      const on = l > ((B8[(y % 8) * 8 + (x % 8)] ?? 0) + 0.5) / 64;
      const c = on ? fg : BG;
      out.set(c, (y * cols + x) * 3);
    }
  }
  await sharp(out, { raw: { width: cols, height: rows, channels: 3 } })
    .png({ palette: true, colours: 2, compressionLevel: 9 })
    .toFile(join(OUT, `portrait-${tone}.png`));
}
await writeFile(join(OUT, 'meta.json'), JSON.stringify({ source: src, width: meta.width, height: meta.height, cols, rows }, null, 2));
console.log(`dither-portrait: ${src} ${meta.width}×${meta.height} → ${cols}×${rows} cells (bone, accent)`);
