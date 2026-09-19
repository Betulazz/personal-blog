# 09: Post discovery, taxonomy, and search

**What to build:** Let visitors discover fixture-backed Posts through listing, pagination, Category, Tag, and search experiences with durable linkable state.

**Blocked by:** 08: Homepage motion and viewport acceptance.

**Status:** ready-for-human

- [x] Post listing communicates title, summary, publication metadata, Category, Tags, and navigation destination clearly.
- [x] Pagination, Category, Tag, and search state is represented in linkable navigation rather than hidden component-only state.
- [x] Category and Tag collection pages preserve filters and recover safely from invalid or empty values.
- [x] Loading, skeleton, empty, not-found, and error states follow the Design System.
- [x] Fixtures match the intended public API contracts and do not force later component rewrites.
- [x] Fixed-viewport browser checks, keyboard checks, tests, lint, types, and diff review pass.

## Comments

- 2026-09-20: Implemented fixture-backed Post discovery, pagination, Category/Tag indexes and routes, durable search/filter links, safe Post detail destinations, API-shaped fixture contracts, and responsive Design System states.
- 2026-09-20: Verified 36 unit tests, 60 full E2E tests across Chromium and mobile Chromium, fixed-viewport checks at 375/430/768/1024/1440/1920, lint, typecheck, format check, production build, and Standards/Spec code review.
