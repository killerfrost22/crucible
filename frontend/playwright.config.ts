import { defineConfig, devices } from '@playwright/test'

// Browser smoke tests (e2e/). The site is built against a fake API origin that the tests answer themselves
// (e2e/fixtures.ts), into its own folder so dist/ is left alone, and served by `vite preview` on port 4180.
const OUT = 'node_modules/.e2e-dist'
const PORT = 4180

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Reveal and arrival animations off: every check sees settled layout and final colours.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build --outDir ${OUT} --emptyOutDir --logLevel warn && npx vite preview --outDir ${OUT} --port ${PORT} --strictPort`,
    env: { VITE_API_BASE: 'http://api.test' },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
