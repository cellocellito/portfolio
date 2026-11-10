// SEO and sharing, checked on the built files: OG images exist, the sitemap lists every
// indexable page with its language pair, robots points to it, and the JSON-LD holds only the profile facts.
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, htmlFiles, routes, toRoute } from './routes';

const SITE = 'https://portfolio-marcelo-mocha.vercel.app';
const meta = (html: string, prop: string): string =>
  new RegExp(`<meta (?:property|name)="${prop.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`).exec(html)?.[1] ?? '';

test('every page names an OG image that exists, with title, description and card', () => {
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    const route = toRoute(file);
    const img = meta(html, 'og:image');
    expect(img, `${route} og:image`).toMatch(new RegExp(`^${SITE}/og/.+\\.png$`));
    expect(existsSync(join(DIST, img.replace(SITE, ''))), `${route} ${img} exists`).toBe(true);
    expect(meta(html, 'og:title'), `${route} og:title`).not.toBe('');
    expect(meta(html, 'og:description'), `${route} og:description`).not.toBe('');
    expect(meta(html, 'twitter:card')).toBe('summary_large_image');
  }
});

test('the sitemap lists every indexable page once, with hreflang, and nothing else', () => {
  const xml = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => (m[1] ?? '').replace(SITE, '') || '/');
  const expected = routes().filter((r) => r !== '/styleguide');
  expect([...locs].sort()).toEqual([...expected].sort());
  expect(xml).toContain('hreflang="pt-BR"');
  expect(xml).not.toMatch(/styleguide|404|\/og\//);
});

test('robots.txt allows everything and points to the sitemap', () => {
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  expect(robots).toContain('Allow: /');
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
});

test('the home pages carry a Person with section 4 facts only', () => {
  for (const route of ['/', '/pt']) {
    const html = readFileSync(join(DIST, route === '/' ? 'index.html' : 'pt.html'), 'utf8');
    const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(raw, `${route} JSON-LD`).toBeTruthy();
    const person = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe('Marcelo Ribeiro Lima');
    expect(person.alternateName).toBe('Cello');
    expect(person.email).toBe('mailto:cello.official04@gmail.com');
    expect(Object.keys(person).sort()).toEqual(
      ['@context', '@type', 'address', 'alternateName', 'alumniOf', 'email', 'knowsAbout', 'name', 'sameAs', 'url'].sort(),
    );
  }
});
