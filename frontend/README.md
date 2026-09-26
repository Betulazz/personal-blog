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

The live acceptance run starts native FastAPI against MySQL, explicitly
upgrades the schema to `0016_background_gallery`, seeds the public acceptance
records, creates a local-only acceptance Administrator, and starts Nuxt against
that API. It does not use the browser fixture API or call NetEase. Point
`DATABASE_URL` at a dedicated database ending in `_test` before running it;
`serve-live` upgrades and writes to that database. Never point this command at
development or production data:

```powershell
$env:DATABASE_URL = "mysql+asyncmy://blog:<local-password>@127.0.0.1:3306/personal_blog_test?charset=utf8mb4"
npm run test:e2e:live
Remove-Item Env:DATABASE_URL
```

The command writes ignored viewport and full-page screenshots under
`frontend/test-results/live-public-acceptance/`.

## Production polish acceptance

`npm run test:e2e:polish` builds and exercises the production Nuxt bundle in
Chromium desktop and Pixel 7 projects against the local mocked API. It covers
public pages, administrator workflows, responsive overflow, accessibility
interactions, and music synchronization. The screenshot matrix runs once and
captures viewport plus full-page screenshots at 375×812, 430×932, 768×1024,
1024×768, 1440×900, and 1920×1080. Supply `POLISH_ACCEPTANCE_EVIDENCE` and
`POLISH_ACCEPTANCE_RESULTS` for its output directories; the design-system and
Timeline/Music screenshot workflows use `DESIGN_SYSTEM_EVIDENCE_DIR` and
`VISUAL_REFINEMENT_EVIDENCE`.

The 2026-09-26 integrated run and evidence links are in
[`docs/deployment.md`](../docs/deployment.md#v2-polish-integrated-acceptance-record-2026-09-26).
The [fidelity ledger](../docs/personal-blog-v2-polish-fidelity-ledger.md)
compares accepted reference captures with the latest production screenshots.

The native browser run verifies the Nuxt → FastAPI → MySQL workflow. Provider
contract tests use mocked NetEase responses; a separate anonymous endpoint
smoke check is needed to report current metadata, lyric, and playback redirect
behavior. It does not represent QR account authorization or paid playback
entitlement.
