import { defineConfig, devices } from '@playwright/test'

import {
  liveBackendWebServer,
  liveProductionWebServer,
} from './tests/e2e/support/live-servers'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['quality-convergence.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [liveBackendWebServer, liveProductionWebServer],
})
