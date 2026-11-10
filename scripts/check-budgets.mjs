// Brief 7.3: initial JS <= 120 KB gzipped (excluding the lazy WebGL chunk), WebGL chunk <= 200 KB.
// Also reports CSS and font weight per page. Exit 1 on a miss.
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const DIST = join(ROOT, 'dist');
const KB = 1024;
const LIMIT_INITIAL = 120 * KB,
  LIMIT_GL = 200 * KB;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else yield f;
  }
}
const gz = async (f) => gzipSync(await readFile(f)).length;
const file = (url) => join(DIST, url.replace(/^\//, ''));

let worst = { page: '', js: 0, css: 0 };
let glChunk = 0;
for await (const f of walk(DIST)) {
  if (f.endsWith('.js') && /hero-gl/.test(f)) glChunk = Math.max(glChunk, await gz(f));
  if (!f.endsWith('.html')) continue;
  const html = await readFile(f, 'utf8');
  const js = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/hero-gl/.test(u));
  const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  let jsB = 0,
    cssB = 0;
  for (const u of js) jsB += await gz(file(u));
  for (const u of css) cssB += await gz(file(u));
  if (jsB + cssB >= worst.js + worst.css) worst = { page: relative(DIST, f).replaceAll('\\', '/'), js: jsB, css: cssB };
  if (jsB > LIMIT_INITIAL) {
    console.error(`check-budgets: ${relative(DIST, f)} initial JS ${(jsB / KB).toFixed(1)} KB > 120 KB`);
    process.exitCode = 1;
  }
}
let fonts = 0;
for await (const f of walk(join(DIST, 'fonts'))) if (f.endsWith('.woff2')) fonts += (await stat(f)).size;
if (glChunk > LIMIT_GL) {
  console.error(`check-budgets: WebGL chunk ${(glChunk / KB).toFixed(1)} KB > 200 KB`);
  process.exitCode = 1;
}
console.log(
  `check-budgets: heaviest page ${worst.page}: JS ${(worst.js / KB).toFixed(1)} KB gz, CSS ${(worst.css / KB).toFixed(1)} KB gz · WebGL chunk ${(glChunk / KB).toFixed(1)} KB gz · fonts ${(fonts / KB).toFixed(0)} KB woff2 total`,
);
