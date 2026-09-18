# 16: Post, Category, and Tag lifecycle API

**What to build:** Provide visitors and the Administrator with a complete Post lifecycle backed by normalized Category and Tag data and predictable versioned HTTP contracts.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [ ] Separate ORM models and Pydantic schemas represent Posts, Categories, Tags, and normalized relationships with intentional constraints and indexes.
- [ ] Canonical Markdown uses LONGTEXT and public slugs, publication state, timestamps, summaries, and taxonomy rules are enforced by Services.
- [ ] Public listing, detail, pagination, Category, Tag, and search endpoints expose only published content appropriately.
- [ ] Protected create, update, preview, publish, unpublish, and delete operations enforce authorization and meaningful transition errors.
- [ ] Repository queries avoid obvious N+1 behavior and respect the agreed pagination limit.
- [ ] Fresh migration and real-MySQL HTTP tests cover uniqueness, taxonomy, publishing, validation, errors, and Unicode.

