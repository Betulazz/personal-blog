# 14: Native MySQL migrations and integration-test foundation

**What to build:** Establish a repeatable native local database workflow that can prove MySQL-specific behavior and support every subsequent persistence slice without requiring Docker.

**Blocked by:** 13: Public mock-stage acceptance.

**Status:** ready-for-human

- [x] Development and isolated test databases use the locally installed MySQL service with documented safe configuration and no committed credentials.
- [x] Alembic can upgrade a fresh database explicitly; application startup does not create or mutate schema implicitly.
- [ ] Metadata naming, utf8mb4 collation, async session lifecycle, transaction isolation for tests, and cleanup behavior are verified.
- [ ] HTTP integration tests can obtain isolated database state without using SQLite as proof of MySQL behavior.
- [x] Local frontend/backend origins remain narrowly configured and Docker is not introduced into the development loop.
- [ ] Migration smoke test, liveness test, Ruff, Mypy, Pytest, secret scan, and diff review pass.

## Comments

### 2026-09-20

- Added the explicit `0001_database_foundation` Alembic head, MySQL metadata defaults, async engine/session factory, request rollback lifecycle, dedicated `_test` database guard, migration reset/upgrade fixture, HTTP readiness integration seam, and cleanup probe.
- Documented native Windows MySQL setup, least-privilege local credentials, separate development/test databases, explicit migrations, narrow local origins, and the Docker boundary.
- Passing locally: Ruff, Ruff format, Mypy, unit/liveness Pytest (`4 passed`), Alembic offline SQL generation, secret/debug scan, diff check, Uvicorn startup, and frontend Chromium/mobile browser checks (`14 passed`).
- Real-MySQL migration and HTTP tests are currently skipped because the installed MySQL80 service has no available local login configured in this workspace. No account was reset or modified. Set an untracked `TEST_DATABASE_URL` for the dedicated database and rerun `python -m pytest` in `backend/` to complete the remaining acceptance checks.
