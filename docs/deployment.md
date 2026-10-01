# Deployment

Status: v1 Docker deployment baseline; v2 native acceptance recorded (Docker not rerun)
Last updated: 2026-09-30

This runbook covers the containerized production topology for a single
Docker-capable Linux host. Native Windows development is documented separately
in [`native-mysql-development.md`](native-mysql-development.md) and is not
affected by anything here.

## Topology

```text
                Internet
                   │ 80/443
                   ▼
              ┌─────────┐        uploads volume (read-only)
              │  nginx  │──────────────────────────────┐
              └────┬────┘                              │
        /api/*     │      everything else              │ /uploads/*
                   ▼                                   │
              ┌─────────┐      ┌──────────┐             │
              │ backend │      │ frontend │             │
              │ FastAPI │      │ Nuxt SSR │             │
              └────┬────┘      └────┬─────┘             │
                   │ internal HTTP   │ internal HTTP     │
                   │ to FastAPI      │ (runtime config)  │
                   ▼                 │                   │
              ┌─────────┐            │                   │
              │  mysql  │            │                   │
              └─────────┘            │                   │
                   ▲                 │                   │
                   └─────────────────┘                   │
                                                         ▼
                                        /var/www/uploads (named volume)
```

- The browser sees one origin. Nginx serves `/api/*` through FastAPI,
  `/uploads/*` from the uploads volume, and every other path through Nuxt SSR.
- The Nuxt server calls the API over the internal Compose network
  (`http://backend:8000/api/v1`); the browser calls same-origin `/api/v1`.
- MySQL, uploads, and the backend uptime checkpoint are named volumes. Only
  Nginx publishes host ports.

## Host requirements

- Docker Engine with the Compose v2 plugin (`docker compose`).
- 2 vCPU and 2 GB RAM is the smallest validated host. The baseline Compose
  file caps container memory (MySQL 512 MB, backend and frontend 384 MB,
  Nginx 64 MB) and tunes MySQL for small hosts.
- On hosts with less than ~4 GB RAM, do not run the full multi-stage frontend
  build on the server. Use the prebuilt bundle path below. Building Nuxt on a
  2 GB host can exhaust memory and make the machine unresponsive.
- Ports 80 and 443 reachable from the internet (or from the load balancer).
- The backend must not be published; it is only reachable on the Compose
  network.

## First deployment

1. Transfer the repository to the host (git clone or archive) and enter it.

2. Create the deployment environment file:

   ```bash
   cp .env.example .env
   chmod 600 .env
   ```

   Generate real values for `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and
   `JWT_SECRET` (`openssl rand -base64 48`). Keep `DATABASE_URL` in sync with
   `MYSQL_PASSWORD`. Set:

   - `PUBLIC_SITE_URL` to the public HTTPS origin.
   - `CORS_ORIGINS` to the public origin (same-origin traffic does not need
     CORS; do not add wildcards).
   - `TRUSTED_HOSTS` to the public hostname or IP, plus `127.0.0.1` (Docker
     health checks) and `backend` (Nuxt SSR calls over the Compose network).
     Production startup rejects `*`.
   - `COOKIE_SECURE=true` and an explicit `COOKIE_SAMESITE` when HTTPS is used.
   - To enable visitor comments, create a GitHub App and set
     `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, and
     `GITHUB_APP_CALLBACK_URL` in `.env`. Register the callback exactly as
     `https://<public-host>/api/v1/comments/auth/github/callback`. Configure the
     App webhook at `https://<public-host>/api/v1/webhooks/github/app` and set
     its secret in `GITHUB_APP_WEBHOOK_SECRET`. GitHub delivers the
     `github_app_authorization` revocation event by default. The App needs no
     repository or email permission. GitHub Apps use configured permissions
     instead of OAuth scope parameters. Without these values, comment reading
     stays available and GitHub login reports that it is not configured.

3. Provide the TLS certificate (see "HTTPS termination") in `docker/certs/`,
   or skip this and run the base HTTP Compose file for a local rehearsal.

