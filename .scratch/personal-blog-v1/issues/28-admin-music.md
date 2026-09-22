# 28: Admin Music Track management

**What to build:** Let the Administrator curate and reorder the exact legal Music Tracks used by the public player and see changes reflected without code edits.

**Blocked by:** 19: Music Track configuration API; 24: Admin login, shell, and dashboard.

**Status:** completed

- [x] The collection displays ordering, enabled state, metadata, source strategy, artwork, and validation status clearly.
- [x] Create/edit accepts only the supported legal source strategies and gives actionable media failure feedback.
- [x] Reorder, enable/disable, and delete behavior updates the public playlist predictably.
- [x] Active-player changes, empty playlist, unavailable source, session expiry, and server errors are handled safely.
- [x] The administration UI offers no scraping, catalog search, proxy, or mirroring workflow.
- [x] HTTP/Playwright tests, player integration checks, mobile/keyboard review, lint, types, and diff review pass.

## Comments

### 2026-09-22

- Added `/admin/music` collection and editor routes with ordering controls, enable/disable, deletion confirmation, artwork preview, source-strategy badges, and inline validation status. The admin nav and the Site Settings homepage-visibility panel both link to it.
- Added `music-source` utilities for the three supported legal strategies (`local_media`, `remote_url`, `s3_media`) with actionable messages; percent-encoded traversal is decoded before relative-segment checks.
- Added typed admin music API client methods that invalidate `public-music-tracks`, so reorder, enable/disable, and delete changes reach the public player on the next read. Player store behavior for reordered, removed, and empty playlists is locked by unit tests.
- Extended the mock API with faithful admin music endpoints and realistic fixtures (enabled/disabled, artwork, a legacy invalid source) and enabled-only public filtering.
- Browser review found the admin canvas let the global ambient background paint over admin content on small screens; `AdminShell`/`AdminState` now isolate at `--z-base` like the public shell.
- Verification: frontend unit tests 55 passed; full Playwright suite 140 passed with 4 intentional skips; backend 46 passed plus Ruff, Ruff format, and Mypy; Nuxt typecheck, ESLint, and Prettier clean; fixed-view screenshots reviewed at 430 and 1440. Two-axis review findings (encoded traversal, unused type, 422 mapping, mock alias, settings discoverability) were addressed.
