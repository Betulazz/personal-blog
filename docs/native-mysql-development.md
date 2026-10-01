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

Run this step after pulling changes that add migrations, before starting the
updated backend. Integration tests migrate only `TEST_DATABASE_URL`; they do
not upgrade the running application's `DATABASE_URL` database.

If comment requests report MySQL `1054` with
`Unknown column 'comments.admin_read_at'`, the running database is missing
`0018_comment_read_receipts`. Apply the commands above to the local development
database. This migration adds the nullable read receipt and its index without
rewriting existing comments or timestamps. Restarting the application alone
does not apply migrations.

To populate the native development database with the public content used by
the live browser acceptance run, apply migrations first and then run the
idempotent seed command:

```powershell
Push-Location backend
python -m alembic upgrade head
python -m app.cli seed-public
Pop-Location
```

The seed command only upserts its fixed public acceptance records, creates the
Site Identity when it is absent, and never creates or changes an Administrator.
Selected sample audio and image records intentionally point at unavailable
local media so the public recovery states are exercised without scraping or
proxying any third-party catalog.

The FastAPI lifespan disposes the async engine when the process exits but does
not call `create_all`, Alembic, or any other schema-mutating operation. A fresh
database therefore remains untouched until the explicit `upgrade` command is
run.

The current schema head is `0019_prune_deleted_roots`. It follows `0012`'s
Moment-to-Chatter conversion and private archive, `0013`'s archive-first
NetEase-only playlist migration, `0014`'s archive of retired manual SEO
overrides, `0015`'s migration of existing Projects to the Personal variant,
`0016`'s empty initial Background Gallery setting, `0017`'s locally owned
GitHub-identified Comments, `0018`'s explicit administrator read receipts, and
`0019`'s removal of empty deleted root placeholders. Migration `0019` removes
only deleted roots with no body and no replies; visible/hidden comments and
deleted roots with surviving replies remain. A downgrade does not resurrect
these already-deleted placeholders. Back up an existing database before
upgrading it. Migrations `0012`–`0014` remove active legacy
columns and tables after archiving their values; the supported schema rollback
is restoring a verified pre-upgrade backup, not an Alembic downgrade. Uploaded
media bytes are not moved or deleted by these migrations.

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

The NetEase website adapter does not require environment credentials, a QR
session, or a browser account. Its endpoint behavior is checked separately
from fixture-driven provider contract tests; do not treat either as proof of a
visitor's playback entitlement.