4. Build the images. Choose one path:

   - Standard host (≥ 4 GB RAM):

     ```bash
     docker compose build
     ```

   - Small host (2 GB RAM): build `.output` on a workstation with Node 22.22.2
     and ship it, then assemble the runtime-only image on the server.

     ```bash
     # workstation
     cd frontend
     npm ci
     npm run build
     tar -czf frontend-output.tar.gz -C . .output
     scp frontend-output.tar.gz root@<host>:/root/

     # server
     cd /opt/personal-blog/frontend
     rm -rf .output && tar -xzf /root/frontend-output.tar.gz
     cd /opt/personal-blog
     docker compose -f docker-compose.yml -f docker-compose.prebuilt.yml build frontend
     docker compose build backend
     ```

   In restricted networks, set `PIP_INDEX_URL` and `NPM_REGISTRY` in `.env`
   before building.

5. Apply migrations explicitly. Application startup never changes the schema.
   For an existing v1 installation, complete and verify a MySQL plus uploads
   backup before this step. Migrations `0012`–`0014` archive retired values
   before removing active legacy schema, while `0015`–`0016` add the Project
   variants and Background Gallery setting; these migrations are not an
   in-place rollback path. See "Rollback and known limitations" below.

   ```bash
   docker compose --profile tools run --rm migrate
   ```

6. Create the first Administrator interactively. No default account or
   environment-variable password bootstrap exists.

   ```bash
   docker compose run --rm backend python -m app.cli create-admin
   ```

7. Optionally load the example public content (no Administrator is created):

   ```bash
   docker compose exec -T backend python -m app.cli seed-public
   ```

8. Start the stack. Use the TLS override when serving HTTPS, and add the
   prebuilt override if that is how the frontend image was built.

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
   ```

9. Verify:

   ```bash
   docker compose ps
   docker compose exec -T nginx nginx -t

   BASE_URL=https://<host> CURL_INSECURE=1 \
     SMOKE_ADMIN_USERNAME=<admin> SMOKE_ADMIN_PASSWORD=<password> \
     docker/smoke.sh
   ```

   `docker/smoke.sh` checks Nginx, liveness, readiness, server-rendered
   homepage, uploads fallback, trusted-host rejection, unauthenticated admin
   rejection, security headers, HSTS on HTTPS, CSRF rejection, login, cookie
   flags, current session, dashboard, and logout. The administrator section is
   skipped when credentials are not supplied.

## Routine update

1. Fetch the new revision on the host.
2. Rebuild only what changed:

   ```bash
   docker compose build backend
   # Keep the one-shot migration image current with the backend code.
   docker compose --profile tools build migrate
   # small host: rebuild .output on a workstation, transfer it, then
   docker compose -f docker-compose.yml -f docker-compose.prebuilt.yml build frontend
   ```

3. Apply migrations before restarting application containers. If the release
   contains schema changes, take and verify a database and uploads backup
   first. Current schema head: `0017_github_comments`. This migration creates
   the About discussion and a thread for every currently published Post. A
   downgrade drops all Commenters, sessions, Comments, replies, likes, and
   moderation state created by the feature; restore a database backup to recover
   that data after downgrade.

   ```bash
   docker compose --profile tools run --rm migrate
   ```

4. Recreate containers:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
   ```

5. Re-run `docker/smoke.sh` and check `docker compose logs --tail=200 backend
   frontend nginx` for unexpected errors.

## HTTPS termination

TLS terminates at Nginx using `docker-compose.tls.yml`, which mounts
`docker/nginx/tls.conf` and `docker/certs/`. The TLS configuration:

- redirects HTTP to HTTPS with `301`,
- serves TLS 1.2/1.3 with HSTS (`max-age=31536000`),
- keeps the same upstreams and server directives as the HTTP configuration
  through `docker/nginx/upstreams.conf` and `docker/nginx/server-common.conf`.

Certificate options:

- A certificate issued by the cloud provider or any CA: copy the full chain to
  `docker/certs/fullchain.pem` and the key to `docker/certs/privkey.pem`
  (`chmod 600`).
- Let's Encrypt: issue the certificate on the host (standalone or DNS
  challenge), copy the files into `docker/certs/`, and reload Nginx with
  `docker compose exec nginx nginx -s reload` after each renewal. Let's
  Encrypt also issues short-lived certificates for bare IP addresses; those
  require fully automated renewal every few days.
- Self-signed: acceptable only for rehearsal. Browsers warn until a real
  certificate is installed.

Cloud certificate auto-deployment (Aliyun): the certificate service can write
files on the ECS host and run a command after each deployment or renewal. Point
it at the staging directory and let `docker/apply-certificate.sh` assemble the
Nginx files and reload the container:

