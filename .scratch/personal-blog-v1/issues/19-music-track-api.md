# 19: Music Track configuration API

**What to build:** Let the Administrator configure the legal Music Tracks consumed by the public ambient player without introducing a third-party catalog or proxy service.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [ ] Music Track persistence and contracts cover display metadata, legal source, artwork, ordering, enabled state, and optional duration.
- [ ] Public reads expose only enabled, validly ordered tracks and contain no secret storage information.
- [ ] Protected create, update, reorder, enable/disable, and delete behavior validates supported source strategies.
- [ ] The API does not scrape, search, mirror, or proxy third-party music catalogs.
- [ ] Deletion and invalid-source behavior is predictable for an actively configured playlist.
- [ ] Migration and real-MySQL HTTP tests cover ordering, validation, authorization, public filtering, and failures.

