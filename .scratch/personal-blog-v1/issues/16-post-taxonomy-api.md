# 16: Post, Category, and Tag lifecycle API

**What to build:** Provide visitors and the Administrator with a complete Post lifecycle backed by normalized Category and Tag data and predictable versioned HTTP contracts.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [x] Separate ORM models and Pydantic schemas represent Posts, Categories, Tags, and normalized relationships with intentional constraints and indexes.
- [x] Canonical Markdown uses LONGTEXT and public slugs, publication state, timestamps, summaries, and taxonomy rules are enforced by Services.
- [x] Public listing, detail, pagination, Category, Tag, and search endpoints expose only published content appropriately.
- [x] Protected create, update, preview, publish, unpublish, and delete operations enforce authorization and meaningful transition errors.
- [x] Repository queries avoid obvious N+1 behavior and respect the agreed pagination limit.
- [x] Fresh migration and real-MySQL HTTP tests cover uniqueness, taxonomy, publishing, validation, errors, and Unicode.

## Comments

### 2026-09-20

- Added Alembic `0003_post_taxonomy` with MySQL `utf8mb4` Posts, Categories, Tags, normalized `post_tags`, LONGTEXT Markdown, foreign keys, uniqueness/check constraints, and query-driven indexes.
- Added separate SQLAlchemy models, Pydantic contracts, Repository → Service → Router flows, public published-only discovery/detail/taxonomy/search endpoints, and protected Administrator CRUD/lifecycle/preview endpoints with CSRF/auth dependencies and safe error envelopes.
- Added real-MySQL HTTP contract coverage for Unicode, taxonomy references, draft isolation, pagination bounds, search, preview, publish/unpublish transitions, conflicts, reference-aware taxonomy deletion, and Post deletion.
- Backend verification passes: Alembic `check`, Ruff, Mypy, and 22 Pytest tests against a fresh isolated MySQL database. Frontend regression remains 51/51 unit tests with lint and typecheck passing.
- Browser verification passed in Edge: Swagger exposed the complete Post/Category/Tag/admin API surface; browser-side fetch of `/api/v1/posts` returned HTTP 200 with the stable empty collection envelope and no console warnings/errors.
