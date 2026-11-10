import { test, expect } from '@playwright/test';
import { isPt, routes } from './routes';

// The EN/BR toggle maps every page to its mirror, and the mirror exists.
const mirrored = routes().filter((r) => r !== '/styleguide');
for (const route of mirrored) {
  test(`toggle ${route}`, async ({ page }) => {
    await page.goto(route);
    const en = await page.locator('nav.lang a[hreflang="en"]').getAttribute('href');
    const pt = await page.locator('nav.lang a[hreflang="pt-BR"]').getAttribute('href');
    const expectedPt = isPt(route) ? route : route === '/' ? '/pt' : `/pt${route}`;
    const expectedEn = isPt(route) ? (route === '/pt' ? '/' : route.slice(3)) : route;
    expect(pt).toBe(expectedPt);
    expect(en).toBe(expectedEn);
    expect(routes()).toContain(isPt(route) ? expectedEn : expectedPt);
    const current = await page.locator('nav.lang a[aria-current="page"]').getAttribute('hreflang');
    expect(current).toBe(isPt(route) ? 'pt-BR' : 'en');
  });
}

test('CV links match the language', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer a[href="/cv/cv-en.pdf"]')).toHaveCount(1);
  await page.goto('/pt');
  await expect(page.locator('footer a[href="/cv/cv-pt.pdf"]')).toHaveCount(1);
});

// First-visit redirect for Portuguese browsers, never after a stored choice.
test.describe('first visit in a Portuguese browser', () => {
  test.use({ locale: 'pt-BR' });

  test('goes once from the EN home to /pt', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/pt$/);
    expect(await page.evaluate(() => localStorage.getItem('cello_lang'))).toBe('pt');
  });

  test('never redirects a deep link', async ({ page }) => {
    await page.goto('/work/whatsapp-assistant');
    await expect(page).toHaveURL(/\/work\/whatsapp-assistant$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('stays on EN after the visitor picks EN', async ({ page }) => {
    await page.goto('/pt/about');
    await page.locator('nav.lang a[hreflang="en"]').click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.evaluate(() => localStorage.getItem('cello_lang'))).toBe('en');
    await page.goto('/work/workflow-guardian');
    await expect(page).toHaveURL(/\/work\/workflow-guardian$/);
  });

  test('keeps a choice stored by the old site', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cello_lang', 'en'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('an English browser is never redirected', async ({ page }) => {
  await page.goto('/about');
  await expect(page).toHaveURL(/\/about$/);
  expect(await page.evaluate(() => localStorage.getItem('cello_lang'))).toBeNull();
});
