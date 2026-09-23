# 32: Animation, responsive, accessibility, and performance convergence

**What to build:** Refine the complete product into a consistent, responsive, accessible, and performant release candidate across supported browsers and devices.

**Blocked by:** 31: Admin workflow end-to-end acceptance.

**Status:** completed

- [x] Motion durations, easing, springs, reveals, route changes, navigation, dialogs, cards, and player behavior use shared tokens without arbitrary outliers.
- [x] Hidden/offscreen continuous effects pause; reduced-motion and mobile modes remove nonessential work; no layout-property animation remains.
- [x] Public and admin pages pass viewport and separate full-page review at 375×812, 430×932, 768×1024, 1024×768, 1440×900, and 1920×1080.
- [x] Critical workflows pass Chromium, Firefox, and WebKit with only documented noncritical differences.
- [x] Semantic structure, labels, focus, keyboard operation, contrast, touch targets, dialogs, sheets, and reduced motion pass automated and manual review.
- [x] Production profiling verifies responsive/lazy images, route splitting, bounded blur/layers, stable layout, acceptable long tasks, and smooth mobile scrolling.
- [x] Temporary reports/screenshots are removed; all builds, checks, tests, secret scan, console review, and diff review pass.

## Comments

### 2026-09-23

- **Motion token convergence:** added `--motion-duration-shimmer` and `--motion-delay-entry-stagger`; the four skeleton shimmers no longer hard-code `1.8s`, and `config/motion.ts` now reads duration/easing values from the CSS tokens (documented fallbacks for SSR/no-CSS), exposing `entry`, `entryStagger`, and `menu` instead of the previous inline `delay: 0.14`. A unit audit (`motion-tokens.test.ts`) fails on any raw time literal in an `animation`/`transition` declaration, any `var(--motion-*)` not defined in `tokens.css`, unordered durations, missing reduced-motion overrides, and drift between the JS fallbacks and the CSS tokens.
- **No layout-property animation:** the Post reading-progress bar and the admin media upload bar now animate `transform: scaleX(...)` with a custom property instead of `width`, preserving the existing `aria-valuenow` behavior.
- **Hidden/offscreen pause:** new `useContinuousEffectPause` composable + `.client` plugin pauses tagged continuous effects through `animation-play-state` when the document is hidden (`html[data-page-hidden]`) or the element leaves the viewport (`data-effect-paused`). Spinners, skeleton shimmers, the admin upload pulse, and the design-system motion orb are tagged; the observer tracks dynamic mount/unmount and attribute toggles; reduced-motion and mobile rules already removed nonessential effects.
- **Accessibility fixes found by the new audit:** the Post page no longer nests `<main>` inside the layout main, its TOC `<nav>` is named, `html` declares `lang="zh-CN"`, and the light action gradient (`#438cf5 → --color-accent-strong`, 3.06:1) plus the primary button gradient (2.94:1) were replaced with deeper `--color-action-start/--color-action-end` stops that keep white text at ≥4.5:1.
- **New acceptance suites (all against the live native stack, production build):**
  - `quality-convergence.spec.ts` — critical public and admin journeys on Chromium, Firefox, and WebKit; deterministic six-viewport captures (`test-results/quality-convergence/`) with separate viewport/full-page images reviewed at 375, 430, 768, 1024, 1440, and 1920 for home, post, moments, search, friends, admin dashboard, posts, editor, and settings; automated name/label/landmark audit plus a composited contrast floor (gradients included) across 13 public and admin routes; mobile touch-target sweep; reduced-motion sweep; continuous-effect pause proof (offscreen attribute **and** computed `animation-play-state: paused`, hidden-document root marker, resume).
  - `quality-convergence-performance.spec.ts` — production build + server; responsive AVIF selection (640 on mobile, 1920 background on wide screens), lazy card/markdown media, one fixed background layer, zero canvases, ≤16 backdrop filters with ≤20px blur, route-split chunk evidence (35 public scripts vs 11 admin-only chunks), SSR content without duplicate browser API reads, CLS 0.0058, p95 frame gap ~33ms, max frame gap 34–43ms, longest main-thread task 87–94ms.
- **Verification:** frontend **122 unit tests**; mocked Playwright baseline intact (176 tests; new suites excluded via `testIgnore`); live Playwright **30 passed**; quality Playwright **9 passed / 6 intentional skips** across chromium/firefox/webkit; performance Playwright **2 passed**; backend **49 pytest** plus Ruff, Ruff format, and Mypy clean; ESLint, Prettier, Nuxt typecheck, and production build clean. Console/network review is clean apart from the seeded intentionally-missing uploads and documented engine differences (Firefox `NS_BINDING_ABORTED` on aborted prefetches; WebKit's aborted build-manifest fetch). Secret-pattern scan and `git diff --check` clean; captures, reports, logs, and `.playwright-cli` artifacts removed before commit.
- **Two-axis code review follow-ups:** extracted shared live-server definitions into `tests/e2e/support/live-servers.ts` (removing three near-identical config copies), moved the pure parse helpers to `app/utils/motion-tokens.ts`, made the observer SSR-safe, taught it attribute toggles, added the marker-change unit test, strengthened the fallback/token cross-check, and hardened the pre-existing music-toggle live test against a navigation race. Accepted precedents: per-spec Playwright helpers and the `data-continuous-effect` marker now required per animated element.
