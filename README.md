# Personal Blog

An independent Nuxt 4 + FastAPI personal blog inspired by the visual language of XingHuiSamaBlogs. Product scope and implementation constraints are defined in `PROJECT_SPEC.md`.

## Status

- Phase 0 reference analysis: complete
- Phase 1 architecture: complete
- Public design system, pages, APIs, and native live acceptance: complete
- Administration UI and native workflow acceptance: complete
- Animation, responsive, accessibility, and performance convergence: complete
- Cloud-server Docker deployment and operations: complete
- Final v1 regression and release decision: complete (v1 release-ready)
- v2 native integrated acceptance: complete; see [issue 07](.scratch/personal-blog-v2/issues/07-integrated-acceptance.md) and the [2026-09-25 verification record](docs/deployment.md#v2-integrated-acceptance-record-2026-09-25). Docker deployment was not revalidated for v2.
- v2 polish acceptance: complete; see [ticket 08](.scratch/personal-blog-v2-polish/issues/08-run-integrated-polish-acceptance.md), the [2026-09-26 acceptance record](docs/deployment.md#v2-polish-integrated-acceptance-record-2026-09-26), and the [fidelity ledger](docs/personal-blog-v2-polish-fidelity-ledger.md). The browser run used local API fixtures; external playback and Docker deployment were not revalidated.

## Repository layout

```text
frontend/   Nuxt 4 public site and administration UI
backend/    FastAPI application and Alembic migrations
docker/     Nginx and deployment support
docs/       Research, architecture, ADRs, and plans
```

## Local prerequisites

- Node.js 22.22.2 or newer active LTS
- Python 3.12 or newer
- MySQL 8 with `utf8mb4`
- Docker Compose for the later containerized deployment workflow

For native development, copy `backend/.env.example` to `backend/.env` and
`frontend/.env.example` to `frontend/.env`, then replace the local database
placeholder. The root `.env.example` remains the Docker deployment template;
Docker is not required for local development.

Native database setup and migration commands are documented in
[`docs/native-mysql-development.md`](docs/native-mysql-development.md).

Production container topology, migrations, HTTPS, backup/restore, rollback
limits, and the deployment verification record are documented in
[`docs/deployment.md`](docs/deployment.md).