| Field | Value |
| --- | --- |
| Certificate path | `/opt/personal-blog/docker/certs/deploy/cert.pem` |
| Private key path | `/opt/personal-blog/docker/certs/deploy/privkey.pem` |
| Certificate chain path | `/opt/personal-blog/docker/certs/deploy/chain.cer` |
| Restart command | `bash /opt/personal-blog/docker/apply-certificate.sh` |

The script concatenates the leaf certificate and the chain into
`docker/certs/fullchain.pem`, installs the key with mode `600`, prints the
subject and SANs, and reloads Nginx. Renewal deployments reuse the same command.

If TLS terminates at a cloud load balancer or CDN instead, keep the base
Compose file (no TLS override), point the load balancer at the host's port 80,
and keep `COOKIE_SECURE=true` so browsers only send the session over HTTPS.
The backend trusts `X-Forwarded-*` headers from the internal network only:
`FORWARDED_ALLOW_IPS=*` is safe because port 8000 is not published. If you
deploy FastAPI independently and publish its port, set `FORWARDED_ALLOW_IPS`
to the proxy addresses instead of `*`.

## Operations

Health and recovery:

- `GET /healthz` (Nginx) is a static liveness probe.
- `GET /api/v1/health/live` proves the process is up.
- `GET /api/v1/health/ready` proves the database is reachable; Docker uses it
  as the backend health check, and Nginx starts only after the frontend and
  backend are healthy.
- The frontend Docker check is a TCP connect check, not a full SSR request, so
  a small host is not rendering the homepage every 15 seconds. Real SSR
  behavior is covered by `docker/smoke.sh` and the public pages.
- Containers use `restart: unless-stopped`; a crashed process is restarted
  automatically. `docker compose stop` is required to keep a service down.
- Logs go to stdout/stderr and are rotated by the Docker `json-file` driver
  (`max-size=10m`, `max-file=5`):

  ```bash
  docker compose logs -f backend
  docker compose logs --tail=200 nginx
  ```

Persistent state:

- `personal-blog_mysql-data` holds the database.
- `personal-blog_uploads` holds local Media Asset bytes. The `uploads` volume
  is mounted read-only into Nginx at `/var/www/uploads`.
- `personal-blog_uptime-data` holds the cumulative FastAPI runtime checkpoint.

If media returns 403 after a manual copy or migration, normalize the volume
permissions (the application writes `0644` files and `0755` directories):

```bash
docker compose exec -T backend sh -c \
  'find /app/uploads -type d -exec chmod 755 {} +; find /app/uploads -type f -exec chmod 644 {} +'
```

## Cumulative runtime counter

The public homepage reports cumulative time while the FastAPI backend process is
running. A graceful stop saves the current total, and the next start continues
from it. The backend also checkpoints every 15 seconds to limit lost time if a
process exits without its shutdown hook. Docker Compose stores this state in the
`uptime-data` named volume mounted at `/app/data`; keep that volume when updating
the application. Removing volumes with `docker compose down -v` also removes the
counter. For a non-Compose deployment, set `UPTIME_STATE_FILE` to a file on
persistent storage.

## Backup and restore

`docker/backup.sh` writes a timestamped MySQL dump, a tar archive of the
uploads volume, a manifest with the Alembic revision, and a SHA-256 checksum
file into `./backups` (gitignored):

```bash
docker/backup.sh /root/backups
```

`docker/restore.sh` restores a dump and optionally the uploads archive. It
verifies the SHA-256 checksums when the backup's `-sha256sums.txt` file is
next to the dump, stops Nginx and the frontend for the duration (offline
restore), normalizes media permissions so Nginx can serve restored files, and
reports the Alembic revision afterwards:

```bash
docker/restore.sh --yes /root/backups/<stamp>-mysql.sql.gz \
  /root/backups/<stamp>-uploads.tar.gz
```

Schedule backups with cron, keep at least one copy off the host, and verify
restores on a scratch stack periodically.

Rehearsal record (2026-09-23, the same 2 GB cloud host):

- Seeded public content and uploaded a Media Asset; `GET /uploads/...`
  returned 200 through Nginx.
- `docker/backup.sh` produced a dump, uploads archive, manifest, and checksums.
- Mutation after backup: one Post title was prefixed with `MUTATED-` and the
  uploaded media file was deleted. The public API showed the mutated title and
  the media URL returned 404.
- `docker/restore.sh --yes` restored both artifacts. The mutated title
  disappeared, the media URL returned 200, readiness returned 200, and the
  homepage rendered again.
