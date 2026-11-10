// Lighthouse (mobile, simulated throttling) on key routes against `npm run preview`.
// Budgets: Performance >= 90, Accessibility 100, Best Practices 100, SEO 100.
// Runs on the system Microsoft Edge (Chromium), because Playwright's bundled Chromium fails to start on some machines. Exit 1 on a miss.
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = process.env.LH_BASE ?? 'http://localhost:4321';
const OUT = process.argv[2]; // optional folder for JSON reports
const ROUTES = (process.env.LH_ROUTES ?? '/,/pt,/work/whatsapp-assistant,/about,/pt/work/pulse-sync-site').split(',');
const MIN = { performance: 0.9, accessibility: 1, 'best-practices': 1, seo: 1 };
// LCP < 2.5 s and CLS < 0.1 on mobile, checked here as well as the category scores.
const MAX_LCP_MS = 2500;
const MAX_CLS = 0.1;

// chrome-launcher cannot read Edge's debugging port on this machine; Playwright can launch Edge.
// English browser on purpose: this machine is pt-BR, and a PT browser gets the one-time redirect from "/" to
// "/pt" (src/scripts/lang.ts), which turned the home measurement into a measurement of that redirect.
const PORT = Number(process.env.LH_PORT ?? 9333);
const browser = await chromium.launch({
  channel: 'msedge',
  args: [`--remote-debugging-port=${PORT}`, '--lang=en-US', '--accept-lang=en-US'],
});
const chrome = { port: PORT, kill: () => browser.close() };
let failed = 0;
const rows = [];
try {
  for (const route of ROUTES) {
    const r = await lighthouse(`${BASE}${route}`, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: Object.keys(MIN),
    });
    if (!r) throw new Error(`no result for ${route}`);
    const cats = r.lhr.categories;
    const audits = r.lhr.audits;
    const row = {
      route,
      ...Object.fromEntries(Object.keys(MIN).map((k) => [k, Math.round((cats[k]?.score ?? 0) * 100)])),
      lcp: audits['largest-contentful-paint']?.displayValue,
      cls: audits['cumulative-layout-shift']?.displayValue,
      tbt: audits['total-blocking-time']?.displayValue,
    };
    rows.push(row);
    for (const [k, min] of Object.entries(MIN)) {
      if ((cats[k]?.score ?? 0) < min) {
        failed++;
        const misses = Object.values(audits)
          .filter((a) => a.score !== null && a.score < 1 && cats[k]?.auditRefs.some((ref) => ref.id === a.id && ref.weight > 0))
          .map((a) => a.id);
        console.error(`  ${route} ${k} ${Math.round((cats[k]?.score ?? 0) * 100)} < ${min * 100}: ${misses.join(', ')}`);
      }
    }
    const lcp = audits['largest-contentful-paint']?.numericValue ?? Infinity;
    const cls = audits['cumulative-layout-shift']?.numericValue ?? Infinity;
    if (lcp >= MAX_LCP_MS || cls >= MAX_CLS) {
      failed++;
      console.error(`  ${route} LCP ${Math.round(lcp)} ms (max ${MAX_LCP_MS}) · CLS ${cls.toFixed(3)} (max ${MAX_CLS})`);
    }
    if (OUT) {
      await mkdir(OUT, { recursive: true });
      await writeFile(`${OUT}/lh${route.replaceAll('/', '_') || '_home'}.json`, JSON.stringify(r.lhr));
    }
  }
} finally {
  await chrome.kill();
}
console.table(rows);
if (failed) {
  console.error(`lighthouse: ${failed} budget miss(es)`);
  process.exit(1);
}
console.log('lighthouse: all budgets met');
