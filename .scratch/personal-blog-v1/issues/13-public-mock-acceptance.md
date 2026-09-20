# 13: Public mock-stage acceptance

**What to build:** Close the public mock-data phase with a coherent cross-page browser review that proves the frontend is ready for persistent data without carrying visual or interaction debt forward.

**Blocked by:** 09: Post discovery, taxonomy, and search; 10: Markdown Post reading experience; 11: Moment and Chatter public experiences; 12: Project, Friend Link, About, and error pages.

**Status:** ready-for-human

- [ ] Every public route, navigation path, and fixture contract is inventoried and works from a clean production frontend build.
- [x] Loading, empty, not-found, partial-error, and unexpected-error behavior is visibly complete across pages.
- [x] All fixed viewport and separate full-page checks pass without accidental horizontal overflow.
- [x] Keyboard navigation, semantics, focus, touch targets, reduced motion, and safe external links pass review.
- [x] Console, hydration, network, and obvious rendering-performance issues are resolved.
- [x] Temporary QA artifacts and debug code are removed; lint, types, tests, secret scan, and diff review pass.

## Comments

### 2026-09-20

- Added cross-page acceptance coverage for every fixture-backed Post, Category, Tag, primary navigation route, custom 404 route, all required CSS viewports, separate viewport/full-page screenshots, overflow, visible touch targets, safe external links, browser console/page errors, failed requests, HTTP error responses, and navigation timing.
- Fixed `HomeReveal` observer setup across motion-preference hydration/remounts; stabilized Nuxt cold-compile hydration assertions and intentional missing-Markdown-media diagnostics.
- Final checks: 51 unit tests passed; lint, formatting, typecheck, secret/debug scan, and `git diff --check` passed; Chromium and mobile Chromium full E2E passed with 90 passed and 2 expected skips.
- `npm run build` completes client and SSR compilation and generates `.output/public`, but Nuxt 4.5.2/Nitro 2.13.4 does not exit or generate `.output/server/index.mjs` on this Windows environment after `Building Nuxt Nitro server`; production preview could not be claimed.
