# Frontend

Nuxt 4 SSR frontend for the personal blog.

## Setup

```bash
npm install
```

## Development server

Start the application on `http://127.0.0.1:3000`:

```bash
npm run dev -- --host 127.0.0.1
```

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

## Native live acceptance

The live public acceptance run starts the native FastAPI process, explicitly
upgrades the local MySQL schema, seeds only the public acceptance content, and
then starts Nuxt against that API. It does not create an Administrator or use
the browser fixture API:

```powershell
npm run test:e2e:live
```

The command writes ignored viewport and full-page screenshots under
`frontend/test-results/live-public-acceptance/`.
