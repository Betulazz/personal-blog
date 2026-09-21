# 25: Admin Post, Category, and Tag management

**What to build:** Let the Administrator manage the complete Post editorial lifecycle and normalized taxonomy through resilient administration screens.

**Blocked by:** 16: Post, Category, and Tag lifecycle API; 24: Admin login, shell, and dashboard.

**Status:** completed

- [x] Post collection supports useful search, filters, pagination, publication state, and clear empty/loading/error states.
- [x] Create/edit supports title, slug, summary, canonical Markdown, Category, Tags, cover/media references, SEO fields, and validation.
- [x] Preview, publish, unpublish, and delete workflows explain conflicts and invalid transitions with safe confirmation.
- [x] Category and Tag management preserves uniqueness and communicates references before destructive actions.
- [x] Failed validation, expired sessions, and server errors do not silently discard editable form state.
- [x] HTTP/Playwright tests cover a basic create-edit-publish flow; accessibility, responsive checks, lint, types, and diff review pass.

## Comments

- Implemented the admin Post collection/editor lifecycle, taxonomy management screens, resilient API client contracts, and per-Post SEO persistence with migration `0011_post_seo_fields`.
- Added a Tiptap Markdown editor with canonical Markdown round-trip fixtures for math, public SEO metadata consumption, backend HTTP coverage for SEO fields and category/tag filters, plus Playwright coverage for create-edit-preview-publish-unpublish, taxonomy references/conflicts, mobile navigation, focus, all six required viewports across collection/editor/taxonomy pages, full-page screenshots, horizontal overflow, validation/server/not-found recovery states.
- Added an opt-in native live acceptance Administrator seed and real Nuxt → FastAPI → MySQL Post CRUD browser flow; ordinary live startup remains unchanged when the acceptance credentials are absent.
- Verification completed on 2026-09-21: backend `46 passed`; frontend unit `44 passed`; mock Playwright E2E `116 passed, 2 skipped`; native live Playwright `12 passed`; lint, typecheck, Prettier, production build, Ruff, mypy, and Alembic checks passed.
- Browser plugin was unavailable in this environment, so browser verification used the repository's Playwright fallback with Chromium desktop/mobile projects. Standards/spec review findings were addressed; the issue retains the repository's existing `completed` status convention used by adjacent finished tickets.
