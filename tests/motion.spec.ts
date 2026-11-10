import { test, expect, type Page } from '@playwright/test';

const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
};

const scrollThrough = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
};

// Reduced-motion path: content is fully visible, nothing animates, no WebGL, no covers, no errors.
test('home under prefers-reduced-motion', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForTimeout(1500);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
  await expect(page.locator('canvas.sigil-gl')).toHaveCount(0);
  await expect(page.locator('.rv-cover')).toHaveCount(0);
  await expect(page.locator('svg.tp-sigil')).toBeVisible();
  expect(errors).toEqual([]);
});

// WebGL path: the canvas mounts after load, the metal completes, the SVG stays in the DOM under it.
test('hero renders through WebGL after load', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/', { waitUntil: 'load' });
  // the hero waits for a first move (or 5 s of quiet), so its context setup never lands in the load window
  await expect(page.locator('canvas.sigil-gl')).toHaveCount(0);
  await page.mouse.move(300, 300);
  await page.mouse.move(700, 400);
  await expect(page.locator('html[data-sigil-gl="on"]')).toHaveCount(1, { timeout: 15_000 });
  const canvas = page.locator('canvas.sigil-gl');
  await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('svg.tp-sigil')).toHaveCount(1);
  expect(errors).toEqual([]);
});

// Case covers use the same renderer on the case's own sigil.
test('case cover renders through WebGL after load', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/work/whatsapp-assistant', { waitUntil: 'load' });
  await page.mouse.move(300, 300);
  await page.mouse.move(900, 400);
  await expect(page.locator('html[data-sigil-gl="on"]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('.head-sigil canvas.sigil-gl')).toHaveCount(1);
  await expect(page.locator('.head-sigil svg[data-gl]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

// No WebGL2: the SVG sigil is the hero, visible, and nothing breaks.
test('hero keeps the SVG sigil without WebGL2', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error test override
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      if (type === 'webgl2') return null;
      return orig.call(this, type, ...rest);
    };
  });
  await page.goto('/');
  await page.waitForTimeout(3000);
  await expect(page.locator('html[data-sigil-gl]')).toHaveCount(0);
  await expect(page.locator('canvas.sigil-gl')).toHaveCount(0);
  await expect(page.locator('svg.tp-sigil')).toBeVisible();
  expect(errors).toEqual([]);
});

// no plain drawing before the metal. While the WebGL mark is pending its SVG is hidden, and
// it shows only as the fallback (here: under reduced motion, above).
test('the mark shows only as the metal, never as a drawing first', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html.gl-pending')).toHaveCount(1);
  await expect(page.locator('svg.tp-sigil')).toBeHidden();
  await page.mouse.move(300, 300);
  await page.mouse.move(700, 400);
  await expect(page.locator('html[data-sigil-gl="on"]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('svg.tp-sigil')).toBeHidden(); // the metal stands in for it
  expect(errors).toEqual([]);
});

// The mark is the record's index: pointing at a ray names its track, the case cover lights its own rays.
test('pointing at a ray names its track', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/', { waitUntil: 'load' });
  const pt = await page.evaluate(() => {
    const p = document.querySelector<SVGPathElement>('.mark-hit g[data-key="A2"] .hit:last-child');
    if (!p) return null;
    const q = p.getPointAtLength(p.getTotalLength() * 0.6);
    const m = p.getScreenCTM();
    return m ? { x: q.x * m.a + q.y * m.c + m.e, y: q.x * m.b + q.y * m.d + m.f } : null;
  });
  expect(pt).not.toBeNull();
  await page.mouse.move(pt!.x, pt!.y, { steps: 4 });
  await expect(page.locator('.mark-tip.on')).toContainText('A2');
  await expect(page.locator('svg.is-mark path.on[data-key="A2"]').first()).toBeAttached();
  await page.goto('/work/whatsapp-assistant');
  expect(await page.locator('svg.is-mark path.here').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

// Reveals: nothing in the first screen is ever covered, and every cover is gone after a scroll through.
for (const route of ['/', '/work/whatsapp-assistant', '/about', '/pt/work/pulse-sync-site']) {
  test(`reveals finish and never cover the first screen ${route}`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(route, { waitUntil: 'load' });
    const coveredInView = await page.evaluate(
      () =>
        [...document.querySelectorAll('.rv-cover')].filter((c) => (c.parentElement?.getBoundingClientRect().top ?? 1e9) < innerHeight)
          .length + [...document.querySelectorAll('.rv-fade')].filter((e) => e.getBoundingClientRect().top < innerHeight).length,
    );
    expect(coveredInView).toBe(0);
    await scrollThrough(page);
    await page.waitForTimeout(1600);
    await expect(page.locator('.rv-cover')).toHaveCount(0);
    await expect(page.locator('.rv-fade')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
