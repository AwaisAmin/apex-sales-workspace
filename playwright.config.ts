import { defineConfig, devices } from '@playwright/test'

/*
 * E2E runs against the production build (vite preview), not the dev server, so the
 * code under test is what ships. The mock API (MSW) is part of that build.
 *
 * Browser: the locally installed Google Chrome by default (no extra download).
 * Without Chrome: `npx playwright install chromium` and run with PW_CHANNEL=chromium.
 */
const PORT = 4173
const channel = process.env.PW_CHANNEL === 'chromium' ? undefined : (process.env.PW_CHANNEL ?? 'chrome')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0, // a flaky E2E should fail loudly, not be retried into green
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
