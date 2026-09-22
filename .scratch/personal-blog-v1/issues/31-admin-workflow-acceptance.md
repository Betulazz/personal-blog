# 31: Admin workflow end-to-end acceptance

**What to build:** Prove all administration workflows work together through the rendered application and native local backend/database before animation and final quality work.

**Blocked by:** 26: Admin Moment and Chatter management; 27: Admin Project, Friend Link, and Site Identity management; 28: Admin Music Track management; 29: Admin Media Asset management; 30: Tiptap Markdown-first editor.

**Status:** completed

- [x] Playwright covers login, refresh recovery, logout, Post creation/edit/publish, Markdown preservation, and public visibility.
- [x] Representative Moment, Chatter, Project, Friend Link, Site Identity, Music Track, and Media Asset changes reach their public consumers.
- [x] Validation, unauthorized, expired session, conflict, missing record, upload failure, and backend error recovery are exercised.
- [x] Keyboard navigation, focus, dialogs/sheets, touch targets, mobile layout, and unsaved-form behavior pass review.
- [x] Tests run against native local Node, Python, and MySQL services without Docker.
- [x] Console/network review, frontend/backend suites, production builds, secret scan, cleanup, and diff review pass.

## Comments

### 2026-09-23

- Added `frontend/tests/e2e/live-admin-workflow-acceptance.spec.ts` (8 tests run on chromium and mobile-chromium) against native Nuxt dev, `app.cli serve-live`, and MySQL:
  - **Session lifecycle:** proves `access_token`/`refresh_token` are HttpOnly and web storage holds no credentials; tampering the access cookie recovers through `/auth/refresh` (verified by cookie rotation) without leaving `/admin/posts`; logout clears both cookies, redirects to login, preserves the intended destination, and the unauthenticated API envelope is `401 authentication_required`.
  - **Post lifecycle:** inline validation, slug pattern rejection, live `post_slug_conflict` recovery, publish-without-category rejection, edit + publish + public `/posts/{slug}` and `/posts` visibility, unpublish hides it publicly, delete removes it, and a missing record shows `没有找到这篇文章`.
  - **Expired session:** clearing both cookies during unsaved edits redirects to login; re-login plus reopening the editor offers `发现未保存的草稿`, and `恢复草稿` restores the title before the draft is discarded.
  - **Markdown preservation:** a Post created with canonical Markdown through the live API loads into Tiptap, survives an editor save (stored body keeps `##`, fenced code, quote, table, emoji, `$x^2$`), publishes, and renders publicly as a heading, `pre`, `blockquote`, `table`, and KaTeX.
  - **Public consumers:** Moment and Chatter drafts stay invisible until published, then appear in their feeds and are deleted independently; Project (with uploaded logo), Friend Link visibility toggle, Site Identity tagline, and Music Track reorder/enable/disable all reach `/projects`, `/`, `/friends`, and the public music player; media deletion is blocked while a Project references it and succeeds once the reference is removed.
  - **Failure and review:** a failed admin list request shows the recoverable error state and `重新加载` recovers; spoofed image uploads are rejected without losing the page; the leave guard traps focus and Escape returns to the editor; the mobile sheet restores focus and exposes ≥44px nav targets; the skip link focuses `#admin-main`; admin routes hold layout at 375/430/768/1024/1440/1920 with 40px+ toolbar targets; console, pageerror, request-failure, and ≥400-response review is clean apart from the seeded intentionally-missing media paths.
- Registered the spec in `playwright.live.config.ts` and excluded it from the mock suite in `playwright.config.ts`.
- Console review surfaced a deprecated `next()` route-leave guard in `AdminPostEditor.vue`; migrated it to the return-value style with unchanged behavior.
- Verification: live Playwright **30 passed** (3 specs × 2 projects); mocked Playwright **171 passed / 5 intentional skips**; frontend **110 unit tests**; backend **49 pytest** plus Ruff, Ruff format, and Mypy clean; ESLint, Prettier, Nuxt typecheck, and the production build clean; secret-pattern scan and `git diff --check` clean; seeded live data restored (tagline, posts, moments, chatter, projects, friends, music) and every test-created record, media row, and stored file removed; viewport and full-page screenshots reviewed at 375/430/1440.
- Two-axis code review findings addressed: admin viewport matrix extended to all six required widths, toolbar touch targets measured, console filter tightened to the exact seeded missing-media paths, music reorder loop made row-count robust, native expired-session draft recovery added, KaTeX rendering asserted, and the API creation helper given a typed payload. Remaining judgement calls (per-spec login/problem helpers and repeated dialog sequences) follow existing live-spec precedent.
