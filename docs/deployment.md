# Deployment

Status: Phase 11 baseline (cloud-server Docker deployment)
Last updated: 2026-09-23

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
- MySQL and uploads are named volumes. Only Nginx publishes host ports.

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
   # small host: rebuild .output on a workstation, transfer it, then
   docker compose -f docker-compose.yml -f docker-compose.prebuilt.yml build frontend
   ```

3. Apply migrations before restarting application containers:

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

If media returns 403 after a manual copy or migration, normalize the volume
permissions (the application writes `0644` files and `0755` directories):

```bash
docker compose exec -T backend sh -c \
  'find /app/uploads -type d -exec chmod 755 {} +; find /app/uploads -type f -exec chmod 644 {} +'
```

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
- Rollback of schema changes: Alembic downgrades are not part of the v1
  contract and have not been rehearsed across releases. The supported schema
  rollback is restoring the pre-deployment backup, which requires the offline
  restore window above.
- There is no blue/green or zero-downtime deployment. Updates briefly recreate
  the application containers; the restore procedure stops Nginx and the
  frontend.
- Media storage is local-only in v1. The storage adapter seam exists, but the
  S3-compatible adapter is not implemented, so media is tied to this host and
  volume. Back it up with the database.
- The topology is single-host. There is no database replication, no shared
  uploads storage, and no automatic failover.
- A self-signed certificate is a rehearsal artifact; production needs a real
  certificate and a hostname (or IP) listed in `TRUSTED_HOSTS`.
- Frontend production builds on a 2 GB host are not reliable; use the
  prebuilt bundle path or a larger build machine.
- The container memory limits in `docker-compose.yml` are tuned for a 2 GB
  host. Raise them on larger hosts if image processing or traffic grows.

## Deployment verification record (2026-09-23)

Host: Ubuntu 26.04, 2 vCPU, 2 GB RAM, Docker Engine 29.1.3, Compose v2.40.3,
self-signed certificate for the rehearsal IP.

| Check | Result |
| --- | --- |
| `docker compose config --quiet` (base and TLS override) | valid |
| Images | backend 366 MB, frontend 282 MB; run as `blog` (uid 100) and `node` (uid 1000) |
| Image content scan | no `.env` files; no secret strings in `docker history` |
| Secret scan (repository, excluding `.env`) | no private keys, cloud keys, or committed secrets |
| Clean migration | `0001_database_foundation` → `0011_post_seo_fields (head)` on an empty database |
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
