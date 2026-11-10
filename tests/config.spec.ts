// Config-level gates, no browser: security headers in vercel.json and token contrast.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { contrast, hexTokens, PAIRS } from '../src/lib/contrast';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const all = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? [];
const header = (k: string): string => all.find((h) => h.key.toLowerCase() === k.toLowerCase())?.value ?? '';

test('security headers are all set', () => {
  for (const key of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Cross-Origin-Opener-Policy',
  ]) {
    expect(header(key), key).not.toBe('');
  }
  expect(header('X-Content-Type-Options')).toBe('nosniff');
  expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  expect(header('Cross-Origin-Opener-Policy')).toBe('same-origin');
  // no preload until the final domain is set
  expect(header('Strict-Transport-Security')).toMatch(/max-age=\d{8,}/);
  expect(header('Strict-Transport-Security')).not.toContain('preload');
  for (const f of ['camera=()', 'microphone=()', 'geolocation=()']) expect(header('Permissions-Policy')).toContain(f);
});

test('CSP has every required directive and no unsafe script source', () => {
  const csp = Object.fromEntries(
    header('Content-Security-Policy')
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((p) => p[0])
      .map(([k, ...v]) => [k, v]),
  );
  expect(csp['script-src']).toEqual(["'self'"]);
  expect(csp['object-src']).toEqual(["'none'"]);
  expect(csp['base-uri']).toEqual(["'self'"]);
  expect(csp['frame-ancestors']).toEqual(["'none'"]);
  expect(csp['default-src']).toEqual(["'none'"]);
  expect(header('Content-Security-Policy')).not.toMatch(/unsafe-inline|unsafe-eval/);
});

test('every token contrast pair meets its minimum', () => {
  const hex = hexTokens(readFileSync('src/styles/tokens.css', 'utf8'));
  const fails = PAIRS.map((p) => ({ ...p, ratio: contrast(hex[p.fg] ?? '#000', hex[p.bg] ?? '#000') })).filter((p) => p.ratio < p.min);
  expect(fails.map((f) => `${f.fg} on ${f.bg}: ${f.ratio.toFixed(2)} < ${f.min}`)).toEqual([]);
});

// CSP is script-src 'self' and style-src 'self': the built HTML may not carry inline code.
test('built pages have no inline scripts, style elements or style attributes', async () => {
  const { htmlFiles, toRoute } = await import('./routes');
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    const route = toRoute(file);
    // JSON-LD is a data block (type application/ld+json), never executed, so CSP does not apply to it
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(
      (m) => !/\bsrc=/.test(m[1] ?? '') && !/type="application\/ld\+json"/.test(m[1] ?? ''),
    );
    expect(inlineScripts, `${route}: inline <script>`).toHaveLength(0);
    expect(html, `${route}: <style> element`).not.toMatch(/<style\b/i);
    expect(html, `${route}: style attribute`).not.toMatch(/<[^>]+\sstyle=/i);
    expect(html, `${route}: inline event handler`).not.toMatch(/<[^>]+\son[a-z]+=/i);
  }
});

// a TODO in a description would ship to search results and link previews.
test('no page description or title carries a TODO', async () => {
  const { htmlFiles, toRoute } = await import('./routes');
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
    expect(desc, `${toRoute(file)} description`).not.toMatch(/TODO/);
    expect(title, `${toRoute(file)} title`).not.toMatch(/TODO/);
  }
});

// A case's sigil is its mark, so it must be the same drawing in both languages.
test('every case sigil and the record sigil are identical in EN and PT', async () => {
  const { htmlFiles, toRoute } = await import('./routes');
  const sigilOf = (html: string, cls: string): string =>
    (new RegExp(`<svg[^>]*class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)</svg>`).exec(html)?.[1] ?? '').replace(
      / data-astro-cid-[a-z0-9]+/g,
      '',
    );
  const pages = new Map(htmlFiles().map((f) => [toRoute(f), readFileSync(f, 'utf8')]));
  for (const [route, html] of pages) {
    if (!route.startsWith('/work/')) continue;
    const pt = pages.get(`/pt${route}`);
    expect(pt, `${route} has a PT mirror`).toBeTruthy();
    const en = sigilOf(html, 'sigil');
    expect(en.length, `${route} has a sigil`).toBeGreaterThan(100);
    expect(sigilOf(pt ?? '', 'sigil'), `${route} sigil EN = PT`).toBe(en);
  }
  expect(sigilOf(pages.get('/pt') ?? '', 'tp-sigil')).toBe(sigilOf(pages.get('/') ?? '', 'tp-sigil'));
});
