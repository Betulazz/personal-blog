# 27: Admin Project, Friend Link, and Site Identity management

**What to build:** Let the Administrator maintain the portfolio, curated Friend Links, and the public Site Identity without editing source code.

**Blocked by:** 18: Project, Friend Link, and Site Identity API; 24: Admin login, shell, and dashboard.

**Status:** completed

- [x] Project management supports status, stack, dates, featured ordering, source/demo links, media, validation, and deletion confirmation.
- [x] Friend Link management supports content, ordering, active state, safe destination validation, and honest presentation settings.
- [x] Site Identity management covers identity, avatar/favicon, descriptions, SEO defaults, footer, contact, social links, and homepage section visibility.
- [x] Preview or clear feedback shows how configuration affects the public presentation where practical.
- [x] Failed validation/session/server operations preserve recoverable form input and expose safe actionable errors.
- [x] HTTP/Playwright flows, keyboard/mobile checks, lint, types, and diff review pass.

## Comments

### 2026-09-22

- Added protected Project and Friend Link administration routes, responsive lists/editors, status/order/media/link validation, explicit deletion confirmation, and safe public-preview cards.
- Added a complete Site Identity editor for identity, media, SEO, footer, contact, social links, homepage visibility, and a live public presentation preview.
- Added typed client mappings, targeted mutation cache invalidation, recoverable memory-only drafts, native mock API coverage, and desktop/mobile Playwright workflows including controlled failure and console checks.
- Verification: the focused portfolio/identity suite passed 8 tests (7 passed, 1 intentional mobile matrix skip) across Chromium and mobile Chromium; the full frontend E2E suite passed 127 tests with 3 intentional skips, frontend unit tests passed 44 tests, backend tests passed 46 tests, and the production build, typecheck, lint, and formatting checks passed. The two-axis review found no hard findings.
