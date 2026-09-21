# 21: Typed API client and homepage/Post integration

**What to build:** Replace homepage and Post fixtures with live versioned APIs through one SSR-safe typed client while preserving every approved visual and failure state.

**Blocked by:** 16: Post, Category, and Tag lifecycle API; 18: Project, Friend Link, and Site Identity API; 19: Music Track configuration API; 20: Media Asset local-storage lifecycle.

**Status:** completed

- [x] A centralized typed client normalizes base URLs, SSR/client behavior, cookies where required, cancellation, and safe error envelopes.
- [x] Homepage Site Identity, Posts, selected Projects, social links, visibility settings, and Music Tracks use live responses.
- [x] Post listing, detail, Category, Tag, search, pagination, metadata, and not-found behavior use live responses.
- [x] SSR provides meaningful initial content and hydration does not repeat already completed reads.
- [x] Loading, empty, partial-error, full-error, stale navigation, and aborted-request behavior remain visually complete.
- [x] Fixture removal requires no component redesign; HTTP/browser tests, fixed-view screenshots, console review, lint, types, and diff review pass.

## Verification

- Implemented the centralized SSR-safe typed API client and removed the runtime homepage/Post/music fixtures.
- Backend: `pytest` 44 passed; Ruff and mypy passed.
- Frontend: unit tests 45 passed; format, lint, typecheck, and production build passed.
- Browser: API integration 8 passed; focused homepage/post checks passed; the full suite reached 97 passed with one existing design-system focus-outline timing flake, which passed when isolated and rerun.
- Code review: Standards PASS; Spec PASS after making homepage SEO defaults reactive to settings retries.
