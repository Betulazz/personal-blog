# 23: Live public-site acceptance

**What to build:** Prove the complete public site works against native local Node, Python, and MySQL processes before administration UI work begins.

**Blocked by:** 21: Typed API client and homepage/Post integration; 22: Remaining public-content API integration.

**Status:** completed

- [x] Seeded local data drives all public routes without fixture fallbacks or Docker.
- [x] Homepage, player, Post discovery/reader, Moment, Chatter, Project, Friend Link, About, search, taxonomy, and error flows work end to end.
- [x] SSR source contains meaningful public content and hydration/network inspection shows no accidental duplicate request pattern.
- [x] HTTP errors, missing records, empty collections, unavailable media, and backend downtime recover without leaked internals or broken layout.
- [x] Fixed viewport and separate full-page checks pass with keyboard, reduced motion, touch, console, and basic runtime review.
- [x] Production builds, frontend checks, backend checks, secret scan, dead/debug cleanup, and cross-layer diff review pass.

## Comments

- 2026-09-21: Added an idempotent native MySQL public seed and `serve-live` command. The live browser config runs native FastAPI/Python, MySQL, and Nuxt without fixture fallbacks or Docker; the seed was executed twice and remained stable without creating an Administrator.
- 2026-09-21 verification: `npm run test:e2e:live` — 10 passed across Chromium and mobile Chromium; `npm run test:e2e` — 98 passed, 2 skipped; `npm run test:unit` — 43 passed; `npm run build`, lint, typecheck, and format checks passed; backend pytest — 44 passed, Ruff, format, and mypy passed.
- 2026-09-21 review: six required viewports produced separate viewport/full-page screenshots; SSR content, duplicate browser reads, missing records/media, empty search, redacted API errors, network failure boundaries, keyboard focus, reduced motion, touch targets, console/runtime, and safe external links were checked. Secret/debug scan found no new issues; the existing password prompt, config guard, and documentation placeholders are intentional. Cross-layer standards/spec review found no actionable findings.
