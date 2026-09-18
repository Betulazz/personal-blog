# XingHuiSamaBlogs Reference Analysis

Status: Phase 0 research complete  
Research date: 2026-09-18  
Reference repository: <https://github.com/heiehiehi/XinghuisamaBlogs>  
Reference site: <https://www.xinghuisama.top/>

## Scope and method

This analysis combines:

- a source-level audit of the reference repository, including the public Next.js application and its local management application;
- real browser rendering of the home page, an article, moments, chatter, projects, friends, and about pages at desktop and mobile viewports;
- inspection of computed styles, document structure, network activity, console output, and responsive layout behavior;
- a read-only audit of the current repository.

The photo wall and the `tree`/灵境 experience are intentionally excluded. Their pages, components, APIs, models, Three.js dependencies, and visual patterns are not implementation inputs for this project.

## Executive summary

The visual signature is not a single effect. It is the combination of a soft illustrated background, a deep slate base, translucent blue-gray surfaces, restrained indigo/purple light, Chinese serif typography, large rounded geometry, editorial imagery, and gentle motion. The new implementation should preserve that relationship while replacing the reference project's duplicated utility recipes and expensive global effects with tokens, primitives, responsive assets, and explicit performance budgets.

The reference implementation is useful as a visual specimen, not as an architecture template. Its public site is Next.js/React and file-backed; its manager is a separate Next.js/FastAPI/pywebview tool. The new product remains an independent Nuxt 4 + FastAPI + MySQL system.

## Visual Language

### Background

The rendered site uses a fixed, full-viewport illustrated background, heavily softened by translucent overlays and blur. The upper content area remains visibly connected to the illustration, while long pages transition into a near-black navy content field. The source implementation layers:

1. a background image or image rotation;
2. a translucent slate overlay with backdrop blur;
3. a slowly moving multi-stop gradient;
4. two large ambient radial glows;
5. theme-dependent particles;
6. desktop-only decorative effects such as grass, danmaku, click ripples, and a pixel character.

Our implementation should keep only the first four layers by default. A single low-density star/firefly layer may be enabled on capable desktop devices. Mobile and `prefers-reduced-motion` must receive a static or drastically reduced version.

The supplied `bg.jpeg` is the approved initial background asset. It must be converted to responsive WebP/AVIF derivatives before production use; the 1.2 MB source must not be shipped indiscriminately to every viewport.

### Color

Observed/reference values:

- deep base: approximately `slate-950`, shifted toward blue rather than pure black;
- primary accent: Indigo 500, approximately `#6366f1`;
- interactive/highlight accent: Indigo 400, approximately `#818cf8`;
- strong hover accent: Indigo 600, approximately `#4f46e5`;
- secondary accents: violet and restrained pink;
- reference background gradient colors: `#a18cd1`, `#fbc2eb`, `#a1c4fd`, `#c2e9fb`;
- main text: cool white rather than pure white;
- muted text: blue-gray with enough contrast for Chinese body copy.

The palette should be dark-first. A future light theme may reuse semantic tokens, but a full light theme is not part of the first release.

### Glass

The reference repeatedly uses equivalent recipes instead of a shared primitive:

```text
light surface: white at 40–60% opacity
dark surface: slate-800 at roughly 50% opacity
border: white at 10–40% opacity
blur: medium to extra-large
shadow: large to extra-large, often tinted
```

The new system should expose a small number of semantic variants:

- `glass-subtle`: navigation, compact controls, chips;
- `glass-card`: ordinary content cards;
- `glass-panel`: major page regions and reading surfaces;
- `glass-elevated`: dialogs, sheets, music player, floating controls.

Backdrop blur must be applied to bounded surfaces, not every nested child. No permanent `will-change: backdrop-filter` is allowed.

### Blur

Blur creates separation between the illustrated world and readable content. The reference overuses large blur and full-screen backdrop filters. The new design should use:

- modest surface blur for glass components;
- pre-blurred or CSS-filtered background imagery only where profiling permits;
- large ambient glows implemented as static gradients or slowly transformed pseudo-elements;
- no stacked blur layers inside cards.

### Border

Borders are thin, cool, and translucent. Hover changes border color before it changes geometry. Recommended treatment:

- 1 px default glass border;
- brighter indigo/white border on hover and focus;
- visible focus ring independent from the decorative border;
- no high-contrast gray box borders.

### Glow

Glow is an accent, not a blanket effect. It appears around active navigation, primary buttons, selected filters, the music play control, and some card edges. Use indigo as the dominant glow and pink only for selected metadata or a secondary gradient stop.

### Shadow

Shadows express depth with dark navy occlusion plus a faint colored bloom. Avoid neutral Bootstrap-style gray shadows. A card should normally use one depth shadow; hover may increase the colored component without adding multiple stacked shadows.

### Radius

The reference strongly favors `rounded-2xl` and `rounded-3xl`, with major panels reaching 32–40 px. The new radius scale should distinguish:

- small controls and tags;
- medium inputs and buttons;
- large cards;
- panel geometry;
- fully round avatars and icon buttons.

Not every element should be pill-shaped.

