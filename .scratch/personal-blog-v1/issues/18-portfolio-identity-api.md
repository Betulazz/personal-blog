# 18: Project, Friend Link, and Site Identity API

**What to build:** Make portfolio, curated relationships, and public identity configurable through persistent public reads and protected administration operations.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [ ] Project persistence and contracts cover status, technology, time span, featured ordering, source, demonstration, and safe URLs.
- [ ] Friend Link persistence and contracts cover name, avatar, description, destination, ordering, and active state without live-monitoring claims.
- [ ] Site Identity/settings cover public name, descriptions, avatar, social links, SEO defaults, footer, contact, homepage visibility, and favicon.
- [ ] Public endpoints return safe display configuration while protected operations validate and update it.
- [ ] JSON is used only for naturally configuration-shaped values and does not replace relational integrity where it matters.
- [ ] Migration and real-MySQL HTTP tests cover validation, ordering, configuration updates, authorization, unsafe URLs, and error envelopes.

