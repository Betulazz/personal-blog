# 32: Animation, responsive, accessibility, and performance convergence

**What to build:** Refine the complete product into a consistent, responsive, accessible, and performant release candidate across supported browsers and devices.

**Blocked by:** 31: Admin workflow end-to-end acceptance.

**Status:** ready-for-agent

- [ ] Motion durations, easing, springs, reveals, route changes, navigation, dialogs, cards, and player behavior use shared tokens without arbitrary outliers.
- [ ] Hidden/offscreen continuous effects pause; reduced-motion and mobile modes remove nonessential work; no layout-property animation remains.
- [ ] Public and admin pages pass viewport and separate full-page review at 375×812, 430×932, 768×1024, 1024×768, 1440×900, and 1920×1080.
- [ ] Critical workflows pass Chromium, Firefox, and WebKit with only documented noncritical differences.
- [ ] Semantic structure, labels, focus, keyboard operation, contrast, touch targets, dialogs, sheets, and reduced motion pass automated and manual review.
- [ ] Production profiling verifies responsive/lazy images, route splitting, bounded blur/layers, stable layout, acceptable long tasks, and smooth mobile scrolling.
- [ ] Temporary reports/screenshots are removed; all builds, checks, tests, secret scan, console review, and diff review pass.

