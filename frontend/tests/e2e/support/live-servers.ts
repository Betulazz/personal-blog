const backendPython =
  process.platform === 'win32'
    ? '.venv\\Scripts\\python.exe'
    : './.venv/bin/python'

const liveBackendEnv = {
  LIVE_ACCEPTANCE_ADMIN_EMAIL: 'owner@example.com',
  LIVE_ACCEPTANCE_ADMIN_PASSWORD: 'a sufficiently long password',
  LIVE_ACCEPTANCE_ADMIN_USERNAME: 'owner',
}

const liveFrontendEnv = {
  NUXT_API_BASE: 'http://127.0.0.1:8000/api/v1',
  NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:8000/api/v1',
  PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
}

export const liveBackendWebServer = {
  command: `${backendPython} -m app.cli serve-live --host 127.0.0.1 --port 8000`,
  cwd: '../backend',
  env: liveBackendEnv,
  reuseExistingServer: false,
  timeout: 120_000,
  url: 'http://127.0.0.1:8000/api/v1/health/live',
}

export const liveDevWebServer = {
  command: 'npm run dev -- --host 127.0.0.1',
  env: liveFrontendEnv,
  reuseExistingServer: false,
  timeout: 300_000,
  url: 'http://127.0.0.1:3000',
}

export const liveProductionWebServer = {
  command: 'npm run build && node .output/server/index.mjs',
  env: {
    ...liveFrontendEnv,
    HOST: '127.0.0.1',
    NITRO_PORT: '3000',
    PORT: '3000',
  },
  reuseExistingServer: false,
  timeout: 420_000,
  url: 'http://127.0.0.1:3000',
}
