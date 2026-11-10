// Lists every `[TODO: CELLO — ...]` in content, data and UI strings. Never fails the build.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const MARKER = /\[TODO: CELLO\s*—\s*([^\]]*)\]/g;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (/\.(mdx?|ts|json)$/.test(e.name)) yield f;
  }
}

let total = 0;
const rows = [];
for (const base of ['src/content', 'src/data', 'src/i18n']) {
  try {
    for await (const f of walk(join(ROOT, base))) {
      const src = await readFile(f, 'utf8');
      const draft = /^draft:\s*true\s*$/m.test(src);
      const found = [...src.matchAll(MARKER)].map((m) => m[1].trim());
      if (found.length) {
        total += found.length;
        rows.push({ file: relative(ROOT, f).replaceAll('\\', '/'), draft, found });
      }
    }
  } catch {
    /* folder may not exist yet */
  }
}
console.log(`todo-report: ${total} TODO markers in ${rows.length} files`);
for (const r of rows) {
  console.log(`  ${r.file}${r.draft ? '  (draft, not built)' : ''}`);
  for (const t of r.found) console.log(`    - ${t}`);
}
