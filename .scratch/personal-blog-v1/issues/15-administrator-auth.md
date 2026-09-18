# 15: Administrator authentication and secure sessions

**What to build:** Allow a deliberately bootstrapped Administrator to authenticate, refresh, inspect, and end a secure session through tested HTTP behavior.

**Blocked by:** 14: Native MySQL migrations and integration-test foundation.

**Status:** ready-for-agent

- [ ] The first Administrator is created through an explicit interactive CLI and no default or environment-bootstrap password exists.
- [ ] Passwords use the approved strong hashing policy and sensitive fields never enter response schemas or logs.
- [ ] Login, current-user, refresh rotation/revocation, logout, expired access, reused refresh, and invalid credentials have stable HTTP behavior.
- [ ] Access and refresh credentials use HttpOnly cookies with explicit development and production attributes plus an appropriate CSRF strategy.
- [ ] Expected errors use safe envelopes and unexpected failures reveal no secrets, SQL, internal paths, or tracebacks.
- [ ] Real-MySQL HTTP tests, CLI tests, Ruff, Mypy, Pytest, secret scan, and diff review pass.