### Typography

The rendered body uses `Noto Serif SC`; headings are heavy, slightly tightly tracked, and editorial. The contrast between large serif headings and small uppercase technical labels is a defining feature.

Recommended system:

- display/headings: `Noto Serif SC`, 700–900;
- reading body: `Noto Serif SC` or a highly readable CJK serif stack;
- UI controls/metadata: a modern CJK sans-serif stack;
- code: a dedicated monospace stack;
- mobile body: never below a comfortably readable size;
- long-form line height: approximately 1.75–1.9;
- muted text must meet accessible contrast despite the glass background.

Using sans-serif UI chrome improves clarity without losing the reference site's editorial personality.

### Spacing

The reference commonly uses 90–95% viewport-width containers, `max-w-4xl` through `max-w-7xl`, 24–32 px card gaps, and generous panel padding. The new system should replace ad hoc values with a 4 px-derived scale and explicit container gutters:

- mobile: 16 px outer gutter;
- small tablet: 24 px;
- desktop: 32–48 px;
- section rhythm: 64–112 px depending on hierarchy.

### Grid

The reference home page uses an asymmetric 12-column desktop composition: profile and music occupy different spans, followed by featured/editorial tiles. Other pages use:

- article: main reading column plus a 320 px sidebar on large screens;
- moments: two balanced desktop columns, one mobile column;
- chatter: three desktop masonry columns, two very narrow mobile columns;
- projects: two desktop columns, one mobile column;
- friends: three desktop columns, two mobile columns.

We should preserve asymmetry on desktop but improve mobile behavior. Chatter and friends become one column on narrow phones; dense two-column cards in the reference are too small for comfortable reading and touch.

### Icons

The reference mixes Lucide and inline SVG. The new project should standardize on Lucide Vue Next for interface icons. Brand/service marks may use dedicated SVG assets. Icon buttons require at least a 44 px touch target even when the visible glyph is smaller.

## Components

### Navbar

Desktop uses a fixed, translucent navy bar with a serif wordmark, horizontal links, an indigo active state, and a small active dot. It hides on downward scroll and reappears on upward scroll.

Mobile uses a distinctive rotating side wheel, but the interaction is difficult to discover, intrudes into content, and reduces usable width. The new implementation should preserve a small luminous floating trigger while opening an accessible Reka/shadcn-vue Sheet with conventional focus management and touch targets.

### Hero and Profile

The home page does not use a conventional marketing hero. Its primary identity block is a large glass profile card with avatar, name, summary, statistics, and social icon buttons. This sits beside the music player on desktop and stacks on smaller screens.

The new home should retain this personal-dashboard composition. Identity content remains configurable example content until replaced through site settings.

### Article Card

Article/editorial cards use large imagery with a dark lower gradient, category/date badges, a strong serif title, a short excerpt, and subtle carousel indicators. Images slowly zoom on hover while the card lifts by only a few pixels.

The new system needs horizontal, vertical, featured, and compact article-card variants sharing the same media, metadata, and focus behavior.

### Moment Card

Moment cards resemble a calm social feed: compact avatar/date header, body text, optional image grid, location/tag metadata, and a small comment affordance. Desktop uses two columns; mobile must use one. Images need explicit aspect ratios and a future lightbox, but comments are not part of v1.

### Chatter Card

Chatter uses editorial masonry cards with a cover image, mood badge, timestamp, title, excerpt, and tags. The visual rhythm comes from mixed card heights. The new implementation should use CSS columns or a measured masonry strategy that remains stable during hydration; mobile should avoid the reference's cramped two-column layout.

### Project Card

Project cards are wide glass panels with an emblem, title, description, stack badges, status, and external links. The reference page is visually sparse, so the new version should use intentional whitespace rather than adding decorative filler.

### Friend Card

Friend cards are compact avatar/name/description units with an online-style indicator. Automatic online status is out of scope; v1 should use a neutral link indicator or explicitly stored status, not imply real monitoring.

### Music Player

The home player combines a circular album image, uppercase source label, track/artist text, progress, previous/play/next controls, and lyric display. Playing state rotates the disc. The new v1 supports administrator-configured legal audio URLs, local media, or S3-backed assets only. It must not copy third-party scraping/proxy behavior.

### Footer

The reference footer/dashboard is a horizontal status panel containing time, uptime, stack badges, and registration text. The new footer should retain the glass status-strip silhouette while using only truthful, configured data and collapsing cleanly on mobile.

### Background Effects

The reference provides fireflies, sakura, grass, danmaku, click canvas, gradients, and ambient glows. The new system should implement:

- static responsive background media;
- base navy gradient;
- two ambient glow layers;
- subtle noise texture;
- at most one low-density desktop particle layer;
- automatic removal/reduction on mobile and reduced-motion devices.

No large Three.js scene, global click canvas, danmaku field, or permanently running hidden particle system is permitted.

## Animation

### Page transition

Reference pages enter with opacity and roughly 20 px vertical movement over about 800 ms. The new implementation should shorten ordinary route content transitions to approximately 350–500 ms and avoid hiding meaningful content behind a mandatory splash screen.

