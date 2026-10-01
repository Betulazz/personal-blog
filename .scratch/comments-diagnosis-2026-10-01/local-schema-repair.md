# Local comment API failure after implementation

Status: resolved (local runtime only)

## Symptom and cause

The attached log reports HTTP 500 for public comment loading and administrator
unread counts, with MySQL 1054: missing `comments.admin_read_at`.
The local runtime database was still at `0017_github_comments`; the source head
was `0018_comment_read_receipts`, and information_schema confirmed the column
was absent. Alembic and application services load the same Settings database URL
from the backend working directory. Earlier integration acceptance migrated the
dedicated test database only, leaving the local runtime schema stale.

## Reproduction and repair

Run from `backend/`:

```powershell
.\.venv\Scripts\python.exe ..\.scratch\comments-diagnosis-2026-10-01\debug\local_schema_probe.py
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe ..\.scratch\comments-diagnosis-2026-10-01\debug\local_schema_probe.py
```

Before: probe exit 1, unread-count service MySQL 1054, About plus Posts
6/5/127/4 comment endpoints all HTTP 500. After: probe exit 0, current revision
0018, unread-count service returns 3, all five public endpoints HTTP 200.
The initial attempt used nonexistent Post 3 and returned 404; the final probe
selects actual published Posts with Comment Threads to exercise the reported bug.

The existing three Comment rows, excluding only the newly added receipt field,
have identical SHA256 before and after:
`ee484976fa94d30c347802da50874a9e88d6be5a85baa0dadc53af584f4a35d3`.
The repair used the existing additive migration; it did not modify comment
contents/timestamps or mark any comments as read. The read-only probe was kept
in the clearly marked debug directory and prints no credentials or comment text.

## Regression and scope

- 14 tests passed: database foundation, comment admin contract, comment MySQL
  integration, Markdown. The migration foundation test now checks the physical
  nullable datetime receipt column and ordered index columns in addition to
  checking the revision number.
- Ruff check and format check passed for the changed test; git diff --check passed.
- Repeated the local probe after tests: all services/endpoints still pass,
  historical comment fingerprint unchanged.
- Native MySQL documentation now names 0018 and explains that test database
  migration does not migrate the application's database.
- No application startup auto-migration was introduced. No cloud deployment,
  cloud migration, comment acknowledgement, commit, or unrelated staged edit.
- This is live local API/database verification, not browser or cloud acceptance.
