// Copy check: scan the built HTML's visible text for banned words/phrases and em dashes.
// Visible = text content outside <script>/<style>, plus alt, title, aria-label, placeholder and
// <meta name=description|og:*|twitter:*> content. Exit 1 on any hit.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const DIST = join(ROOT, process.argv[2] || 'dist');

const words = [
  'passionate',
  'leverage',
  'seamless',
  'seamlessly',
  'cutting-edge',
  'state-of-the-art',
  'unlock',
  'elevate',
  'empower',
  'delve',
  'robust',
  'synergy',
  'game-changer',
  'innovative',
  'revolutionize',
  'journey',
  'tapestry',
  'testament',
];
const phrases = [
  "in today's fast-paced",
  "i'm a developer who",
  'bringing ideas to life',
  'crafting digital experiences',
  'pixel-perfect',
  'turning coffee into code',
  'powered by coffee',
  'best viewed in',
  "hi, i'm",
  "let's build something amazing",
  "let's build the future",
  'all green',
  'doing real work every day',
];
// PT-BR equivalents (extension, same spirit). "de ponta a ponta" (end to end) stays allowed.
const ptWords = [
  'apaixonado',
  'apaixonada',
  'alavancar',
  'alavanque',
  'sinergia',
  'inovador',
  'inovadora',
  'inovadores',
  'revolucionar',
  'revolucionário',
  'jornada',
  'robusto',
  'robusta',
  'empoderar',
  'tecnologia de ponta',
  'sem esforço',
  'transformar ideias em realidade',
  'experiências digitais',
];
const patterns = [
  ...[...words, ...ptWords].map((w) => [w, new RegExp(`(?<![\\p{L}-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu')]),
  ...phrases.map((ph) => [ph, new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]"), 'i')]),
  ['no X were harmed', /\bno \w+(?: \w+)? (?:was|were) harmed/i],
  ['em dash (—)', /—|&mdash;|&#8212;|&#x2014;/i],
];

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
function visibleText(html) {
  const chunks = [];
  const stripped = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  for (const m of stripped.matchAll(/\s(?:alt|title|aria-label|placeholder)="([^"]*)"/gi)) chunks.push(m[1]);
  for (const m of stripped.matchAll(/<meta\s[^>]*(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>/gi)) {
    const c = m[0].match(/content="([^"]*)"/i);
    if (c) chunks.push(c[1]);
  }
  chunks.push(stripped.replace(/<[^>]+>/g, ' '));
  return decode(chunks.join('\n')).replace(/[ \t]+/g, ' ');
}

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(f);
    else if (e.name.endsWith('.html')) yield f;
  }
}

let hits = 0,
  pages = 0;
for await (const file of htmlFiles(DIST)) {
  pages++;
  const text = visibleText(await readFile(file, 'utf8'));
  for (const [name, re] of patterns) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) {
      hits++;
      const at = m.index ?? 0;
      console.error(
        `  ${relative(DIST, file).replaceAll('\\', '/')}: "${name}" … ${text
          .slice(Math.max(0, at - 50), at + 50)
          .replace(/\s+/g, ' ')
          .trim()} …`,
      );
    }
  }
}
if (hits) {
  console.error(`copy-check: ${hits} hit(s) in ${pages} pages`);
  process.exit(1);
}
console.log(`copy-check: 0 hits in ${pages} pages`);
