import { test, expect } from '@playwright/test';

// at 768 px the case numeral and side label landed on the headline.
for (const width of [600, 768, 860]) {
  test(`case cover text never overlaps at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    for (const route of ['/work/whatsapp-assistant', '/work/pulse-sync-site', '/pt/work/this-site']) {
      await page.goto(route);
      const boxes = await page.evaluate(() =>
        ['.head-margin', '.head-body'].map((s) => {
          const r = document.querySelector(s)?.getBoundingClientRect();
          return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null;
        }),
      );
      const [a, b] = boxes;
      expect(a && b).toBeTruthy();
      if (!a || !b) return;
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(overlap, route).toBe(false);
    }
  });
}

// Every track gets its thorn on the spine where the margins are (861 px and up).
test('a spine thorn beside every track numeral', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll('.track')].map((t) => parseFloat(getComputedStyle(t, '::before').width) || 0),
  );
  expect(widths.length).toBeGreaterThan(0);
  for (const w of widths) expect(w).toBeGreaterThan(10);
});
