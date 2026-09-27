# 05: Put both current backgrounds in the gallery and rotate every ten seconds

Type: task
Status: resolved
Blocked by: None

## What to build

Use the existing Background Gallery for both currently used images. Import root `bg.jpeg` as a managed Media Asset, append it after the existing live gallery image, and change the shared rotation interval from 30 to 10 seconds.

## Acceptance criteria

- [x] The current installation has two ordered Background Gallery entries: the existing entry first and a managed Media Asset derived from `bg.jpeg` second. Both can be previewed, reordered, removed, saved, and reloaded in Site Identity administration. Do not impose a two-image limit.
- [x] The import/update is idempotent and preserves existing gallery entries, order, other settings, original `bg.jpeg`, and bundled fallback derivatives. Failed imports do not create dangling gallery references. Media reference protection applies to the newly imported asset.
- [x] Public rotation advances at 10-second intervals with the existing approximately 1.2-second crossfade, across routes and without creating a second rotator. It pauses while hidden, stays on the first image under reduced motion, and handles failed/empty/unavailable gallery images using the existing fallback behavior.
- [x] Backend contract coverage verifies Media Asset/gallery persistence, safe reference validation, idempotence, and preservation of Site Identity data. Controlled-clock Playwright verifies the 10-second boundary, both images, route continuity, hidden-page pause, reduced motion, and fallback.
- [x] Live installation verification confirms the actual two gallery entries and shows screenshot evidence of each background. Mock-only tests are not presented as proof of the live import.

## Starting points

`bg.jpeg`, `frontend/app/components/visual/AmbientBackground.vue`, `frontend/app/components/admin/AdminSiteSettingsEditor.vue`, `backend/app/api/v1/routes/portfolio.py`, `backend/tests/test_background_gallery_contract.py`, `frontend/tests/e2e/background-gallery.spec.ts`. Earlier polish issue 05 documents the current 30-second contract; this issue intentionally replaces only that interval.

## Comments

### 2026-09-27 implementation and verification record

- Added `python -m app.cli import-background`. It imports repository-root `bg.jpeg` as a content-addressed Media Asset, validates the image bytes, appends its reference to the latest locked Site Identity gallery, and preserves the existing order and other settings. The first run added one asset and a second run reported `Already present`; the live gallery stayed at two entries with its existing image first. The imported asset is protected by the gallery reference check.
- Backend: focused Ruff and format checks passed; `uv run mypy app` passed for 81 source files; the Media Asset and Background Gallery contract suite passed (31 passed, 1 skipped on Windows because POSIX permission bits are unavailable). The importer contract test covers idempotence, failed-image handling, existing-entry order, Site Identity preservation, stored bytes, and reference protection.
- Frontend: `npm run typecheck`, focused ESLint, focused Prettier, and `npm run build` passed. The production build emitted dependency deprecation and plugin-timing warnings but completed successfully.
- Playwright mock acceptance: `npm run test:e2e -- tests/e2e/background-gallery.spec.ts --project=chromium --project=mobile-chromium --reporter=line` passed all 12 tests, including the 9,999/10,000 ms boundary, route continuity, hidden-page pause/resume, reduced motion, fallback, and administrator preview/reorder/remove/save/reload. The first full run had one transient desktop `ERR_CONNECTION_CLOSED`; the focused rerun and subsequent full run passed.
- Live installation: `/api/v1/settings` returned HTTP 200 with the existing gallery item first and the managed `bg.jpeg` asset second. Playwright rendered both images at 1440×900 and 430×932; page identity and main content were present, no framework overlay, console error, page error, or failed request was observed. Four viewport screenshots are saved outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\27\01a0e1c5-0985-7783-90f9-9741c7d48af6\background-gallery-ticket-05`.
- SHA-256 checks confirmed the source `bg.jpeg` and the existing responsive fallback derivatives are unchanged; the managed file is byte-for-byte identical to `bg.jpeg`.
