import { test, expect } from '@playwright/test';

// The mark's box is as tall as its drawing, and the hit strokes sit on the rays. The invisible hit layer once
// sized itself to an svg's 300 x 150 default on phones: the box grew 130 px below the drawing, "Cello" was
// pushed off the mark's lower quarter, and the hit strokes no longer matched the rays.
for (const width of [360, 412, 1440]) {
  test(`the mark's box and hit strokes match its drawing at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/pt/work/workflow-guardian', '/nope']) {
      await page.goto(route);
      const r = await page.evaluate(() => {
        const rect = (e: Element | null) => e?.getBoundingClientRect() ?? null;
        // centre of the union of a set of boxes (a track's rays are several paths, mirrored left and right)
        const center = (els: Element[]): [number, number] | null => {
          if (!els.length) return null;
          const bs = els.map((e) => e.getBoundingClientRect());
          const l = Math.min(...bs.map((b) => b.left)),
            r = Math.max(...bs.map((b) => b.right)),
            t = Math.min(...bs.map((b) => b.top)),
            btm = Math.max(...bs.map((b) => b.bottom));
          return [(l + r) / 2, (t + btm) / 2];
        };
        return {
          wrapH: rect(document.querySelector('.mark'))?.height ?? 0,
          drawH: rect(document.querySelector('.mark > svg.is-mark'))?.height ?? -1,
          ray: center([...document.querySelectorAll('.mark > svg.is-mark path[data-key="A1"]')]),
          hit: center([...document.querySelectorAll('.mark-hit g[data-key="A1"] .hit')]),
        };
      });
      expect(Math.abs(r.wrapH - r.drawH), `${route}: box height vs drawing`).toBeLessThan(1.5);
      expect(r.ray && r.hit, route).toBeTruthy();
      if (!r.ray || !r.hit) return;
      expect(Math.hypot(r.ray[0] - r.hit[0], r.ray[1] - r.hit[1]), `${route}: hit stroke off the ray`).toBeLessThan(4);
    }
  });
}

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
