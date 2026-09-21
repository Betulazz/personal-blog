# 22: Remaining public-content API integration

**What to build:** Replace the remaining public fixtures with live Moment, Chatter, Project, Friend Link, About, Site Identity, and Media Asset data while retaining approved domain boundaries and UI states.

**Blocked by:** 17: Moment and Chatter lifecycle API; 18: Project, Friend Link, and Site Identity API; 20: Media Asset local-storage lifecycle.

**Status:** completed

- [x] Moment and Chatter pages consume their distinct live contracts with correct pagination, filtering, optional fields, and media.
- [x] Project, Friend Link, About, footer, social, and identity surfaces consume live configuration and ordering.
- [x] Media URLs and missing/deleted asset behavior resolve through the storage contract rather than hard-coded paths.
- [x] SSR and client navigation avoid duplicate reads and stale cross-route state.
- [x] Loading, empty, not-found, validation, network, and server-error states remain complete and safe.
- [x] Fixtures are removed cleanly; HTTP/browser tests, fixed-view screenshots, console review, lint, types, and diff review pass.

## Comments

- 2026-09-21: Integrated live Moment, Chatter, Project, Friend Link, About, Site Identity, and Media Asset contracts; added structured About settings migration `0010_site_settings_about` and removed frontend content fixtures.
- 2026-09-21: Added accessible feed pagination and storage-aware media resolution for images, avatars, Open Graph assets, and music sources; verified SSR/client navigation and recovery states.
- 2026-09-21: Backend: 44 passed; frontend unit: 43 passed; full Playwright browser suite: 98 passed, 2 skipped; lint, formatting, typecheck, mypy, Ruff, production build, screenshots, console/request checks, and two-axis code review passed.
