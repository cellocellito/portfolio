import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';

// axe-core on every route, normal and reduced motion: zero serious or critical violations.
for (const motion of ['no-preference', 'reduce'] as const) {
  for (const route of routes()) {
    test(`axe ${route} (${motion})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto(route, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
    });
  }
}

// WCAG 2.2 target size, and a stricter 44px for standalone controls.
test('standalone controls are at least 44px tall', async ({ page }) => {
  for (const route of ['/', '/work/whatsapp-assistant', '/styleguide']) {
    await page.goto(route);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('header a, footer a:not(p:not(.mail) a), .door, button')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ text: (el.textContent ?? '').trim().slice(0, 30), h: el.getBoundingClientRect().height }))
        .filter((x) => x.h < 44),
    );
    expect(small, route).toEqual([]);
  }
});
