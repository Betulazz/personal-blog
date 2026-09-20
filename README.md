# Personal Blog

An independent Nuxt 4 + FastAPI personal blog inspired by the visual language of XingHuiSamaBlogs. Product scope and implementation constraints are defined in `PROJECT_SPEC.md`.

## Status

- Phase 0 reference analysis: complete
- Phase 1 architecture: complete
- UI pages: intentionally not started until the design system is approved

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
