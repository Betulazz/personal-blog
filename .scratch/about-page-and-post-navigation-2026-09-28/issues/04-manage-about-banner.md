# 04: Manage the About banner Media Asset

**What to build:** Let an Administrator choose one uploaded About banner and its crop focal point, with a reliable public fallback and protected media reference.

**Blocked by:** 02: Edit About story and timeline.

**Status:** ready-for-human

- [x] In the About Page Content workspace, an Administrator can upload or reuse one image from the existing media library, replace it, adjust one focal position with representative desktop/mobile previews, and clear the selection. No arbitrary external-image URL or rotation control is added.
- [x] The normal public About page displays the selected image with a readable overlay and responsive crop. No selection, a legacy record, or image loading failure displays the selected design's gradient fallback.
- [x] Saving and reloading preserves the image reference and focal position without changing unrelated About content. Upload, validation, and save failures keep the draft recoverable with actionable feedback.
- [x] Media management identifies the About banner as an active reference and blocks deletion of its asset until the banner is cleared or replaced; an unreferenced asset remains deletable under the existing rules.
- [ ] Authenticated upload/select/clear/delete-protection flows and desktop/mobile public rendering are checked; actual outcomes, relevant checks, and remaining limitations are recorded before resolution.

## Comments

### 2026-09-29 — Implementation and acceptance evidence

- Dependency check before implementation: ticket 02 is `resolved`; its blocker ticket 01 is also `resolved`. The About prototype was not present in the working tree or at HEAD; the normal About page is the selected Variant A.
- Added a Media Asset-backed banner URL and bounded focal point to About settings, validation that accepts only an existing image asset, deletion-reference protection, public rendering with responsive crop/readable overlay/gradient fallback, and admin reuse/upload/replace/clear controls with shared desktop/mobile focal previews.
- Mock checks passed: `npm run lint`, `npm run typecheck`, `npm run test:e2e -- tests/e2e/admin-about-banner.spec.ts` (2 passed: Chromium and mobile-chromium), and `npm exec prettier -- --check app/api/client.ts app/components/admin/AdminAboutPageEditor.vue app/components/admin/AdminMediaPicker.vue app/components/portfolio/AboutView.vue app/composables/usePublicSiteSettings.ts app/types/admin-portfolio.ts app/types/portfolio.ts app/types/site.ts app/utils/admin-media.ts tests/e2e/admin-about-banner.spec.ts tests/e2e/mock-api.mjs`. E2E covers reuse/upload/replace, invalid file validation, upload failure and retry, focal-point save/reload while preserving an existing story paragraph, save failure and retry, public image/failure fallback, clearing, and media deletion protection.
- Backend checks passed: `.venv\Scripts\python.exe -m pytest tests\test_about_page_settings_schema.py` (10 passed) and `.venv\Scripts\python.exe -m ruff check app\repositories\media.py app\schemas\portfolio.py app\services\portfolio.py tests\test_about_page_settings_schema.py`.
- Mock browser/API configuration: Nuxt site `http://127.0.0.1:3103`; mock API `http://127.0.0.1:8787/api/v1`. Playwright config sets both `NUXT_API_BASE` and `NUXT_PUBLIC_API_BASE` to the mock API, so browser and SSR requests use mock data. Viewports: desktop 1440×900, mobile 430×932.
- Mock screenshots are outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\29\01a0eba2-754f-7593-91c2-4e30d3d1edc2\about-banner-ticket-04\`: `mock-chromium-admin-selected-1440x900.png`, `mock-chromium-media-reference-blocked-1440x900.png`, `mock-chromium-public-load-fallback-1440x900.png`, `mock-chromium-public-selected-1440x900.png`, and corresponding `mock-mobile-chromium-...-430x932.png` files for all four states.
- Real Chrome check used site port 3000 with the project API at port 8000 and no mock routes. The public `/about` page loaded current API-backed content. The real API's `/api/v1/auth/me` returned 401; although the editor shell rendered a cached `admin` label, a valid authenticated Administrator session could not be established. The API process also predates this source change and its settings response has no banner fields. No real settings or media data were changed, so restoration was not needed. Real authenticated save/reload/public-banner verification is not passed.
- `git diff --check` reports only the pre-existing trailing whitespace at `CONTEXT.md:48`; that user-modified file remains out of scope and untouched by this ticket.

Remaining limitation: rerun the real authenticated workflow after a valid real Administrator session is available and the port-8000 API is running this version of the backend. Keep this ticket unresolved until that live save/reload, public rendering, desktop/mobile check, and any required data restoration pass.
