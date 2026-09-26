# Reference firefly fidelity

Match the dark-mode firefly field on [XingHuiSama](https://www.xinghuisama.top/) while retaining the local page's existing artwork, content, hidden-page pause, and reduced-motion behavior.

The supplied reference implementation is [Fireflies.tsx at 06d490a](https://github.com/heiehiehi/XinghuisamaBlogs/blob/06d490a04e15804eddef01cd3f7765b3dbda6b05/XHBlogs/components/Fireflies.tsx). The reference root layout mounts effects only at the `md` breakpoint and above.

Visual evidence: [saved reference](../personal-blog-v2/reference/xinghuisama-home-1920x1080.png), [before](before-1920x1080-later.png), [final](final-1920x1080-later.png), [mobile](final-430x932-later.png). The fresh reference browser session rendered blank; the earlier saved reference capture and source remain the baseline.

Decision: use the reference's green color, 50 desktop particles, 3–7px cores, 3–8s breathing, 15–35s wandering, and four paths. Render them in one 30fps canvas with a cached glow sprite. Hide below 768px and for reduced motion. The throwaway prototype compares the prior dim field, a bright static field, and the chosen wandering field via `?variant=`; its source is preserved on branch `codex/particle-prototype` at `a6c32c0`.
