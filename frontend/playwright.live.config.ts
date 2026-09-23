import { defineConfig, devices } from '@playwright/test'

import {
  liveBackendWebServer,
  liveDevWebServer,
} from './tests/e2e/support/live-servers'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'live-public-acceptance.spec.ts',
    'live-admin-acceptance.spec.ts',
    'live-admin-workflow-acceptance.spec.ts',
  ],
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
  webServer: [liveBackendWebServer, liveDevWebServer],
})