- The rehearsal exposed and drove fixes for two real bugs: uploaded media was
  written with mode `600` (Nginx returned 403) and internal Nuxt SSR calls
  were rejected by the trusted-host middleware because `backend` was missing
  from `TRUSTED_HOSTS`.

## Rollback and known limitations

- Rollback of application code: rebuild or retag the previous revision and
  recreate the containers. Keep the previous `.output` bundle or image tag
  until a deployment is proven.
- Rollback of schema changes: Alembic downgrades across migrations `0012`–`0016`
  are not a supported restore plan. Restore the verified pre-upgrade MySQL and
  uploads backup using the offline restore window above.
- There is no blue/green or zero-downtime deployment. Updates briefly recreate
  the application containers; the restore procedure stops Nginx and the
  frontend.
- Media storage is local-only in the current release. The storage adapter seam
  exists, but the S3-compatible adapter is not implemented, so media is tied to
  this host and volume. Back it up with the database.
- Migrations `0012_content_model_and_migration`, `0013_netease_music_tracks`,
  and `0014_automatic_metadata` preserve retired content fields,
  relationships, music rows, and manual metadata in the private
  `content_migration_archive` table before dropping active legacy tables or
  columns. They do not delete uploaded bytes. Verify the archive after
  migration and retain the pre-upgrade backup.
- The topology is single-host. There is no database replication, no shared
  uploads storage, and no automatic failover.
- A self-signed certificate is a rehearsal artifact; production needs a real
  certificate and a hostname (or IP) listed in `TRUSTED_HOSTS`.
- Frontend production builds on a 2 GB host are not reliable; use the
  prebuilt bundle path or a larger build machine.
- The container memory limits in `docker-compose.yml` are tuned for a 2 GB
  host. Raise them on larger hosts if image processing or traffic grows.

## v2 integrated acceptance record (2026-09-25)

This is native application acceptance, separate from the historical v1 Docker
rehearsal below. Docker was unavailable on the development host, so this record
does not claim that the v2 Compose images or deployment flow were rebuilt or
rehearsed.

| Check | Result |
| --- | --- |
| Host runtime | Windows; Python 3.14.6; MySQL 8.0.44; system Node 22.20.0. Frontend checks ran under temporary Node 22.22.2 via `npm exec`; no package dependency or lockfile change was made for that runtime. |
| Migration | A fresh isolated `personal_blog_test` database migrated from `0001_database_foundation` through `0014_automatic_metadata`; native MySQL tests also exercised archive and schema behavior. |
| Backend | Ruff checks and format check passed; `mypy app` passed (79 modules); full native MySQL suite: 62 passed, 1 skipped, 13 warnings. |
| Frontend | Prettier check, ESLint, Nuxt typecheck, and production build passed; Vitest: 136 passed. |
| Browser workflow | Native Playwright exercised Nuxt against the live FastAPI service and isolated MySQL acceptance database. One full run had 31 passed and one stale toolbar locator failure; after correcting the locator to check the rendered ARIA attribute and button dimensions, the same Chromium workflow passed separately. Across the full run and targeted rerun, all 32 cases passed. |
| Responsive pages | Public and administration acceptance use the required 375×812, 430×932, 768×1024, 1024×768, 1440×900, and 1920×1080 viewports and check horizontal overflow; music and timeline screenshots are fixture-backed visual evidence, not live provider data. |
| NetEase anonymous endpoints | Direct, unauthenticated checks for song `347230`: metadata returned HTTP 200 and the expected song; lyrics returned HTTP 200 with provider code 200 and 49 source lines. The outer-media URL redirected to `music.163.com`; following it reached `/404` and redirected again without a media content type. The tested song was not verified playable. |
| Authorization and entitlement | No QR authorization, account cookie, paid entitlement, or app credential was used. Mocked provider tests establish request parsing and access boundaries only. This run verifies anonymous endpoint responses for metadata and lyrics, not real account authorization, entitlement, or reliable playback. |
| Docker deployment | Not run locally: Docker is unavailable on the development host. The historical v1 cloud rehearsal below does not validate the v2 schema or images. |

The native browser report also emitted Nuxt development diagnostics (`NUXT_E4011`
and `nostics`) and a SQLAlchemy/asyncmy connection-close warning while stopping
the test server. They did not fail the passing tests; individual acceptance
records identify browser assertions and harness corrections.

