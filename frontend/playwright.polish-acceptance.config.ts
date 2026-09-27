import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir:
    process.env.POLISH_ACCEPTANCE_RESULTS ?? './test-results/polish-acceptance',
  testMatch: [
    'admin-post-authoring.spec.ts',
    'admin-markdown-editor.spec.ts',
    'admin-post-taxonomy.spec.ts',
    'admin-project-variants.spec.ts',
    'admin-portfolio-identity.spec.ts',
    'admin-shared-selects.spec.ts',
    'admin-shell.spec.ts',
    'background-gallery.spec.ts',
    'design-system.spec.ts',
    'home-profile-music.spec.ts',
    'display-primitives.spec.ts',
    'interaction-primitives.spec.ts',
    'music-player.spec.ts',
    'polish-acceptance.spec.ts',
    'projects-variant-switch.spec.ts',
    'public-header-scroll.spec.ts',
    'visual-refinement.spec.ts',
  ],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'line',
  workers: 1,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:3102',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium-production', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium-production', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node tests/e2e/mock-api.mjs',
      env: { MOCK_API_ORIGIN: 'http://127.0.0.1:3102' },
      reuseExistingServer:
        process.env.POLISH_ACCEPTANCE_REUSE_SERVERS === 'true',
      timeout: 120_000,
      url: 'http://127.0.0.1:8787/health',
    },
    {
      command: 'npm run build && node .output/server/index.mjs',
      env: {
        HOST: '127.0.0.1',
        NUXT_E2E_DISABLE_TYPECHECK: 'true',
        NUXT_API_BASE: 'http://127.0.0.1:8787/api/v1',
        NUXT_DESIGN_SYSTEM_FIXTURES: 'true',
        NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:8787/api/v1',
        NITRO_PORT: '3102',
        PORT: '3102',
        PUBLIC_SITE_URL: 'http://127.0.0.1:3102',
      },
      reuseExistingServer:
        process.env.POLISH_ACCEPTANCE_REUSE_SERVERS === 'true',
      timeout: 900_000,
      url: 'http://127.0.0.1:3102',
    },
  ],
})
