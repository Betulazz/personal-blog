# 15: Administrator authentication and secure sessions

**What to build:** Allow a deliberately bootstrapped Administrator to authenticate, refresh, inspect, and end a secure session through tested HTTP behavior.

**Blocked by:** 14: Native MySQL migrations and integration-test foundation.

**Status:** ready-for-agent

- [x] The first Administrator is created through an explicit interactive CLI and no default or environment-bootstrap password exists.
- [x] Passwords use the approved strong hashing policy and sensitive fields never enter response schemas or logs.
- [x] Login, current-user, refresh rotation/revocation, logout, expired access, reused refresh, and invalid credentials have stable HTTP behavior.
- [x] Access and refresh credentials use HttpOnly cookies with explicit development and production attributes plus an appropriate CSRF strategy.
- [x] Expected errors use safe envelopes and unexpected failures reveal no secrets, SQL, internal paths, or tracebacks.
- [ ] Real-MySQL HTTP tests, CLI tests, Ruff, Mypy, Pytest, secret scan, and diff review pass.

## Comments

### 2026-09-20

- Added `users` and server-side refresh-session persistence through Alembic `0002_administrator_auth`, including session-version invalidation for immediate logout and a MySQL advisory lock for first-Administrator creation.
- Added interactive `python -m app.cli create-admin`, explicit Argon2id hashing, JWT access/refresh cookies, double-submit CSRF protection, refresh rotation and reuse revocation, current-user, logout, safe validation/unexpected-error envelopes, and HTTP contract tests.
- Backend verification passes: Ruff, Ruff format, Mypy, 8 non-MySQL Pytest tests, Alembic offline SQL generation, and manual secret scan. Frontend regression remains 51/51 unit tests with lint and typecheck passing.
- Browser verification passed in Edge against the running API: Swagger exposed all five auth routes; `/api/v1/auth/csrf` returned HTTP 200, set the `/api/v1` CSRF cookie, and produced no console warnings/errors.
- The nine real-MySQL tests (five authentication plus four existing foundation tests) were skipped because this workspace has no configured `TEST_DATABASE_URL` or available local MySQL login. They remain enabled in the existing isolated-MySQL fixture and must be rerun with the untracked credentials before final acceptance.
- Standards and spec review found no remaining hard code/spec violations after the final fixes; the only unresolved acceptance item is the external MySQL credential prerequisite.
