# 07: Cross-route music player

**What to build:** Provide an accessible ambient music player whose legal, administrator-configured fixture tracks continue sensibly across client-side navigation.

**Blocked by:** 05: Public shell, navigation, and Site Identity.

**Status:** ready-for-agent

- [ ] Playback, pause, previous/next, progress, volume, track metadata, and unavailable-source states are understandable and keyboard accessible.
- [ ] Player state is centralized only where cross-route persistence requires it and remains SSR safe.
- [ ] Route changes do not unexpectedly restart the active track or duplicate audio instances.
- [ ] Mobile layout, reduced motion, autoplay restrictions, and media errors are handled deliberately.
- [ ] Fixtures use only safe example/local sources and introduce no scraping, catalog search, proxying, or unauthorized media.
- [ ] Store tests, browser interaction checks, console review, lint, types, and diff review pass.

