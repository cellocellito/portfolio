// Post-build: turn content markers `[TODO: CELLO — what is needed]` into a visible
// `<mark data-todo>TODO (Cello): what is needed</mark>`. Inside tags (attributes) and
// inside <title>, the marker becomes plain text. Shipped HTML never carries the em dash
// from a marker, so the copy check stays meaningful.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = /\[TODO: CELLO\s*(?:—|&#x2014;|&#8212;|&mdash;)\s*([^\]]*)\]/g;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith('.html')) yield p;
  }
}

export function transform(html) {
  const parts = html.split(/(<[^>]+>)/);
  let inTitle = false;
  let count = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('<')) {
      if (/^<title\b/i.test(part)) inTitle = true;
      if (/^<\/title>/i.test(part)) inTitle = false;
      parts[i] = part.replace(MARKER, (_, what) => {
        count++;
        return `TODO (Cello): ${what.trim()}`;
      });
    } else if (inTitle) {
      parts[i] = part.replace(MARKER, (_, what) => {
        count++;
        return `TODO (Cello): ${what.trim()}`;
      });
    } else {
      parts[i] = part.replace(MARKER, (_, what) => {
        count++;
        return `<mark data-todo>TODO (Cello): ${what.trim()}</mark>`;
      });
    }
  }
  return { html: parts.join(''), count };
}

export default function todoMarks() {
  return {
    name: 'todo-marks',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        let files = 0;
        let marks = 0;
        for await (const file of htmlFiles(root)) {
          const src = await readFile(file, 'utf8');
          const { html, count } = transform(src);
          if (count) {
            await writeFile(file, html);
            files++;
            marks += count;
          }
        }
        logger.info(`${marks} TODO markers rendered in ${files} pages`);
      },
    },
  };
}
