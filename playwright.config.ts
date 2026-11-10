import { defineConfig } from '@playwright/test';

// Playwright's bundled Chromium fails to spawn on this machine (spawn UNKNOWN), so tests run on
// the system Microsoft Edge. Tests read the built site from dist/ and serve it with `astro preview`.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4321', channel: 'msedge' },
  projects: [{ name: 'edge', use: { channel: 'msedge' } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
