# 33: Cloud-server Docker deployment and operations

**What to build:** Package and validate the finished application for reproducible operation on the owner's Docker-capable cloud server without changing the native local development workflow.

**Blocked by:** 32: Animation, responsive, accessibility, and performance convergence.

**Status:** completed

- [x] Production frontend, backend, Nginx, and MySQL images/topology build reproducibly and run without embedding secrets.
- [x] Nginx same-origin routing, public media delivery or S3-compatible resolution, internal networking, health checks, restart behavior, and persistent volumes work.
- [x] Migrations are explicit deployment steps and a clean environment can be brought to the current schema before serving traffic.
- [x] Production cookie, CORS/CSRF, trusted-host, HTTPS termination, logging, and placeholder-secret failure behavior are verified.
- [x] Database and media backup plus restore are documented and rehearsed in a Docker-capable environment representative of deployment.
- [x] Deployment and rollback limitations are documented; image/config scans, health tests, smoke tests, secret scan, and diff review pass.

## Comments

### 2026-09-23

Cloud deployment validated on the owner's Docker-capable Alibaba Cloud host (Ubuntu 26.04, 2 vCPU, 2 GB RAM) at 39.107.122.20, using a self-signed certificate for the HTTPS rehearsal.

- **Topology:** `docker-compose.yml` runs `nginx`, `frontend`, `backend`, and `mysql`; application services are internal-only, MySQL and uploads use named volumes, health checks gate service ordering (backend readiness, frontend TCP, Nginx `/healthz`), containers use `restart: unless-stopped` and `no-new-privileges`, memory limits are tuned for the 2 GB host (MySQL 512 MB, backend/frontend 384 MB, Nginx 64 MB), and logs use `json-file` rotation (10 MB × 5). Nginx gained a plain-HTTP `/healthz`, security headers, gzip, a 55 MB client body bound matching the media upload limit, and a shared `docker/nginx/locations.conf` used by both the HTTP and TLS servers. `docker-compose.tls.yml` + `docker/nginx/tls.conf` add HTTPS termination (HTTP 301, TLS 1.2/1.3, HSTS).
- **Secrets and configuration:** production startup rejects placeholder `JWT_SECRET`/`DATABASE_URL`, insecure cookies, wildcard `CORS_ORIGINS`, and wildcard/absent `TRUSTED_HOSTS`. `.env.example` documents the deployment template; `PIP_INDEX_URL`/`NPM_REGISTRY` support restricted build networks.
- **Explicit migrations:** `docker compose --profile tools run --rm migrate` upgraded an empty database 0001→0011 before traffic; the first Administrator is created interactively (`app.cli create-admin`) only after migration.
- **Small-host build path:** the 2 GB server cannot run the Nuxt build (it exhausted memory and wedged the host). `frontend/Dockerfile.prebuilt` + `docker-compose.prebuilt.yml` assemble a runtime-only image from a `.output` built on a workstation with Node 22.22.2; documented in `docs/deployment.md`.
- **Bugs found by the rehearsal and fixed:**
  - uploaded media was written with mode `600`, so Nginx returned 403; `LocalStorageAdapter` now writes `0644` files and `0755` directories (unit-tested, POSIX-only assertion), and `restore.sh` normalizes restored permissions;
  - Nuxt SSR calls from the frontend container (`Host: backend:8000`) were rejected by the new trusted-host middleware; `TRUSTED_HOSTS` must include `backend` (documented and applied);
  - the frontend Docker health check performed a full SSR fetch and exceeded the 5 s timeout on the small host; it is now a TCP connect check;
  - the TLS Nginx health check followed the HTTP→HTTPS redirect and failed self-signed verification; port 80 now answers `/healthz` directly.
- **Acceptance evidence** (through the public HTTPS origin unless noted): compose config valid for base + TLS; images run non-root (uid 100/1000) with no `.env` and no secret strings in `docker history`; clean migration to head; `/healthz`, liveness, and readiness 200; HTTP 301 → HTTPS 200 with HSTS; attacker `Host` → 400; unauthenticated admin → 401; login without CSRF → 403; session cookies `Secure` + `HttpOnly`; a disallowed CORS origin receives no allow header while the configured origin is echoed; production boot with a placeholder JWT secret exits 1; crashing PID 1 restarted the container and readiness recovered; **17/17 smoke checks passed** (10 anonymous + 7 administrator).
- **Backup and restore rehearsal:** `docker/backup.sh` produced a MySQL dump, uploads archive, manifest with the Alembic revision, and SHA-256 checksums. After mutating a Post title and deleting an uploaded file, `docker/restore.sh --yes` restored both; the mutation disappeared, media returned 200, and readiness and the homepage returned 200. The temporary acceptance Administrator was deleted afterwards; the deployment currently has no default account.
- **Documentation:** `docs/deployment.md` records the runbook, HTTPS options, operations, backup/restore, rollback limits (Alembic downgrades are not a v1 contract; restoring the pre-deployment backup is the schema rollback path), the 2 GB host limit, and the verification table. README and architecture status were updated.
