# 17: Moment and Chatter lifecycle API

**What to build:** Provide separate persistent and HTTP lifecycles for Moments and Chatter so each public feed and administration workflow can evolve independently.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [x] Moment and Chatter use separate ORM models, schemas, Services, Repositories, validation, and public response contracts.
- [x] Moment supports optional images, location, mood, Tags, ordering, and absent metadata without artificial placeholder values.
- [x] Chatter supports its composed body, optional lead/title, mood, Tags, search/filter behavior, and publication state.
- [x] Public endpoints expose only appropriate entries and protected CRUD enforces Administrator access.
- [x] Relationships, indexes, pagination, deletion rules, and error envelopes are intentional and documented by behavior.
- [x] Fresh migration and real-MySQL HTTP tests cover both lifecycles, optional fields, filtering, Unicode, authorization, and failures.

## Comments

### 2026-09-20

- Added Alembic `0004_moment_chatter` with independent `moments`, `moment_images`, `moment_tags`, `chatters`, and `chatter_tags` tables using utf8mb4, LONGTEXT bodies, ordered images, foreign-key cascades, publication indexes, and status constraints.
- Added separate Moment/Chatter ORM models, Pydantic contracts, repositories, services, public feeds/tag collections, protected Administrator CRUD, publish/unpublish transitions, pagination, search/tag filtering, safe errors, and Tag deletion protection across all content lifecycles.
- Added real-MySQL HTTP contract coverage for optional metadata, image replacement/ordering, Unicode, publication visibility, filtering, authorization/CSRF, validation, deletion, tag usage, and failure envelopes.
- Final verification passed: 22 backend tests, 51 frontend unit tests, frontend ESLint/typecheck, backend Ruff/mypy/format checks, migration upgrade from a fresh database, diff check, and staged secret-pattern scan.
- Standards and Spec review found no remaining hard violations or scope drift. The accepted separate-content-model ADR remains satisfied.
