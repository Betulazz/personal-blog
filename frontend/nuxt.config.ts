import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'

const displayPrimitivesFixture = fileURLToPath(
  new URL('./tests/fixtures/DisplayPrimitivesPage.vue', import.meta.url),
)
const interactionPrimitivesFixture = fileURLToPath(
  new URL('./tests/fixtures/InteractionPrimitivesPage.vue', import.meta.url),
)
const unexpectedErrorFixture = fileURLToPath(
  new URL('./tests/fixtures/UnexpectedErrorPage.vue', import.meta.url),
)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@vueuse/nuxt', 'motion-v/nuxt'],
  telemetry: false,
  runtimeConfig: {
    apiBase:
      process.env.NUXT_API_BASE ??
      process.env.NUXT_PUBLIC_API_BASE ??
      'http://127.0.0.1:8000/api/v1',
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000/api/v1',
      siteUrl: process.env.PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000',
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  hooks:
    process.env.NUXT_DESIGN_SYSTEM_FIXTURES === 'true'
      ? {
          'pages:extend'(pages) {
            pages.push({
              file: displayPrimitivesFixture,
              name: 'display-primitives-acceptance',
              path: '/__acceptance/display-primitives',
            })
            pages.push({
              file: interactionPrimitivesFixture,
              name: 'interaction-primitives-acceptance',
              path: '/__acceptance/interaction-primitives',
            })
            pages.push({
              file: unexpectedErrorFixture,
              name: 'unexpected-error-acceptance',
              path: '/__acceptance/unexpected-error',
            })
          },
        }
      : {},
})
