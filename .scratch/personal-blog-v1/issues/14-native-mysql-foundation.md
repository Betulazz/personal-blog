# 14: Native MySQL migrations and integration-test foundation

**What to build:** Establish a repeatable native local database workflow that can prove MySQL-specific behavior and support every subsequent persistence slice without requiring Docker.

**Blocked by:** 13: Public mock-stage acceptance.

**Status:** ready-for-agent

- [ ] Development and isolated test databases use the locally installed MySQL service with documented safe configuration and no committed credentials.
- [ ] Alembic can upgrade a fresh database explicitly; application startup does not create or mutate schema implicitly.
- [ ] Metadata naming, utf8mb4 collation, async session lifecycle, transaction isolation for tests, and cleanup behavior are verified.
- [ ] HTTP integration tests can obtain isolated database state without using SQLite as proof of MySQL behavior.
- [ ] Local frontend/backend origins remain narrowly configured and Docker is not introduced into the development loop.
- [ ] Migration smoke test, liveness test, Ruff, Mypy, Pytest, secret scan, and diff review pass.

