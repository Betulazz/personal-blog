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

Migration `0012_content_model_and_migration` converts legacy Moments into
Chatters, moves their ordered image metadata, and preserves retired fields and
tag/category relationships in the private `content_migration_archive` table.
It does not move or delete uploaded files. Chatter images are now first-class
references for media deletion checks, and Post/Chatter publication timestamps
retain their first-publication value across unpublish and republish.

## Administrator authentication

After applying migrations, create the first Administrator interactively. There
is no default account and no password bootstrap through environment variables:

```powershell
Push-Location backend
python -m app.cli create-admin
Pop-Location
```

Authentication is exposed under `/api/v1/auth`: `GET /csrf`, `POST /login`,
`POST /refresh`, `POST /logout`, and `GET /me`. Access and refresh JWTs are
HttpOnly cookies. Login, refresh, and logout require the non-HttpOnly CSRF token
from `/csrf` in the `X-CSRF-Token` header. Refresh tokens are rotated and stored
server-side only as SHA-256 digests; reusing a rotated token revokes the user's
remaining refresh sessions.

## GitHub Comments

Visitor comment identity is independent from Administrator authentication.
Configure a GitHub App with the callback URL
`https://<public-host>/api/v1/comments/auth/github/callback` and set
`GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, and
`GITHUB_APP_CALLBACK_URL`. Configure the App webhook at
`https://<public-host>/api/v1/webhooks/github/app` and set
`GITHUB_APP_WEBHOOK_SECRET`. GitHub delivers the `github_app_authorization`
revocation event by default. The app has no email or repository permissions;
GitHub Apps use configured permissions instead of OAuth scope parameters.
Commenters receive a separate
HttpOnly session cookie; revocation webhooks invalidate those sessions. Comments
and likes remain in MySQL. Apply migration `0017_github_comments` before enabling
the GitHub App integration.

## NetEase Music

The public playlist is `GET /api/v1/music-tracks`. Visitors resolve a browser
media URL with `GET /api/v1/music-tracks/{id}/playback` and parsed line lyrics
with `GET /api/v1/music-tracks/{id}/lyrics`; these routes do not require a
NetEase login. Administrators use `POST /api/v1/admin/music-tracks/preview`
and `POST /api/v1/admin/music-tracks` with a decimal `netease_song_id`; both
require administrator authentication and CSRF protection. Playlist edits only
change order or enabled state.

This implementation follows the owner's approved reference-repository fallback
and calls fixed NetEase website endpoints for metadata and lyrics. Those
endpoints are private and undocumented, not partner OpenAPI; the media URL is
the website's outer-song URL. The adapter sends no account cookies and reads no
AppID/AppSecret/PubKey/PrivateKey settings. Visitors do not scan a login QR
code. Migration `0013_netease_music_tracks` archives legacy track rows before
removing the old source fields; it does not delete uploaded media.

## Media Assets

The local Media Asset API is available to an authenticated Administrator at
`/api/v1/admin/media`. Uploads use multipart field `file`; mutating requests
require the same CSRF header as other administration APIs. Validated image and
audio bytes receive generated logical keys and are delivered at `/uploads/<key>`.
Responses expose the logical key and public URL, never the configured
filesystem root. The local adapter writes atomically and never overwrites an
existing key.

Configure `MEDIA_ROOT` for the persistent local upload directory. The default
is `uploads` relative to the backend process. `MEDIA_MAX_UPLOAD_BYTES`,
`IMAGE_MAX_UPLOAD_BYTES`, `IMAGE_MAX_PIXELS`, and `IMAGE_MAX_DIMENSION` enforce
the upload and image-processing limits. Deletion refuses referenced assets and
reports missing-byte or partial-cleanup states instead of silently discarding
metadata. If an upload fails after bytes are written but before metadata is
committed, retry cleanup through the protected
`DELETE /api/v1/admin/media/orphans/<key>` endpoint using the key in the safe
error details.

Import the repository-managed `bg.jpeg` into the Media Asset library and append
it to the current Background Gallery with:

```powershell
Push-Location backend
python -m app.cli import-background
Pop-Location
```

The import is content-addressed and safe to repeat; it preserves the existing
gallery order and other Site Identity fields.

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

## v2 content behavior

The current database head is `0017_github_comments`. Project records use a
Personal or GitHub variant with validated variant-specific fields. The GitHub
variant is manually authored; it does not call the GitHub API or synchronize
repository data. Site Identity stores an ordered Background Gallery of at most
12 entries, each a credential-free HTTPS URL or existing Media Asset path with
alt text. Saving Post Markdown stores its canonical form and derives reading
time on the backend. Tag deletion detaches Post references in the same
transaction as deleting the Tag after the administrator confirms.

These contracts were exercised with the local MySQL integration suite and
production browser acceptance. See the [administrator guide](../docs/administrator-guide.md)
for the verified editing workflows and
[`deployment.md`](../docs/deployment.md#v2-polish-integrated-acceptance-record-2026-09-26)
for exact acceptance commands and evidence limits.

## v2 content behavior

The current database head is `0017_github_comments`. Project records use a
Personal or GitHub variant with validated variant-specific fields. The GitHub
variant is manually authored; it does not call the GitHub API or synchronize
repository data. Site Identity stores an ordered Background Gallery of at most
12 entries, each a credential-free HTTPS URL or existing Media Asset path with
alt text. Saving Post Markdown stores its canonical form and derives reading
time on the backend. Tag deletion detaches Post references in the same
transaction as deleting the Tag after the administrator confirms.

These contracts were exercised with the local MySQL integration suite and
production browser acceptance. See the [administrator guide](../docs/administrator-guide.md)
for the verified editing workflows and
[`deployment.md`](../docs/deployment.md#v2-polish-integrated-acceptance-record-2026-09-26)
for exact acceptance commands and evidence limits.