## Historical v1 deployment verification record (2026-09-23)

Host: Ubuntu 26.04, 2 vCPU, 2 GB RAM, Docker Engine 29.1.3, Compose v2.40.3,
self-signed certificate for the rehearsal IP.

| Check | Result |
| --- | --- |
| `docker compose config --quiet` (base and TLS override) | valid |
| Images | backend 366 MB, frontend 282 MB; run as `blog` (uid 100) and `node` (uid 1000) |
| Image content scan | no `.env` files; no secret strings in `docker history` |
| Secret scan (repository, excluding `.env`) | no private keys, cloud keys, or committed secrets |
| Clean migration | `0001_database_foundation` → `0011_post_seo_fields` on an empty database |
| Health checks | `/healthz`, `/health/live`, `/health/ready` all 200; backend and frontend Docker health checks healthy |
| HTTPS termination | HTTP 301 to HTTPS; TLS 1.2/1.3; HSTS; certificate SAN matches the rehearsal IP |
| Trusted host | external `Host: attacker.example.com` → 400; internal `backend` SSR calls allowed |
| CORS | disallowed origin receives no `access-control-allow-origin`; configured origin is echoed |
| Cookies | session cookies `Secure` and `HttpOnly` |
| CSRF | login without a CSRF header → 403 |
| Placeholder secrets | production startup with a `replace-with-` JWT secret exits 1 |
| Smoke test | 17/17 checks passed through the public HTTPS origin |
| Restart behavior | crash of PID 1 restarted the container (restart count incremented, readiness returned to 200) |
| Backup and restore | dumped, mutated, restored, and verified as described above |
| Logging | stdout logs collected by `json-file` with 10 MB × 5 rotation |
| Persistent volumes | `personal-blog_mysql-data` and `personal-blog_uploads` survive container recreation |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | `production` enables the strict security validation |
| `LOG_LEVEL` | Application log level |
| `PUBLIC_SITE_URL` | Public HTTPS origin used for canonical and social URLs |
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | MySQL container initialization |
| `DATABASE_URL` | Backend connection string; must contain the real password |
| `JWT_SECRET` | Signs access and refresh tokens; at least 32 characters |
| `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS` | Session lifetimes |
| `COOKIE_SECURE`, `COOKIE_SAMESITE` | Cookie policy; `COOKIE_SECURE=false` is rejected in production |
| `CORS_ORIGINS` | JSON list of allowed browser origins; wildcards rejected |
| `TRUSTED_HOSTS` | JSON list of accepted `Host` headers; wildcards rejected in production |
| `FORWARDED_ALLOW_IPS` | Which proxies may set `X-Forwarded-*`; the backend is internal-only |
| `PIP_INDEX_URL`, `NPM_REGISTRY` | Build-time package mirrors for restricted networks |

The approved NetEase fallback requires no environment configuration. It makes
anonymous requests to fixed website endpoints; it does not use QR login, paid
account entitlement, cookies, or AppID/AppSecret/PubKey/PrivateKey. Do not add
those values to deployment secrets or expose them to the Nuxt client.

## v2 polish integrated acceptance record (2026-09-26)

This record verifies ticket 08 against the 2026-09-26 production frontend and
native MySQL backend. Evidence is kept outside the repository so generated
screenshots and browser reports are not mistaken for source files:

