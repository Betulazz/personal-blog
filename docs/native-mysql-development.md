# Native MySQL development

The personal blog's local persistence workflow is native: Node.js, Python, and
the installed MySQL 8 service run directly on the development machine. Docker
remains a deployment concern and is not needed for this phase.

## Safe local databases

Use a dedicated least-privilege application user and two databases:

| Database | Purpose |
| --- | --- |
| `personal_blog` | Local development data |
| `personal_blog_test` | Isolated integration-test data |

Both databases must be created with `utf8mb4` and
`utf8mb4_0900_ai_ci`. The application user only needs privileges on those two
databases; do not use `root` in `DATABASE_URL` or `TEST_DATABASE_URL`.

The repository contains only placeholders. Store the real backend and frontend
configuration in untracked per-process files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

The backend file should contain:

```dotenv
DATABASE_URL=mysql+asyncmy://blog:<local-password>@127.0.0.1:3306/personal_blog?charset=utf8mb4
TEST_DATABASE_URL=mysql+asyncmy://blog:<local-password>@127.0.0.1:3306/personal_blog_test?charset=utf8mb4
TEST_DATABASE_ADMIN_URL=mysql+asyncmy://root:<local-root-password>@127.0.0.1:3306/mysql
DATABASE_ISOLATION_LEVEL="READ COMMITTED"
CORS_ORIGINS=["http://127.0.0.1:3000"]
```

`127.0.0.1` is deliberate. Do not widen CORS to `*`, a Docker hostname, or a
LAN address for native development.

## Explicit schema lifecycle

Run migrations from `backend/`:

```powershell
Push-Location backend
python -m alembic upgrade head
python -m alembic current
Pop-Location
```

The FastAPI lifespan disposes the async engine when the process exits but does
not call `create_all`, Alembic, or any other schema-mutating operation. A fresh
database therefore remains untouched until the explicit `upgrade` command is
run.

## Test isolation

`TEST_DATABASE_URL` must use the `mysql+asyncmy` driver and point to a dedicated
database whose name ends in `_test`. The integration fixture upgrades that
database with Alembic, binds HTTPX's FastAPI transport to an async SQLAlchemy
session, and gives each test a fresh session. Test transactions are rolled back,
and a dedicated probe table is truncated before and after each test before it is
dropped during fixture cleanup. The session fixture first downgrades the
dedicated test database to `base` when it has an Alembic version table, then
upgrades it to `head`; an initially empty database is upgraded directly. When
`TEST_DATABASE_ADMIN_URL` is supplied, it recreates the `_test` database before
the run and drops it afterward, so the migration smoke test starts from a
genuinely fresh database. This proves the HTTP boundary and MySQL-specific
behavior without accepting SQLite as a proxy.

Run all backend checks with:

```powershell
Push-Location backend
python -m ruff check .
python -m ruff format --check .
python -m mypy app
python -m pytest
Pop-Location
```

Without `TEST_DATABASE_URL`, real-MySQL tests are explicitly skipped. They must
be enabled before claiming database integration acceptance.
