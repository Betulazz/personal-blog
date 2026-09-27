# 04: Put profile, music, and lyrics into the Home hero

Type: task
Status: resolved
Blocked by: 03

## What to build

Keep the existing Home headline, description, and calls to action. Replace its right illustration with a personal introduction card and a music card; place a current-lyric strip below the hero composition. Remove the duplicate lower profile section.

## Acceptance criteria

- [x] Desktop Home has clear left copy/right card hierarchy and a lyric strip across the composition. The right illustration and Home floating mini-player are gone.
- [x] Profile card shows Site Identity name/description, configured avatar with monogram fallback, existing public counts, and configured social links. The same profile content is not duplicated below the hero; posts, Chatter, and Project sections remain.
- [x] Music card shows circular track artwork, title/artist, playback time/progress, previous/play/next, and a route to the full Music page. It uses the same audio and lyric state as the mini-player/Music page, never autoplays, and has clear loading/empty/error states.
- [x] The separate lyric strip shows the current timed line with restrained reference-like reveal; seeking, pausing, track changes, and missing/untimed lyrics do not show stale or falsely active text. Reduced motion removes decorative typing/reveal.
- [x] At 430×932 the complete compacted headline/actions remain, the profile card begins within the first viewport, and profile → music → lyric strip stack without horizontal overflow. Verify at all established viewport sizes and capture viewport/full-page screenshots separately.
- [x] Keyboard operation, image alt text, focus, console health, route continuity, and no duplicate audio are verified in Playwright.

## Starting points

`frontend/app/components/visual/FoundationHero.vue`, `frontend/app/components/home/HomeProfileSection.vue`, `frontend/app/components/home/HomeContent.vue`, `frontend/app/pages/index.vue`, shared music files from issue 03. Use current Site Identity and homepage stats rather than creating another authoring model.

## Implementation and validation

- Moved homepage data loading to `FoundationPage` and passed its existing public stats into the hero profile card. `HomeContent` now keeps the latest Posts, Chatter, and Project sections without rendering a duplicate profile.
- Replaced the illustration with the Site Identity profile and a Home music card, followed by a separate lyric strip. Both music views read the existing playback store and shared layout audio element; internal Music navigation preserves that state.
- Hardened active lyric selection to ignore missing or non-finite timestamps.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test:unit -- tests/unit/music-player.test.ts` — 14 passed.
- Targeted Prettier check — passed.
- `npm run build` — passed. Nuxt printed non-blocking plugin timing and dependency deprecation warnings.
- `npm exec -- playwright test tests/e2e/home-profile-music.spec.ts --project=chromium --reporter=list` — 5 passed. The rendered Home was checked at 375×812, 430×932, 768×1024, 1024×768, 1440×900, and 1920×1080; separate viewport and full-page screenshots for all six sizes are saved outside the repository in `C:\Users\Birchtula\.codex\visualizations\2026\09\27\01a0e1a5-c1f6-7582-873f-a0e1ad56303f\home-profile-music-issue04\`.
- Home/music interaction coverage confirms keyboard playback, seeking, pause, previous/next, untimed and missing lyrics, monogram fallback, reduced motion, Home → Music → mini-player → Home state continuity, and one audio element. The browser used local fixture API and media; live NetEase availability was not tested.
- Existing `home.spec.ts` and `music-player.spec.ts` regression run: 20 passed, 1 failed. The failing mobile test is the existing compact-player/footer check on `/projects`; it failed its footer visibility check and, on focused retry, its footer-overlap assertion. That path and its implementation are outside this ticket.

## Comments
