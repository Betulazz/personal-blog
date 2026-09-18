# Visual foundation

Status: implemented and browser-verified

## Concept references

- Desktop: `visual-foundation-desktop.png` at 1440 × 900.
- Mobile: `visual-foundation-mobile.png` at 430 × 932.

These concepts establish direction rather than becoming rasterized interface UI. All visible navigation, copy, controls, focus states, and responsive behavior remain code-native. The production implementation uses the supplied `bg.jpeg`, not the generated dusk-room scene in the concepts.

## Extracted system

- Theme: dark blue-black spatial canvas with quiet indigo and violet light.
- Typography: editorial CJK serif for display and reading; modern CJK sans-serif for interface chrome; dedicated monospace fallback.
- Container: open asymmetric desktop composition, a bounded reading-preview frame, and a deliberate single-column mobile continuation.
- Glass: subtle, card, panel, and elevated roles share semantic backgrounds, borders, blur, and shadows. Blur is applied only to bounded major surfaces.
- Motion: short transform/opacity feedback; one optional ambient transform; no layout-property animation. Mobile removes ambient animation and reduced-motion disables it globally.
- Responsive behavior: 16 px phone gutters, 44 px minimum controls, stacked content at 768 px and below, and declared validation widths from 375 through 1920 CSS pixels.

The implementation tokens live in `frontend/app/assets/css/tokens.css`. Responsive AVIF, WebP, and progressive JPEG derivatives live in `frontend/public/images/background/` at 640, 1280, and 1920 pixels wide.

Browser verification used CSS-pixel viewports at 375 × 812, 430 × 932, 768 × 1024, 1024 × 768, 1440 × 900, and 1920 × 1080. Viewport captures remain temporary QA evidence outside the repository; the two committed concept references above are normalized to their declared dimensions. Breakpoint custom properties document the shared values and matching Tailwind build-time tokens; raw CSS media conditions repeat the literals because runtime custom properties are not valid inside media-query conditions.

## Fidelity ledger

| Comparison point     | Concept                                                         | Browser implementation                                                                    | Resolution                                                         |
| -------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Copy                 | Locked Chinese hero, navigation, actions, and metadata          | Exact visible strings and order                                                           | Matched                                                            |
| Layout               | Asymmetric desktop; single-column mobile                        | Two columns above 768 px; purpose-built stacked layout at 768 px and below                | Matched                                                            |
| Typography           | Large serif editorial display with restrained sans-serif chrome | Semantic serif/sans stacks with responsive type scale                                     | Matched                                                            |
| Palette and glass    | Deep navy, cool white, indigo accent, thin translucent borders  | Semantic dark tokens and four glass roles                                                 | Matched                                                            |
| Background treatment | Quiet illustrated atmosphere under a navy veil                  | Supplied approved illustration with responsive sources and a dark veil                    | Intentional source-asset substitution required by the project spec |
| Motion               | Subtle hover and ambient movement                               | Small lift/border feedback and one transform-only glow; removed for mobile/reduced motion | Matched                                                            |

No material mismatch remains for the visual-foundation ticket. Later homepage tickets may replace the example Site Identity copy while consuming the same semantic system.
