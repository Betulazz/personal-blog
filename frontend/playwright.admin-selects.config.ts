import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'admin-shared-selects.spec.ts',
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  workers: 1,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node tests/e2e/mock-api.mjs',
      env: { MOCK_API_ORIGIN: 'http://127.0.0.1:3100' },
      reuseExistingServer: false,
      timeout: 120_000,
      url: 'http://127.0.0.1:8787/health',
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 3100',
      env: {
        NUXT_E2E_DISABLE_TYPECHECK: 'true',
        NUXT_API_BASE: 'http://127.0.0.1:8787/api/v1',
        NUXT_DESIGN_SYSTEM_FIXTURES: 'true',
        NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:8787/api/v1',
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: 'http://127.0.0.1:3100',
      stdout: 'ignore',
    },
  ],
})
