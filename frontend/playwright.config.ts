import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/live-public-acceptance.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  expect: {
    timeout: 15_000,
  },
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
      command: 'node tests/e2e/mock-api.mjs',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:8787/health',
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      env: {
        NUXT_API_BASE: 'http://127.0.0.1:8787/api/v1',
        NUXT_DESIGN_SYSTEM_FIXTURES: 'true',
        NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:8787/api/v1',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:3000',
    },
  ],
})
