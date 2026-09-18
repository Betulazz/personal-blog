# 21: Typed API client and homepage/Post integration

**What to build:** Replace homepage and Post fixtures with live versioned APIs through one SSR-safe typed client while preserving every approved visual and failure state.

**Blocked by:** 16: Post, Category, and Tag lifecycle API; 18: Project, Friend Link, and Site Identity API; 19: Music Track configuration API; 20: Media Asset local-storage lifecycle.

**Status:** ready-for-agent

- [ ] A centralized typed client normalizes base URLs, SSR/client behavior, cookies where required, cancellation, and safe error envelopes.
- [ ] Homepage Site Identity, Posts, selected Projects, social links, visibility settings, and Music Tracks use live responses.
- [ ] Post listing, detail, Category, Tag, search, pagination, metadata, and not-found behavior use live responses.
- [ ] SSR provides meaningful initial content and hydration does not repeat already completed reads.
- [ ] Loading, empty, partial-error, full-error, stale navigation, and aborted-request behavior remain visually complete.
- [ ] Fixture removal requires no component redesign; HTTP/browser tests, fixed-view screenshots, console review, lint, types, and diff review pass.

