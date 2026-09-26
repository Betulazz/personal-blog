# 01: Make the public header respond to scroll direction

Type: task
Status: resolved
Blocked by: None

## What to build

On every public route, animate the existing desktop and mobile top header out of view after a meaningful downward scroll past approximately 80 CSS pixels, and restore it on upward scroll. Keep the existing mobile sheet menu. Administrator navigation is outside this change.

## Acceptance criteria

- [x] Header begins visible at page top, hides upward after downward scrolling, and returns when scrolling upward; the transition is restrained and close to the reference's 500 ms.
- [x] Tiny scroll deltas near the threshold do not make the header flicker. Client-side route navigation and returning to the top restore it.
- [x] Opening the mobile menu keeps its trigger/menu usable; focused navigation controls are not hidden from keyboard users. An invisible header never intercepts page clicks.
- [x] Reduced-motion preference avoids movement while preserving visibility-state behavior.
- [x] Playwright verifies down/up behavior on Home and at least two other public routes at desktop and 430×932 mobile widths, including keyboard focus and no console errors or horizontal overflow. Save visible and hidden screenshots.

## Starting points

`frontend/app/components/visual/FoundationHeader.vue`, `frontend/app/layouts/default.vue`; reference behavior is documented in `../research.md`. Preserve the existing admin shell.

## Comments

### Verification — 2026-09-26

- Playwright passed: 2 tests via `npm run test:e2e -- --project=chromium tests/e2e/public-header-scroll.spec.ts`. It covered `/`, `/posts`, and `/about` at 1440×900 and 430×932 CSS pixels, including down/up/top behavior, 4px jitter near the threshold, client-side navigation, keyboard focus, mobile menu, and reduced motion. No console errors or horizontal overflow were observed.
- `npm run typecheck`, targeted ESLint, Prettier check, and `git diff --check` passed.
- Visible and hidden screenshots are outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0ddee-457b-74b3-ac5e-7f4b24bed9d7\scroll-responsive-public-header\`.
