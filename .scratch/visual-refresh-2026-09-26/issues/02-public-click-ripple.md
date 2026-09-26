# 02: Add the public click ripple

Type: task
Status: resolved
Blocked by: None

## What to build

Create a small, short-lived indigo ripple at public-page pointer click coordinates without changing the target interaction. Do not apply it inside administrator routes.

## Acceptance criteria

- [x] A pointer click produces a visible ripple centered close to the click, expanding to roughly the reference's 60 px radius and fading promptly.
- [x] The effect is pointer-transparent and does not delay links, buttons, form controls, selection, scrolling, or navigation. It works across public route changes without duplicate listeners or layers.
- [x] Simultaneous ripples and animation work are bounded; all listeners and frames are cleaned up appropriately. Reduced-motion preference disables the decorative effect.
- [x] Playwright clicks a harmless public surface and a real link/button, proves the resulting interaction still works, and captures ripple evidence. An administrator route has no ripple layer. Check console health.

## Starting points

`frontend/app/layouts/default.vue`, `frontend/app/app.vue`; the reference implementation is `XHBlogs/components/ClickEffect.tsx` at the commit recorded in `../research.md`. Implement within the existing Vue/Nuxt visual system.

## Comments

## Verification

- Added `frontend/app/components/visual/ClickRipple.vue` to the public default layout. It uses one delegated set of pointer listeners, ignores drags and keyboard activation, caps active ripples at eight, removes timers/listeners on reduced-motion changes and unmount, and is absent from the administrator layout.
- `npm run typecheck`, targeted ESLint, targeted Prettier check, and `git diff --check` passed.
- Playwright: ripple acceptance passed in Chromium desktop and mobile projects (8 passed), covering centered/expanded ripple evidence, text selection, search input, scrolling, desktop link navigation, mobile menu/button navigation, reduced motion, bounded bursts, and administrator isolation.
- Header regression: the existing scroll suite passed in desktop and mobile projects (6 tests), covering down-hide, up-reveal, keyboard focus, route changes, mobile menu, and reduced motion. The combined run reported 14 passed.
- The local API fixture points some placeholder images at `example.com/media`; Playwright supplied an in-memory transparent SVG for those fixture URLs so console checks were not dependent on external networking.
- Screenshots are outside the repository in `%TEMP%\blog-public-click-ripple\` and `%TEMP%\blog-scroll-responsive-public-header\` (ripple surface and header visible/hidden states).
