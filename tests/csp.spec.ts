// Phase 6: every page runs under the production Content Security Policy from vercel.json with zero
// violations, motion and WebGL included. The preview server sends no headers, so the test adds them.
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { routes } from './routes';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const csp =
  vercel.headers
    .find((h) => h.source === '/(.*)')
    ?.headers.find((h) => h.key === 'Content-Security-Policy')
    ?.value // upgrade-insecure-requests would turn the local http requests into https ones
    .replace(/;\s*upgrade-insecure-requests/, '') ?? '';

const underCsp = async (page: Page): Promise<string[]> => {
  const violations: string[] = [];
  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
  });
  await page.exposeFunction('__cspViolation', (v: string) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __cspViolation: (v: string) => void }).__cspViolation(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
  });
  return violations;
};

test('the CSP from vercel.json is the one under test', () => {
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("style-src 'self'");
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
});

for (const route of routes()) {
  test(`no CSP violations ${route}`, async ({ page }) => {
    const violations = await underCsp(page);
    await page.goto(route, { waitUntil: 'load' });
    await page.mouse.move(300, 300); // wakes the WebGL hero on the home pages
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(route === '/' || route === '/pt' ? 2500 : 600);
    expect(violations).toEqual([]);
  });
}
