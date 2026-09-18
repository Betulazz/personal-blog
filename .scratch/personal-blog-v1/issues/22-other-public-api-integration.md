# 22: Remaining public-content API integration

**What to build:** Replace the remaining public fixtures with live Moment, Chatter, Project, Friend Link, About, Site Identity, and Media Asset data while retaining approved domain boundaries and UI states.

**Blocked by:** 17: Moment and Chatter lifecycle API; 18: Project, Friend Link, and Site Identity API; 20: Media Asset local-storage lifecycle.

**Status:** ready-for-agent

- [ ] Moment and Chatter pages consume their distinct live contracts with correct pagination, filtering, optional fields, and media.
- [ ] Project, Friend Link, About, footer, social, and identity surfaces consume live configuration and ordering.
- [ ] Media URLs and missing/deleted asset behavior resolve through the storage contract rather than hard-coded paths.
- [ ] SSR and client navigation avoid duplicate reads and stale cross-route state.
- [ ] Loading, empty, not-found, validation, network, and server-error states remain complete and safe.
- [ ] Fixtures are removed cleanly; HTTP/browser tests, fixed-view screenshots, console review, lint, types, and diff review pass.

