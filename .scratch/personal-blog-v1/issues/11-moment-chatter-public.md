# 11: Moment and Chatter public experiences

**What to build:** Let visitors browse fixture-backed Moments and Chatter through distinct, responsive experiences that preserve each content type's meaning.

**Blocked by:** 08: Homepage motion and viewport acceptance.

**Status:** ready-for-human

- [x] Moment uses a chronological feed with optional images, location, mood, and Tags without requiring absent fields.
- [x] Chatter uses a composed note treatment with search/filter behavior distinct from both Moment and Post.
- [x] Mobile layouts remain readable single-column experiences with safe image behavior and touch targets.
- [x] Loading, empty, error, long-content, and missing-media states are complete.
- [x] Fixtures align with future public response contracts while keeping the domain models separate.
- [x] Fixed-viewport browser checks, accessibility checks, tests, lint, types, and diff review pass.

## Comments

2026-09-20: Added independent fixture-backed Moment and Chatter public contracts, SSR-safe collection composables, durable search/tag filters, responsive feed/card views, accessible loading/empty/error/stale-page states, long-content wrapping, and media-error fallbacks. Added unit and Chromium Playwright coverage for both routes, fixed CSS viewports (375/430/768/1024/1440/1920), keyboard focus, touch-target sizing, URL state, console/page errors, and viewport/full-page screenshots.

2026-09-20: Verification passed with 46 unit tests, focused Moment/Chatter Playwright coverage in Chromium and mobile Chromium (10 passed), lint, format check, typecheck, and `git diff --check`. Nuxt client/server production compilation completed; final Nitro process exit was stopped after remaining active in this Windows development environment without emitting a build error.

2026-09-20: Final Standards/Spec review found no hard standards violations or scope drift. Moment tags are explicitly optional in the public contract and the fixture/view path now handles their absence safely; the separate Moment, Chatter, and Post domain boundary remains intact.
