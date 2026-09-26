import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'visual-refinement.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium-production', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node tests/e2e/mock-api.mjs',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:8787/health',
    },
    {
      command: 'npm run build && node .output/server/index.mjs',
      env: {
        HOST: '127.0.0.1',
        NUXT_API_BASE: 'http://127.0.0.1:8787/api/v1',
        NUXT_DESIGN_SYSTEM_FIXTURES: 'true',
        NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:8787/api/v1',
        NITRO_PORT: '3000',
        PORT: '3000',
        PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 420_000,
      url: 'http://127.0.0.1:3000',
    },
  ],
})
