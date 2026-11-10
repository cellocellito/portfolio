import { test, expect } from '@playwright/test';
import { isPt, routes } from './routes';

// Per route: renders, one h1, right lang, no console errors, no third-party requests,
// no horizontal scroll at 360px.
for (const route of routes()) {
  test(`smoke ${route}`, async ({ page, baseURL }) => {
    const errors: string[] = [];
    const foreign: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.origin !== new URL(baseURL ?? '').origin && u.protocol.startsWith('http')) foreign.push(r.url());
    });

    await page.setViewportSize({ width: 360, height: 800 });
    const res = await page.goto(route, { waitUntil: 'networkidle' });
    expect(res?.status(), 'status').toBe(200);
    await expect(page).toHaveTitle(/\S/);
    expect(await page.locator('h1').count(), 'exactly one h1').toBe(1);
    expect(await page.locator('html').getAttribute('lang')).toBe(isPt(route) ? 'pt-BR' : 'en');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal scroll at 360px').toBeLessThanOrEqual(0);
    expect(errors, 'console errors').toEqual([]);
    expect(foreign, 'third-party requests').toEqual([]);
  });
}

test('404 page answers 404 and links home in both languages', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.locator('main a[href="/"]')).toHaveCount(1);
  await expect(page.locator('main a[href="/pt"]')).toHaveCount(1);
});

// a bad split once dropped every "s" from the hero line. The rendered text must equal the string.
test('hero line renders its strings exactly, EN and PT', async ({ page }) => {
  const { en } = await import('../src/i18n/en');
  const { pt } = await import('../src/i18n/pt');
  for (const [route, s] of [
    ['/', en],
    ['/pt', pt],
  ] as const) {
    await page.goto(route);
    const lede = (await page.locator('.tp-lede').innerText()).replace(/\s+/g, ' ').trim();
    expect(lede).toBe(s.hero.lede);
    const fact = (await page.locator('.tp-fact').innerText()).trim();
    expect(fact).toBe(s.hero.fact);
  }
});
