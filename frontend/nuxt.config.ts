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

const apiBase =
  process.env.NUXT_API_BASE ??
  process.env.NUXT_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1'

const localApiOrigin = /^https?:\/\//.test(apiBase)
  ? new URL(apiBase).origin
  : null

export default defineNuxtConfig({
  // The fixture E2E server needs its own Nuxt dev lock and generated files.
  buildDir: process.env.NUXT_E2E_BUILD_DIR ?? '.nuxt',
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
    },
  },
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@vueuse/nuxt', 'motion-v/nuxt'],
  telemetry: false,
  routeRules:
    localApiOrigin && process.env.NODE_ENV !== 'production'
      ? { '/uploads/**': { proxy: `${localApiOrigin}/uploads/**` } }
      : {},
  runtimeConfig: {
    apiBase,
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000/api/v1',
      siteUrl: process.env.PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000',
    },
  },
  typescript: {
    strict: true,
    // Dedicated browser tests run static type checking separately.
    typeCheck: process.env.NUXT_E2E_DISABLE_TYPECHECK === 'true' ? false : true,
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
