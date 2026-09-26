# Personal Blog v2 polish fidelity ledger

Acceptance date: 2026-09-26. This ledger records direct visual inspection of
the saved design references and the latest production-build captures, alongside
the matching browser assertions. It describes the current "夜航手记" site; the
older XingHuiSama reference is a visual guide rather than a pixel-identical
content or navigation specification.

## Evidence

- [Six-viewport acceptance matrix and all 168 captures](C:/Users/Birchtula/.codex/visualizations/2026/09/26/01a0dca0-957b-7ba3-9824-a54f7923e97c/personal-blog-v2-polish-acceptance/matrix-index.md)
- [Design-system captures](C:/Users/Birchtula/.codex/visualizations/2026/09/26/01a0dca0-957b-7ba3-9824-a54f7923e97c/personal-blog-v2-polish-acceptance/design-system/)
- [Timeline and Music captures](C:/Users/Birchtula/.codex/visualizations/2026/09/26/01a0dca0-957b-7ba3-9824-a54f7923e97c/personal-blog-v2-polish-acceptance/visual-refinement/)
- Accepted images: `.scratch/personal-blog-v2/reference/xinghuisama-home-1920x1080.png`, `xinghuisama-timeline-1440x900.png`, `xinghuisama-timeline-pixel7-full.png`, `xinghuisama-music-1920x1080.png`, and `xinghuisama-music-pixel7-full.png`.
- Latest implementation images are from the fresh Nuxt production bundle, mocked local API, and Playwright Chromium. The index contains a viewport and a full-page capture for each of 14 public and administrator surfaces at 375×812, 430×932, 768×1024, 1024×768, 1440×900, and 1920×1080 CSS pixels. It also links two Background Gallery behavior captures. The test checked response status, main heading, main landmark, overflow, browser errors, and failed responses.

## Comparison ledger

| Area | Accepted reference | Latest implementation and evidence | Assessment |
| --- | --- | --- | --- |
| Heading offset | The saved Timeline title begins about 51 px below the bottom of navigation. | The Activity Timeline title begins about 55 px below navigation on desktop and 40 px on mobile. Tokens are `--public-heading-offset: 7.5rem` desktop and `6.75rem` mobile. The Timeline images are linked above. | Close desktop rhythm; mobile has intentionally tighter top spacing. |
| Background visibility | Reference content is legible over the softly visible image. | Background layer uses 6 px blur and 3% enlargement on desktop, and 4 px blur and 2% enlargement on mobile. The six-viewport design-system gallery checks configured bright, dark, and patterned surfaces. | Retains a restrained image signal behind readable content. |
| Glass translucency | Cards distinguish from the background while preserving its presence. | Desktop alpha values: subtle 56%, card 61%, panel 64%. Mobile: subtle/card 74%, panel 73%. Direct captures and contrast checks include bright and patterned backgrounds. | More opaque on narrow screens for text and controls. |
| Contrast | Reference relies on translucent surfaces and subdued metadata. | Measured passing ratios: body description on white 4.78:1, navigation 7.18:1, filter 5.17:1, search 6.14:1, Timeline card 8.19:1; patterned backgrounds were at least 6.05:1. Footer description/navigation were 10.75:1 and metadata 7.32:1. | Sampled text passed the recorded contrast checks. |
| Music disc rim and aperture | The reference emphasizes a nearly full-cover disc and small center hole. | Latest cover fill measured 91.4% desktop / 91.2% mobile and center aperture 16.9% at both sizes; CSS artwork size is 92%, center hole 17%. | Proportions closely match the reference. |
| Lyric initial position | Reference presents lyrics near the center of the disc/player composition. | With no playback clock, no lyric is marked active and scroll position starts at 0. Audio-clock driven lyric state and synchronization were covered by unit and production browser workflows. | Initial state is stable; active timing still requires usable provider playback. |
| Desktop density | Reference has a denser, wider desktop composition. | At 1440/1920 px the six-viewport captures preserve the two-column music layout, broad content column, and full navigation; the acceptance checks found no horizontal overflow. | Desktop structure retained. |
| Mobile stacking | Reference collapses the content into a vertically readable single-column layout. | At 375×812 and 430×932 the public music content stacks, admin controls remain within the viewport, and matrix overflow checks pass. Recorded Pixel 7 CLS is 0, p95 interaction 25.7 ms, maximum 33.9 ms, and longest task 0 ms. | Responsive stacking retained. |
| Gallery behavior | New product behavior has no saved reference image. | Supplementary desktop and Pixel 7 captures show the local fixture-backed gallery. Verified rotation is about 30 seconds, crossfade about 1.2 seconds, page visibility pauses rotation, and reduced motion suppresses animation. | Accepted as specified; provider-hosted image delivery was not part of this local fixture run. |

The saved reference carries older XingHuiSama branding, copy, and a different
information architecture. The current site is branded 夜航手记 and uses the
v2 Home, Posts, Activity Timeline, Chatter, Projects, Friends, About, and Music
surfaces. Music captures can show the default disc/fallback without provider
album art or lyrics because the browser run uses local API fixtures and the
playback clock is not guaranteed. This is a retained environment/content
deviation, not a screenshot claim that the external catalog matched the
reference.

## Accessibility evidence

The production acceptance and design-system workflows exercised keyboard
navigation, visible focus, accessible names, select/menu focus management and
return, Escape handling, configured-background contrast, minimum 44×44 px
targets, and reduced-motion behavior. The gallery and controls remained
keyboard-operable in the captured acceptance workflows. The record is sampled
acceptance evidence, not a claim that an external automated accessibility
audit was run.
