import { defineConfig, devices } from '@playwright/test'

const backendPython =
  process.platform === 'win32'
    ? '.venv\\Scripts\\python.exe'
    : './.venv/bin/python'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'live-public-acceptance.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: `${backendPython} -m app.cli serve-live --host 127.0.0.1 --port 8000`,
      cwd: '../backend',
      reuseExistingServer: false,
      timeout: 120_000,
      url: 'http://127.0.0.1:8000/api/v1/health/live',
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      env: {
        NUXT_API_BASE: 'http://127.0.0.1:8000/api/v1',
        NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:8000/api/v1',
        PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: 'http://127.0.0.1:3000',
    },
  ],
})