`C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\`

The [matrix index](C:/Users/Birchtula/.codex/visualizations/2026/09/26/01a0dca0-957b-7ba3-9824-a54f7923e97c/personal-blog-v2-polish-acceptance/matrix-index.md)
links 168 viewport and full-page PNGs (14 surfaces × six CSS viewport sizes ×
two captures), two Background Gallery captures, six design-system viewport
captures, 24 Timeline/Music viewport and full-page captures, and the successful
production build log. The matrix includes public Home, Posts, Timeline,
Chatter, Music, Projects, Friends, About and admin Post, Tag, Project, Chatter,
friend-link, and Site Identity editors. The fidelity ledger links and compares
the accepted saved references directly with the latest images.

### Exact commands and outcomes

Frontend unit, type, lint, and format checks used Node 22.22.2 from the npm
runtime bundle because the installed system Node is 22.20.0:

```powershell
npm exec --yes --package=node@22.22.2 -- npm run test:unit
npm exec --yes --package=node@22.22.2 -- npm run typecheck
npm exec --yes --package=node@22.22.2 -- npm run lint
npm exec --yes --package=node@22.22.2 -- npm run format:check
```

Outcomes: 140 unit tests passed across 18 files; typecheck, ESLint, and format
verification passed. Vitest emitted a non-failing HappyDOM async-task cleanup
diagnostic after its passing result.

Production build environment and command:

```powershell
$env:NUXT_E2E_DISABLE_TYPECHECK = 'true'
$env:NUXT_API_BASE = 'http://127.0.0.1:8787/api/v1'
$env:NUXT_DESIGN_SYSTEM_FIXTURES = 'true'
$env:NUXT_PUBLIC_API_BASE = 'http://127.0.0.1:8787/api/v1'
$env:PUBLIC_SITE_URL = 'http://127.0.0.1:3102'
npm exec --yes --package=node@22.22.2 -- npm run build
```

Outcome: production build exited 0. The log is
[production-build-final.log](C:/Users/Birchtula/.codex/visualizations/2026/09/26/01a0dca0-957b-7ba3-9824-a54f7923e97c/personal-blog-v2-polish-acceptance/production-build-final.log).
Nuxt reported the existing large-chunk warning and dependency trailing-slash
resolution warnings; these did not fail the build.

The production acceptance used this environment and command:

```powershell
$env:POLISH_ACCEPTANCE_REUSE_SERVERS = 'true'
$env:POLISH_ACCEPTANCE_EVIDENCE = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance'
$env:POLISH_ACCEPTANCE_RESULTS = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\playwright-results-final'
$env:VISUAL_REFINEMENT_EVIDENCE = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\visual-refinement'
$env:DESIGN_SYSTEM_EVIDENCE_DIR = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\design-system'
npm exec --yes --package=node@22.22.2 -- npm run test:e2e:polish
```

Outcome: 115 passed and three intentional skips (8.2 minutes) across desktop
Chromium and Pixel 7. The screenshot matrix itself runs once in the desktop
project; its duplicate mobile matrix capture is skipped, as is the separate
portfolio viewport matrix on mobile. Browser checks found no horizontal
overflow, application error page, relevant console error, or failed server
response. Desktop cumulative layout shift was 0.0006 and p95 interaction time
24.8 ms; Pixel 7 cumulative layout shift was 0, p95 25.7 ms, maximum 33.9 ms,
and longest task 0 ms. Browser reports are retained under
`playwright-results-final/` in the evidence directory above. The editor
readiness/save synchronization regression test was also repeated ten times in
production Chromium and all ten attempts passed.

Backend quality and migration commands, run from `backend/`:

```powershell
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run alembic heads
uv run pytest -q -rs tests/test_content_model_migration.py tests/test_project_variant_migration.py tests/test_background_gallery_contract.py
```

Outcomes: 83 passed, one skipped, and 15 deprecation warnings in the full
backend suite; Ruff checks passed, Ruff format reported 123 files formatted,
and mypy reported no errors in 80 source files. Alembic reported
`0016_background_gallery (head)`. The targeted representative-data/content,
Project variant, and gallery migration/contract tests exited 0 on native MySQL
8.0.44. The suite exercised supported legacy fixture data and an empty test
schema. The environment was Python 3.14.6 with uv.

### Limits and intentional deviations

- Local mock API fixtures were used for all production browser runs. This
  verifies request and interface behavior but does not prove real NetEase
  account authorization, paid entitlement, durable playback, media availability,
  provider album art, or lyric timing from a live provider. Music may therefore
  show its fallback disc and no active lyric in captures.
- No GitHub API call or credential is configured; GitHub Projects are manually
  authored in this release.
- Docker and the browser plugin were unavailable. Playwright's local Chromium
  runner was used; v2 Docker/Compose deployment and container database upgrade
  were not exercised on this host. Native MySQL integration and migration tests
  did pass.
- Playwright color-environment warnings were benign. The only browser skips
  were the two duplicate mobile-only matrix jobs and mobile portfolio viewport
  matrix described above.
- Direct visual comparison confirms the current 夜航手记 pages retain older
  XingHuiSama references' broad layout and visual rhythm but intentionally use
  the current brand, copy, and v2 navigation. This is not pixel-identical
  reference content. Exact measurements and the inspected images are recorded
  in [`personal-blog-v2-polish-fidelity-ledger.md`](personal-blog-v2-polish-fidelity-ledger.md).