### Hover

The common pattern is 1–2% scale or 4–8 px upward translation, brighter border, stronger tinted shadow, and a 5–10% image zoom. New cards should favor lift plus border/glow; scale is reserved for media and small controls.

### Scroll reveal

Reveal should be sectional and staggered, not applied to every child. Content must remain visible when JavaScript or motion is unavailable.

### Floating

Ambient ornaments may drift slowly using transform only. Avoid animating layout properties such as `right`, `top`, width, or height.

### Glow

Glow animation should be limited to active controls and rare background pulses. Do not animate many blurred shadows simultaneously.

### Music player

The reference rotates album art at a six-second linear interval and types lyrics character by character. Keep the rotating disc only while playing, pause it offscreen, and use lyric crossfades rather than per-character timers by default.

### Background animation

Use a slow transform on one gradient/glow layer. Particle animation is optional, desktop-only, capped, and paused when the document is hidden.

## Responsive

### Desktop

- fixed glass navigation and wide asymmetric layouts;
- home profile/music split and varied editorial tiles;
- article reading column with sticky author/recommended/TOC sidebar;
- two-column moments, three-column chatter, two-column projects, three-column friends;
- restrained background effects and hover states.

### Tablet

- navigation changes at approximately 768 px;
- home primary panels stack before content becomes cramped;
- article sidebar moves below or becomes an on-demand panel below 1024 px;
- grids use two columns only when card minimum widths remain readable;
- background effects reduce before phone breakpoints, not only at 375 px.

### Mobile

- accessible Sheet navigation replaces the rotating wheel;
- single-column profile, music, moments, chatter, projects, and friends where necessary;
- 16 px gutters and minimum 44 px touch targets;
- article TOC opens in a Sheet and reading progress remains lightweight;
- music player becomes a compact bottom bar with an expandable panel;
- decorative effects, heavy blur, and nonessential infinite animation are disabled;
- images use responsive sources and reserved dimensions to prevent layout shift.

Required validation widths for the implementation are 375, 430, 768, 1024, 1440, and 1920 px.

## Performance

### GPU and compositing risks

The reference assigns permanent `will-change: backdrop-filter` to blurred elements and combines many glass cards with full-screen blur. This can create excessive compositing layers and GPU memory pressure. The new project must profile layer count and use `will-change` only immediately around an animation, if at all.

### Repaint risks

Large animated blurs, shadow-heavy glass panels, a continuously cleared full-screen canvas, and multiple particle systems cause broad repaint regions. Ambient layers should animate by transform/opacity and be isolated from content.

### Layout thrashing

The reference danmaku animates layout-related properties, and masonry/layout animation can reflow many cards. New animations must use transform and opacity. Masonry changes need stable dimensions and should not animate the entire grid for simple filtering.

### Backdrop filter overuse

Blur only major bounded surfaces. Nested cards should use translucent fills without additional backdrop blur. Mobile may replace blur with a more opaque background.

### Canvas overdraw

No always-running full-screen click canvas is needed. If a particle canvas is introduced later, it must be a single layer, density-capped by device class, visibility-aware, and disabled for reduced motion.

### Additional findings

- the reference mounts hidden theme particle systems instead of stopping their animation;
- many ordinary `<img>` elements lack optimized responsive delivery and stable dimensions;
- the mandatory splash screen delays first meaningful content;
- broad 700–1000 ms transitions are used excessively;
- Markdown rendering permits dangerous HTML without an evident sanitize stage;
- the reference mobile two-column content grids can become too narrow;
- browser inspection showed long pages and extensive media, making lazy loading and decoding strategy essential.

## Keep, adapt, and exclude

### Keep

- dark slate spatial depth;
- soft illustrated background and pastel ambient light;
- consistent indigo/violet interaction language;
- glass hierarchy;
- Chinese serif editorial typography;
- asymmetric desktop composition;
- profile-dashboard home structure;
- record-like music player presentation;
- subtle lift, border glow, and media zoom;
- mobile reduction of visual effects.

### Adapt

- replace the mobile navigation wheel with an accessible Sheet;
- turn repeated glass recipes into tokens and primitives;
- use one-column phone layouts where the reference uses unreadably narrow columns;
- provide a real mobile article TOC instead of moving the desktop sidebar to the page bottom;
- replace third-party music fetching with configured legal media;
- use optimized image delivery and reserved aspect ratios;
- shorten transitions and remove mandatory splash delay;
- sanitize Markdown and raw HTML.

### Exclude

- photo wall and all related home modules;
- 灵境/tree and Three.js scenes;
- AI chat or character system;
- global utility dock copied from the reference;
- click-ripple canvas and danmaku field;
- large particle populations and hidden-but-running effects;
- comments in v1;
- reference identities, copy, data, and proprietary/copyrighted assets;
- reference code organization and file-backed production data model.

## Current repository state

The project currently contains the product specification, agent configuration, the approved source background image, and empty `frontend/` and `backend/` directories. It is not yet a Git repository and has no manifests, application source, tests, Docker configuration, environment template, or database schema. Phase 1 therefore starts from a clean architecture baseline.

