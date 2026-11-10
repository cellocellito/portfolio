// No browser: parses dist/ HTML. Internal links and assets must resolve to built files;
// external links must carry rel="noopener noreferrer"; drafts must never be linked.
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, htmlFiles, toRoute } from './routes';

function resolves(path: string): boolean {
  const clean = decodeURIComponent(path.split('#')[0]?.split('?')[0] ?? '');
  if (clean === '' || clean === '/') return existsSync(join(DIST, 'index.html'));
  const p = join(DIST, clean);
  return existsSync(p) || existsSync(`${p}.html`) || existsSync(join(p, 'index.html'));
}

for (const file of htmlFiles()) {
  const route = toRoute(file);
  test(`links ${route}`, () => {
    const html = readFileSync(file, 'utf8');
    const broken: string[] = [];
    const unsafe: string[] = [];
    for (const m of html.matchAll(/<(a|link|img|script|source)\b[^>]*>/gi)) {
      const tag = m[0];
      const url = (tag.match(/\s(?:href|src)="([^"]+)"/i) ?? [])[1];
      if (!url) continue;
      if (/^https?:\/\//.test(url)) {
        const isOwnSite = url.startsWith('https://portfolio-marcelo-mocha.vercel.app');
        if (tag.startsWith('<a') && !isOwnSite) {
          const rel = (tag.match(/\srel="([^"]+)"/i) ?? [])[1] ?? '';
          if (!rel.includes('noopener') || !rel.includes('noreferrer')) unsafe.push(url);
        }
        continue;
      }
      if (/^(mailto:|tel:|#)/.test(url)) continue;
      if (!resolves(url)) broken.push(url);
    }
    expect(broken, 'broken internal links or assets').toEqual([]);
    expect(unsafe, 'external links without rel="noopener noreferrer"').toEqual([]);
    expect(html.includes('pulse-sync-crm') || html.includes('npm-swarm-502'), 'draft linked').toBe(false);
  });
}
