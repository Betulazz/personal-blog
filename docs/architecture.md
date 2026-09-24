# Architecture

Status: Phase 1 baseline  
Last updated: 2026-09-24

## Goals

- Keep the public experience server-rendered, indexable, and fast on low-powered mobile devices.
- Keep the frontend and backend independently deployable and connected through a versioned REST API.
- Enforce Router → Service → Repository → SQLAlchemy → MySQL on backend request paths.
- Keep Pydantic schemas separate from SQLAlchemy models.
- Keep Markdown and media portable across editor, storage, and deployment choices.
- Favor a small, understandable architecture appropriate for one personal blog.

## System topology

```text
Browser
  │
  ▼
Nginx
  ├── /api/* ─────────► FastAPI
  │                       │
  │                       ▼
  │                 Service layer
  │                       │
  │                       ▼
  │                Repository layer
  │                       │
  │                       ▼
  │              SQLAlchemy AsyncSession
  │                       │
  │                       ▼
  │                    MySQL 8
  │
  ├── /uploads/* ─────► local volume or object-storage delivery
  │
  └── all other paths ► Nuxt 4 SSR
                          │
                          └── server-side API calls to FastAPI
```

The browser sees one public origin in production. Nginx terminates HTTP, proxies API requests, serves local upload files when that adapter is selected, and forwards application routes to the Nuxt Node server.

## Frontend

### Runtime

- Nuxt 4 with SSR enabled.
- Vue 3 Composition API and `<script setup>`.
- TypeScript strict mode and build-time type checking.
- Tailwind CSS 4 through the official Vite plugin.
- Reka UI and shadcn-vue source components for accessible interaction primitives.
- Pinia only for genuinely cross-route client state such as the music player and authenticated administrator session presentation.
- VueUse for focused browser/composable utilities.
- Motion for Vue for purposeful transitions; reduced-motion behavior is mandatory.
- Nitro server routes serve `/robots.txt` and `/sitemap.xml` from the configured public origin and published API content; both are reachable through the Nginx frontend upstream.

### Boundaries

```text
app/pages/          route composition and data orchestration
app/layouts/        public and admin shells
app/components/ui/  design-system primitives
app/components/*/   domain-facing composed components
app/composables/    reusable SSR-safe behavior
app/stores/         small cross-route state only
app/types/          API and view contracts
app/utils/          pure helpers
```

Pages do not contain duplicated request logic or large visual primitives. API access will be centralized behind a typed composable/client boundary. Nuxt SSR credentials are forwarded deliberately; browser-side requests use same-origin `/api/v1` in production.

### Data fetching

- Public route data uses Nuxt `useFetch`/`useAsyncData` through typed wrappers.
- SSR output provides the first meaningful content and SEO metadata.
- Hydration must not repeat a request already resolved on the server.
- Cache/revalidation rules are explicit per resource rather than hidden in a global store.
- Mutations invalidate the smallest relevant query set.

## Backend

### Request flow

```text
FastAPI router
  │ validates transport input and maps HTTP semantics
  ▼
Service
  │ owns business rules and transaction intent
  ▼
Repository
  │ owns persistence queries
  ▼
SQLAlchemy 2 AsyncSession
  ▼
MySQL 8 / asyncmy
```

Routers never contain SQL or multi-step business rules. Repositories do not return HTTP responses. Services raise meaningful application exceptions, and a centralized handler converts those exceptions to stable error envelopes.

### Package boundaries

```text
backend/app/
├── api/             HTTP routers and dependencies
├── core/            configuration, logging, exception policy, security
├── db/              engine, sessions, metadata
├── models/          SQLAlchemy ORM models
├── repositories/    persistence operations
├── schemas/         Pydantic transport contracts
├── services/        business operations
├── storage/         local/S3-compatible media adapters
└── main.py          application factory
```

### API convention

- All product endpoints live under `/api/v1`.
- Singular resources use stable IDs internally and slugs where public URLs require them.
- Collection queries use page/page-size pagination with an upper bound of 100.
- Successful single-resource responses use `{ "data": ... }`.
- Paginated responses use `{ "data": [...], "pagination": { ... } }`.
- Expected errors use `{ "error": { "code": "...", "message": "...", "details": ... } }`.
- Validation errors remain machine-readable but never include internal paths, SQL, secrets, or tracebacks.
- Readiness checks may contact dependencies; liveness checks must not.

