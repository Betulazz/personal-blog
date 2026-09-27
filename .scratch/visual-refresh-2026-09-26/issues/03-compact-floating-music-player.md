# 03: Replace the long floating player with a compact record pill

Type: task
Status: resolved
Blocked by: None

## What to build

On public routes other than Home and Music, replace the near-full-width player with a compact bottom-right pill using the current Music Track's cover as a circular record. Keep the shared audio engine and Music page's full controls.

## Acceptance criteria

- [x] The pill shows actual track artwork (with image-failure fallback), song title, current lyric, play/pause, and next; the cover has a record center and rotates only during actual playback.
- [x] The pill is absent from `/` and `/music` and cannot intercept clicks while absent. It stays readable at 375×812, 430×932, 1440×900, and 1920×1080 without covering essential controls or overflowing.
- [x] Music page, mini-player, and later Home card use one store/audio instance. Navigation preserves track, clock, and playback; no autoplay is introduced. Seek, volume, and mode remain on Music.
- [x] The displayed lyric follows the real shared clock and handles before-first-line, missing/untimed lyric, seek, track switch, unavailable artwork, and provider error without stale or misleading content.
- [x] Reduced motion stops record rotation. Buttons have names, focus states, and appropriate touch targets.
- [x] Playwright verifies play/pause, next, cross-route continuity, Home/Music absence, mobile positioning, and screenshots. Keep fixture success distinct from live NetEase availability.

## Validation

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test:unit -- tests/unit/music-player.test.ts` — 13 passed.
- `npm run test:unit` — 139 passed; 1 unrelated failure in `tests/unit/motion-tokens.test.ts` for raw duration values in `ClickRipple.vue` and `FoundationHeader.vue`.
- `npm exec -- playwright test tests/e2e/music-player.spec.ts` — 28 passed across Chromium desktop/mobile projects, including 375×812, 430×932, 1440×900, and 1920×1080; route continuity, controls, lyrics, keyboard focus, reduced motion, and fixture fallback verified.
- `npm exec -- playwright test tests/e2e/public-header-scroll.spec.ts` — 6 passed across desktop/mobile projects; downward hide and upward reveal, keyboard access, and reduced motion verified.
- Screenshots are outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\27\01a0e159-315f-7a73-9c6b-74c62494ec87`.

## Starting points

`frontend/app/components/visual/MusicPlayer.vue`, `frontend/app/layouts/default.vue`, `frontend/app/stores/musicPlayer.ts`, `frontend/app/composables/musicPlayback.ts`, `frontend/app/pages/music/index.vue`. Preserve the current uncommitted music-page lyric changes.

## Comments
