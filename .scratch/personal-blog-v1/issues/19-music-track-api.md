# 19: Music Track configuration API

**What to build:** Let the Administrator configure the legal Music Tracks consumed by the public ambient player without introducing a third-party catalog or proxy service.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [x] Music Track persistence and contracts cover display metadata, legal source, artwork, ordering, enabled state, and optional duration.
- [x] Public reads expose only enabled, validly ordered tracks and contain no secret storage information.
- [x] Protected create, update, reorder, enable/disable, and delete behavior validates supported source strategies.
- [x] The API does not scrape, search, mirror, or proxy third-party music catalogs.
- [x] Deletion and invalid-source behavior is predictable for an actively configured playlist.
- [x] Migration and real-MySQL HTTP tests cover ordering, validation, authorization, public filtering, and failures.

## Comments

### 2026-09-20

- Added Alembic `0008_music_tracks` with MySQL `utf8mb4` Music Track persistence, source-strategy and ordering constraints, artwork, enabled state, optional duration, and timestamps.
- Added public `/api/v1/music-tracks` reads plus protected Administrator listing, detail, create, update, reorder, enable/disable, and delete operations through Repository → Service → Router boundaries.
- Supported legal sources are explicit `remote_url`, `local_media`, and `s3_media` strategies. Public responses omit administration/storage strategy fields; playback and artwork URLs reject credentials, query/fragment tokens, unsafe paths, and local paths outside `/uploads/`.
- Added real-MySQL HTTP coverage for ordering, pagination, public filtering, all protected mutation seams, CSRF/authorization, source validation, reorder mismatch, deletion, and safe failures.
- Verification passed: 30 backend Pytest tests, Alembic upgrade/check, Ruff, Ruff format, Mypy, frontend 51/51 unit tests, ESLint, Nuxt typecheck, Prettier, and native Uvicorn liveness/public Music Track smoke requests.
