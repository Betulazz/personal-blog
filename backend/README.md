# Personal Blog Backend

FastAPI application using a Router → Service → Repository → SQLAlchemy → MySQL flow.

The application targets Python 3.12+ and exposes versioned endpoints under `/api/v1`.

## Native MySQL development

The local development loop uses the installed MySQL service. It does not require
Docker. Copy `backend/.env.example` to `backend/.env`, replace the local
placeholder password, and create two databases with a dedicated non-root user:

```powershell
mysql -u root -p -e "CREATE DATABASE personal_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE DATABASE personal_blog_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE USER 'blog'@'127.0.0.1' IDENTIFIED BY 'use-a-local-password'; GRANT ALL PRIVILEGES ON personal_blog.* TO 'blog'@'127.0.0.1'; GRANT ALL PRIVILEGES ON personal_blog_test.* TO 'blog'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

Use a password manager or an untracked `.env` file for the real password. Never
commit the command with a real password. The test database is intentionally
separate from development data.

Run the explicit migration from the backend directory before starting the API:

```powershell
Push-Location backend
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Pop-Location
```

Application startup only opens a connection when a request needs one; it never
creates or upgrades schema implicitly.

## Backend checks

```powershell
Push-Location backend
python -m ruff check .
python -m ruff format --check .
python -m mypy app
python -m pytest
Pop-Location
```

The MySQL integration tests are opt-in through `TEST_DATABASE_URL`. The URL
must point to a dedicated database whose name ends in `_test`. Each test gets a
fresh async session, rolls back its transaction, and clears a dedicated cleanup
probe; the fixture never falls back to SQLite. When the variable is not
configured, the unit/liveness suite still runs and the real-MySQL tests are
reported as skipped. Before upgrading, the fixture downgrades that dedicated
test database to `base` (or tolerates an absent `alembic_version` table), then
upgrades it to `head`. If `TEST_DATABASE_ADMIN_URL` points to an administrative
connection on the `mysql` system database, the fixture recreates and drops the
dedicated `_test` database around the session for a genuinely fresh smoke run.
