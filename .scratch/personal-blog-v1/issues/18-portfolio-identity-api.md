# 18: Project, Friend Link, and Site Identity API

**What to build:** Make portfolio, curated relationships, and public identity configurable through persistent public reads and protected administration operations.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [x] Project persistence and contracts cover status, technology, time span, featured ordering, source, demonstration, and safe URLs.
- [x] Friend Link persistence and contracts cover name, avatar, description, destination, ordering, and active state without live-monitoring claims.
- [x] Site Identity/settings cover public name, descriptions, avatar, social links, SEO defaults, footer, contact, homepage visibility, and favicon.
- [x] Public endpoints return safe display configuration while protected operations validate and update it.
- [x] JSON is used only for naturally configuration-shaped values and does not replace relational integrity where it matters.
- [x] Migration and real-MySQL HTTP tests cover validation, ordering, configuration updates, authorization, unsafe URLs, and error envelopes.

## Comments

### 2026-09-20

- Added Alembic `0005_portfolio_identity`, `0006_project_technology_name`, and `0007_site_settings_singleton` with MySQL `utf8mb4` Projects, Friend Links, and database-enforced singleton Site Identity settings. Project technology and settings collections use JSON only where they are naturally configuration-shaped; ordering, status, and activation remain relational fields.
- Added public paginated `/api/v1/projects`, `/api/v1/friends`, and `/api/v1/settings` reads plus protected Administrator CRUD and Site Settings update operations through Repository → Service → Router boundaries.
- Added safe HTTP URL and local-media validation (including encoded/control-character and backslash bypasses), deterministic ordering, public/admin response separation, safe validation/error envelopes, partial nested-settings merges, and real-MySQL HTTP coverage for Unicode, pagination, ordering, authorization, unsafe URLs, configuration updates, singleton enforcement, and failures.
- Verification passed: 28 backend Pytest tests against a fresh isolated MySQL database, Alembic upgrade/check, Ruff, Ruff format, Mypy, frontend 51/51 unit tests, ESLint, Nuxt typecheck, Prettier, Uvicorn liveness/public endpoint checks, and the two-axis Standards/Spec code review. The music playlist remains scoped to issue 19.
