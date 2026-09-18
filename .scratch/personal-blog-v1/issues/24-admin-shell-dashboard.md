# 24: Admin login, shell, and dashboard

**What to build:** Give the Administrator a secure, responsive entry point and application shell with useful site status while preserving work through normal access-token refresh.

**Blocked by:** 23: Live public-site acceptance.

**Status:** ready-for-agent

- [ ] Login presents accessible validation and safe invalid-credential/server-error feedback without exposing authentication details.
- [ ] Protected routes distinguish unauthenticated, expired-but-refreshable, forbidden, loading, and backend-unavailable states.
- [ ] Refresh and logout use the cookie session contract; authentication material is never stored in localStorage.
- [ ] The responsive Admin shell has keyboard-usable navigation, focus management, mobile behavior, and clear public-site escape routes.
- [ ] Dashboard exposes useful content counts and recent activity without speculative analytics infrastructure.
- [ ] HTTP/Playwright tests, fixed-view browser checks, console review, lint, types, secret scan, and diff review pass.