## Database

- MySQL 8.4 LTS image for containerized development/production baseline.
- `utf8mb4` with `utf8mb4_0900_ai_ci`.
- SQLAlchemy 2 async engine with `asyncmy`.
- Alembic owns schema evolution; application startup does not silently create tables.
- Constraint names follow a deterministic metadata convention.
- Article and chatter Markdown bodies use `LONGTEXT`.
- Tags are normalized entities with junction tables, never CSV strings.
- JSON is limited to naturally configuration-shaped data and does not replace relational fields.
- Foreign keys, unique indexes, and composite indexes are selected from actual query and integrity requirements during Phase 5.

## Authentication

- Administration uses short-lived access JWTs and longer-lived refresh JWTs in HttpOnly cookies.
- Production cookies are `Secure` and use an explicit SameSite policy.
- State-changing requests use a CSRF strategy compatible with same-origin Nginx deployment.
- Refresh credentials are rotated/revoked according to a server-side policy defined with the user model in Phase 5.
- Passwords use Argon2id unless deployment evidence requires bcrypt.
- The first Administrator is created through an interactive CLI command after migrations. No default credentials or public environment-variable password bootstrap is permitted.

## Media storage

Business services depend on `StorageAdapter`, not a provider SDK.

- Development: local filesystem adapter and `/uploads/` delivery.
- Production: S3-compatible adapter is preferred.
- Stored records retain a logical key, content type, size, and public URL strategy.
- Uploads require explicit MIME/type verification, file-size limits, safe generated names, and image processing limits.
- Deleting metadata and deleting bytes are coordinated so partial failures are observable and recoverable.

## Configuration and secrets

- Frontend public configuration is limited to non-secret browser values.
- Backend settings use Pydantic Settings.
- `.env.example` documents names but contains no usable production secret.
- Real `.env` files, database volumes, upload volumes, logs, reports, and local virtual environments are ignored by Git.
- Production boot must fail clearly when security-critical values are missing or placeholder values remain.

## Logging and errors

- Application logs go to stdout/stderr for container collection.
- Structured JSON logging may be added when deployment needs it; it is not required for the local baseline.
- Request IDs will be added with the first complete API middleware stack.
- Expected application errors are concise and safe for clients.
- Unexpected exceptions are logged server-side and returned as a generic 500 response.

## Testing

### Frontend

- Vitest + Nuxt Test Utils for composables, stores, utilities, and focused component behavior.
- Playwright for home, post list/detail, admin login, and publish workflows.
- Browser visual checks at 375, 430, 768, 1024, 1440, and 1920 px.
- Chromium, Firefox, and WebKit coverage is completed in Phase 10.

### Backend

- Pytest and HTTPX ASGI transport for API tests.
- Repository/service tests use an isolated database strategy; SQLite is not treated as proof of MySQL-specific behavior.
- Required Phase 5 coverage includes authentication, Post CRUD, Category, Tag, and publish states.

## Deployment

The baseline Compose topology contains `nginx`, `frontend`, `backend`, and `mysql`. Images use multi-stage builds and runtime users without root privileges where practical. MySQL and uploads use named volumes. Health checks gate service ordering, but migrations remain an explicit deployment step rather than a hidden web-process side effect.

Docker is not installed on the current development host, so Compose and Dockerfile execution cannot be validated locally. They are exercised on the Docker-capable cloud server; the runbook, limitations, and the Phase 11 verification record live in [`deployment.md`](deployment.md).

## Known environment constraints

- The current host has Node 22.20.0; several current frontend development dependencies request Node 22.22.2 or later. The repository declares 22.22.2 as its minimum and will use build/test results to determine whether a local runtime upgrade is required.
- The current host has Python 3.14.6, which satisfies the 3.12+ product requirement and is supported by the selected current FastAPI, SQLAlchemy, Pydantic, Alembic, and asyncmy releases.
- MySQL 8.0.44 is installed locally.
- Docker is not installed locally.

