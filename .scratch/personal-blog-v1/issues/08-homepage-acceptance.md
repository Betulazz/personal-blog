# 08: Homepage motion and viewport acceptance

**What to build:** Turn the composed homepage into an approved Phase 3 prototype through purposeful motion, responsive correction, and browser-based visual acceptance.

**Blocked by:** 06: Homepage content aggregation; 07: Cross-route music player.

**Status:** ready-for-human

- [x] Entry, reveal, hover, navigation, and player motion clarify state without delaying content or producing excessive simultaneous movement.
- [x] Reduced-motion and mobile modes remove nonessential animation and expensive background behavior.
- [x] Viewport and separate full-page screenshots are inspected at every fixed comparison size.
- [x] Navigation, player, all homepage states, keyboard use, touch targets, and content overflow work.
- [x] Console output and a lightweight runtime/layer inspection show no material errors or obvious performance regression.
- [x] Phase 3 acceptance evidence is recorded without committing temporary screenshots.

## Comments

2026-09-20: Added finite desktop entry/reveal motion, mobile and reduced-motion fallbacks, animated mobile navigation, player state/entry feedback, and mobile player safe-area spacing. Homepage sections retain loading, empty, partial-error, and error rendering; existing unit coverage remains green. The audio error event is stopped at the media boundary so simulated unavailable-source recovery does not surface as an unhandled Nuxt development error.

Final verification completed with 21 unit tests, typecheck, source lint, Prettier checks, `git diff --check`, and the focused homepage/player/content/shell Playwright runs (`28 passed`, one worker). The full Playwright suite completed with 48 passed and two existing flaky design-system gallery assertions (hydration/keyboard focus). Browser evidence covers 375, 430, 768, 1024, 1440, and 1920 CSS-pixel viewports with separate Chromium and mobile-Chromium viewport/full-page screenshots in ignored `frontend/test-results/homepage` output; none are committed. Console/page-error checks for the homepage acceptance runs were empty, horizontal overflow was absent, runtime inspection found one audio instance, 15 fixed/backdrop-filter layers, no settled running animations, and 44px minimum player controls. Reduced-motion inspection found no immediate animations and hidden ambient glow.
