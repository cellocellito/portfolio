// Screenshots of every route at 375, 768, 1440 and 1920 px, plus the
// reduced-motion home, into qa/iteration-N/. Needs `npm run preview` running on :4321.
import { chromium } from '@playwright/test';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const N = process.argv[2] ?? '0';
const OUT = join(ROOT, 'qa', `iteration-${N}`);
const ONLY = process.env.SHOTS_ONLY?.split(',');
mkdirSync(OUT, { recursive: true });
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : [],
  );
const routes = walk(join(ROOT, 'dist'))
  .map(
    (f) =>
      '/' +
      relative(join(ROOT, 'dist'), f)
        .replaceAll('\\', '/')
        .replace(/\.html$/, ''),
  )
  .map((r) => (r === '/index' ? '/' : r))
  .filter((r) => !ONLY || ONLY.includes(r));
const widths = [375, 768, 1440, 1920];
const name = (r) => (r === '/' ? 'home' : r.slice(1).replaceAll('/', '_'));

const browser = await chromium.launch({ channel: 'msedge' });
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 812 : 1000 }, deviceScaleFactor: 1, locale: 'en-US' });
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(`http://localhost:4321${r}`, { waitUntil: 'networkidle' });
    // scroll through once so lazy images load before the full-page capture
    await page.evaluate(async () => {
      // slow enough that every reveal's IntersectionObserver fires (a fast pass left rows
      // unrevealed, so their spine thorns were captured before they grew)
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((res) => setTimeout(res, 110));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !document.querySelector('.rv-fade, .rv-cover'), null, { timeout: 6000 }).catch(() => {});
    // The scroll wakes the WebGL sigil (home and case covers: a 2.4 s pour once it is on screen) and
    // starts every dither reveal (1.1 s); capture the settled page, not a frame mid-sweep.
    if (await page.locator('svg[data-gl]').count()) {
      await page.waitForFunction(() => document.documentElement.dataset.sigilGl === 'on', null, { timeout: 9000 }).catch(() => {});
    }
    await page.waitForTimeout(1300);
    await page.screenshot({ path: join(OUT, `${name(r)}-${w}.png`), fullPage: true });
  }
  await ctx.close();
}
const rm = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'en-US' });
const p = await rm.newPage();
await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await p.screenshot({ path: join(OUT, 'home-1440-reduced-motion.png'), fullPage: true });
await browser.close();
console.log(`shots: ${routes.length} routes × ${widths.length} widths + reduced-motion home → ${relative(ROOT, OUT)}`);
