# 23: Live public-site acceptance

**What to build:** Prove the complete public site works against native local Node, Python, and MySQL processes before administration UI work begins.

**Blocked by:** 21: Typed API client and homepage/Post integration; 22: Remaining public-content API integration.

**Status:** ready-for-agent

- [ ] Seeded local data drives all public routes without fixture fallbacks or Docker.
- [ ] Homepage, player, Post discovery/reader, Moment, Chatter, Project, Friend Link, About, search, taxonomy, and error flows work end to end.
- [ ] SSR source contains meaningful public content and hydration/network inspection shows no accidental duplicate request pattern.
- [ ] HTTP errors, missing records, empty collections, unavailable media, and backend downtime recover without leaked internals or broken layout.
- [ ] Fixed viewport and separate full-page checks pass with keyboard, reduced motion, touch, console, and basic runtime review.
- [ ] Production builds, frontend checks, backend checks, secret scan, dead/debug cleanup, and cross-layer diff review pass.

