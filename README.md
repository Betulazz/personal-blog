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
- Docker Compose for the containerized workflow

Copy `.env.example` to `.env` and replace every placeholder secret before starting a full local stack.
