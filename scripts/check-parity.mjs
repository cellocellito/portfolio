// Content rules the schema cannot express. Fails the build on any violation.
//  1. every work/note entry exists in en and pt, with the same id and draft flag
//  2. case and note bodies use the template headings, in order, per locale
//  3. a published note contains no TODO marker
//  4. the CV PDFs in public/cv are byte-identical to the originals (when design-refs/ is present)
import { readdir, readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const p = (...s) => join(decodeURIComponent(ROOT), ...s);
const errors = [];

// A heading group ending in null is optional. Cases may leave out Decisions and What broke (a section with
// nothing true in it is worse than no section); the order never changes.
const TEMPLATES = {
  work: {
    en: [['Context'], ['What I built'], ['Decisions', null], ['What broke', null], ['Status']],
    pt: [['Contexto'], ['O que construí'], ['Decisões', null], ['O que quebrou', null], ['Status']],
  },
  notes: {
    en: [['Problem'], ['What I found'], ['Fix', 'Still open'], ['What I changed']],
    pt: [['Problema'], ['O que encontrei'], ['Correção', 'Ainda aberto'], ['O que mudei']],
  },
};

const field = (src, name) => (src.match(new RegExp(`^${name}:\\s*['"]?([^'"\\n]+)['"]?\\s*$`, 'm')) || [])[1]?.trim();
const body = (src) => src.replace(/^---[\s\S]*?\n---\n?/, '');
const h2s = (src) => [...body(src).matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);

async function entries(collection, locale) {
  const dir = p('src', 'content', collection, locale);
  const out = {};
  // a collection with nothing published may have no folder at all (git does not keep empty folders)
  const names = await readdir(dir).catch((e) => (e.code === 'ENOENT' ? [] : Promise.reject(e)));
  for (const f of names.filter((n) => n.endsWith('.mdx'))) {
    out[f.replace(/\.mdx$/, '')] = await readFile(join(dir, f), 'utf8');
  }
  return out;
}

for (const collection of ['work', 'notes']) {
  const en = await entries(collection, 'en');
  const pt = await entries(collection, 'pt');
  for (const slug of new Set([...Object.keys(en), ...Object.keys(pt)])) {
    const where = `${collection}/${slug}`;
    if (!en[slug]) {
      errors.push(`${where}: missing in en`);
      continue;
    }
    if (!pt[slug]) {
      errors.push(`${where}: missing in pt`);
      continue;
    }
    if (field(en[slug], 'id') !== field(pt[slug], 'id')) errors.push(`${where}: id differs between en and pt`);
    const dEn = field(en[slug], 'draft') === 'true',
      dPt = field(pt[slug], 'draft') === 'true';
    if (dEn !== dPt) errors.push(`${where}: draft flag differs between en and pt`);
    for (const [locale, src] of [
      ['en', en[slug]],
      ['pt', pt[slug]],
    ]) {
      const want = TEMPLATES[collection][locale];
      const got = h2s(src);
      let i = 0;
      for (const alts of want) {
        if (i < got.length && alts.includes(got[i])) i++;
        else if (!alts.includes(null)) {
          i = -1;
          break;
        }
      }
      const ok = i === got.length;
      if (!ok)
        errors.push(
          `${where} (${locale}): headings must be ${want.map((a) => a.map((x) => x ?? '(optional)').join(' | ')).join(' > ')}; found ${got.join(' > ') || 'none'}`,
        );
      if (collection === 'notes' && field(src, 'draft') !== 'true' && src.includes('[TODO: CELLO')) {
        errors.push(`${where} (${locale}): a published note cannot contain TODO markers; set draft: true`);
      }
    }
  }
}

const sha = async (f) =>
  createHash('sha256')
    .update(await readFile(f))
    .digest('hex');
for (const cv of ['cv-en.pdf', 'cv-pt.pdf']) {
  const pub = p('public', 'cv', cv);
  try {
    await access(pub);
  } catch {
    errors.push(`public/cv/${cv} is missing`);
    continue;
  }
  const src = p('design-refs', 'assets', cv);
  try {
    await access(src);
  } catch {
    continue;
  } // design-refs is local-only; skip when absent
  if ((await sha(pub)) !== (await sha(src)))
    errors.push(`public/cv/${cv} differs from design-refs/assets/${cv} (the PDFs must not be edited)`);
}

if (errors.length) {
  console.error(`check-parity: ${errors.length} problem(s)\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log('check-parity: ok');
