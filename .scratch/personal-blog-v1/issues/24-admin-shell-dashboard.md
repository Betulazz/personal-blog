# 24: Admin login, shell, and dashboard

**What to build:** Give the Administrator a secure, responsive entry point and application shell with useful site status while preserving work through normal access-token refresh.

**Blocked by:** 23: Live public-site acceptance.

**Status:** completed

- [x] Login presents accessible validation and safe invalid-credential/server-error feedback without exposing authentication details.
- [x] Protected routes distinguish unauthenticated, expired-but-refreshable, forbidden, loading, and backend-unavailable states.
- [x] Refresh and logout use the cookie session contract; authentication material is never stored in localStorage.
- [x] The responsive Admin shell has keyboard-usable navigation, focus management, mobile behavior, and clear public-site escape routes.
- [x] Dashboard exposes useful content counts and recent activity without speculative analytics infrastructure.
- [x] HTTP/Playwright tests, fixed-view browser checks, console review, lint, types, secret scan, and diff review pass.

## Comments

- 2026-09-21: Added the cookie-based Administrator login flow, protected admin layout with explicit loading/refreshable/forbidden/unavailable states, responsive shell navigation, public-site escape routes, and the Dashboard counts/recent-activity API and UI. Future admin sections retain intentional placeholder routes.
- 2026-09-21 verification: backend pytest — 44 passed; frontend unit — 43 passed; `npm run test:e2e` — 108 passed, 2 skipped; frontend typecheck, lint, Prettier, backend Ruff/format/mypy, and production build passed. The focused admin suite passed 10 tests across Chromium and mobile Chromium.
- 2026-09-21 browser/review: fixed desktop and 430px mobile Playwright checks passed with clean page console logs; login, refresh after expired access, invalid/server feedback, keyboard focus, Escape, logout, forbidden/unavailable recovery, and empty localStorage were verified. Standards/spec review found no actionable findings.
