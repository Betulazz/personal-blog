# Implementation Plan

This plan is subordinate to `PROJECT_SPEC.md`. Work proceeds phase by phase; a later phase does not start until the current phase's acceptance criteria are met. Browser-rendered behavior outranks code-only assumptions.

## Confirmed product decisions

- Use configurable example identity content until the owner replaces it through site settings.
- Use the supplied `bg.jpeg` as the approved initial background source, with responsive optimized derivatives.
- Ship a dark-only v1 while keeping semantic tokens extensible.
- Support legal administrator-configured audio URLs, local media, and S3-compatible media; do not reproduce music scraping/proxy logic.
- Create the first administrator through an interactive CLI command; never ship default credentials.
- Initialize a local Git repository in Phase 1 without adding or pushing to a remote.
- Keep Post, Chatter, and Moment as separate domain concepts and persistence models.
- Persist article/chatter long-form content canonically as Markdown, not editor JSON.

## Delivery rules

- Each phase ends with diff review, secret scan, dead/debug code cleanup, lint, type checking, and the tests relevant to that phase.
- Every significant UI change follows implement → run → browser → screenshot → compare → fix → screenshot.
- Responsive checks cover 375, 430, 768, 1024, 1440, and 1920 px.
- Mobile automatically reduces background effects and motion.
- New scope goes to `docs/future-ideas.md`; it is not implemented opportunistically.
- No photo wall, 灵境, AI chat, Redis, Elasticsearch, MQ, WebSocket, microservices, multi-tenancy, PWA, internationalization, complex permissions, or large Three.js scene.

## Phase 0 — Reference analysis

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Read product specification | None | Shared scope baseline | Page range, stack, exclusions, visual goals, and phase order are captured without contradiction |
| Audit reference repository | Product specification | Source-level findings | Findings cover real page/component code, tokens, animation, responsive behavior, data model, and performance risks—not only README content |
| Inspect reference site | Repository audit | Desktop/mobile visual evidence | Home, article, moments, chatter, projects, friends, and about are rendered in a real browser; photo wall and 灵境 are not analyzed as implementation scope |
| Audit current workspace | None | Current-state inventory | Existing assets, empty directories, missing tooling, and non-Git state are documented |
| Resolve major product decisions | Research findings | Confirmed decision set | Identity placeholders, background asset, theme scope, music source, admin bootstrap, and Git initialization are explicitly settled |
| Capture domain vocabulary and durable decisions | Confirmed decision set | `CONTEXT.md`, ADRs | Glossary contains domain language only; ADRs cover only costly, non-obvious tradeoffs |
| Publish Phase 0 documents | All Phase 0 tasks | `docs/reference-analysis.md`, `docs/implementation-plan.md` | Both documents are complete, internally consistent, and usable as Phase 1 inputs |

## Phase 1 — Architecture

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Initialize repository hygiene | Phase 0 complete | Git repo, `.gitignore`, editor/format conventions | Local Git works; build output, secrets, caches, uploads, and temporary screenshots are ignored; no remote is added |
| Scaffold frontend | Repository hygiene | Nuxt 4/Vue 3/TypeScript strict application | App starts successfully; strict type checking, ESLint, formatting, and test scripts exist; no page styling beyond an architecture shell |
| Scaffold backend | Repository hygiene | Python 3.12+ FastAPI project | App starts; Router → Service → Repository boundaries are represented; Pydantic and ORM namespaces are separate; async dependencies are configured |
| Establish configuration | Frontend/backend scaffolds | Typed frontend runtime config and Pydantic settings | Secrets come only from environment; `.env.example` contains safe names/defaults; production validation fails clearly when required values are missing |
| Establish database foundation | Backend scaffold | SQLAlchemy async engine, Alembic baseline, MySQL conventions | `asyncmy`, `utf8mb4`, target collation, session lifecycle, naming conventions, and migration workflow are documented and testable |
| Define API conventions | Backend scaffold | `/api/v1` envelope, pagination, errors, validation rules | OpenAPI exposes consistent success/error shapes; internal SQL/path/traceback details never leak |
| Define auth architecture | Configuration and DB foundation | Cookie JWT design and admin bootstrap CLI contract | Access/refresh cookie properties, CSRF approach, hashing, logout/refresh, and one-time admin creation are specified without default credentials |
| Define storage adapter | Configuration | Local and S3-compatible storage interfaces | Business services depend on an adapter; upload validation and size/type limits are part of the contract |
| Add Docker development topology | Frontend/backend/db foundations | Compose services and Nginx routing baseline | `frontend`, `backend`, `mysql`, and `nginx` have health-aware local wiring; persistent data paths are explicit; no secrets are baked into images |
| Publish architecture | All Phase 1 tasks | `docs/architecture.md` | Directory boundaries, request flow, SSR/API topology, auth, media, database, deployment, and test strategy are documented; lint/type/test smoke checks pass |

## Phase 2 — Design system

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Produce visual concept | Reference analysis | Original desktop/mobile concept set | Concept covers the design-system page and homepage composition, uses approved background direction, preserves required information architecture, and does not copy reference identity/assets |
| Extract design tokens | Approved concept | Color, typography, spacing, radius, shadow, glass, blur, glow, motion, breakpoint, and z-index tokens | Tokens are semantic, documented, consumed by Tailwind/CSS variables, and include reduced-motion/mobile variants |
| Optimize visual assets | Approved concept | Responsive background/media files | AVIF/WebP derivatives, sizes, crops, and fallbacks are defined; no oversized source image is sent to small screens |
| Implement primitives | Tokens | GlassPanel, GlassCard, Button, Badge, Input, Textarea, Select, Dialog, Sheet, Tooltip, Dropdown, SectionHeader, PageContainer, GlowLayer, BackgroundLayer | Keyboard, focus, disabled, loading, hover, and reduced-motion states work; visual recipes are not duplicated across primitives |
| Build design-system route | Primitives | `/design-system` | Every token and primitive is visible in light-independent dark states, interaction states, content stress cases, Chinese/English typography, and mobile layouts |
| Browser-validate system | Design-system route | Screenshot comparison matrix | Required widths are checked; console has no material errors; contrast, touch targets, blur cost, and overflow pass review |

## Phase 3 — Homepage prototype

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Define homepage composition | Approved design system | Responsive layout specification | Profile, social links, stats, music, latest posts, moments, chatter, selected projects, footer, and background are represented; excluded photo-wall space is intentionally rebalanced |
| Implement mock data contracts | Architecture | Typed homepage fixtures | Fixtures match future API response types and can be removed without rewriting components |
| Implement home components | Layout and fixtures | Focused reusable components | No giant page component; semantic headings, links, images, loading/empty/error states, and component ownership are clear |
| Add purposeful motion | Functional home | Motion for Vue interactions | Entry, reveal, hover, navigation, and player motion are subtle; reduced motion disables nonessential effects; no large continuous canvas |
| Cross-viewport visual QA | Functional home | Validated homepage prototype | 375, 430, 768, 1024, 1440, and 1920 px pass screenshot review; mobile is intentionally composed; console and performance profile are clean |

## Phase 4 — Public pages

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Posts listing | Homepage patterns | `/posts` | Pagination, category/tag filters, search, metadata, skeleton, empty, loading, and error states work with mock data |
| Post detail | Markdown shell | `/posts/[slug]` | Cover, metadata, sanitized Markdown, Shiki, KaTeX, TOC, progress, previous/next, and back-to-top work; desktop sticky TOC and mobile Sheet TOC are validated |
| Taxonomy pages | Posts contracts | `/categories`, `/categories/[slug]`, `/tags`, `/tags/[slug]` | Navigation and filtering are accessible, linkable, and state-safe |
| Search | Content contracts | `/search` | Title, excerpt, content, and tag result presentation includes loading/empty/error states |
| Moments | Moment contract | `/moments` | Timeline/feed, optional images, location, mood, and tags work; mobile uses one readable column |
| Chatter | Chatter contract | `/chatter` and detail route if required by content | Search/filter and editorial cards work without unstable hydration or cramped phone columns |
| Projects | Project contract | `/projects` | Status, featured state, stack, GitHub/demo links, and safe external-link behavior work |
| Friends | Friend contract | `/friends` | Cards, application guidance, and site information work; no fake automatic online monitoring |
| About | Site settings contract | `/about` | Profile, skills, interests, site story, timeline, contact, and social links have a deliberate responsive composition |
| Error surface | App shell | Custom 404 and 500/error states | Visual system is preserved; recovery navigation is clear; no framework-default appearance remains |
| Public-page visual QA | All public pages | Cross-page screenshot matrix | Required widths, keyboard navigation, console, loading/empty/error, and visual consistency pass |

## Phase 5 — Database and backend

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Model core entities | Phase 1 database foundation and domain glossary | Users, posts, categories, tags, post_tags, moments, moment_images, chatters, chatter_tags, projects, friends, media, site_settings | ORM and Pydantic types are separate; `LONGTEXT`, JSON, FKs, unique/composite indexes, timestamps, and publish states are intentional; tags are not CSV |
| Create migrations | Models | Alembic migration chain | Fresh MySQL 8 database upgrades cleanly with `utf8mb4`; downgrade strategy is documented where safe |
| Build repositories | Models | Async persistence operations | No blocking IO; query behavior is testable; pagination/filter/search avoid obvious N+1 patterns |
| Build services | Repositories | Business operations | Publish transitions, slug uniqueness, taxonomy rules, media references, and validation use meaningful domain exceptions |
| Build public APIs | Services | Versioned read endpoints | OpenAPI, pagination, filtering, status codes, validation, and error envelopes conform to Phase 1 conventions |
| Build authentication | Users and auth design | Login, refresh, logout, current-user, bootstrap CLI | HttpOnly cookie flow works; passwords use Argon2/bcrypt; refresh rotation/revocation policy is tested; no secrets leak |
| Build admin APIs | Authentication and services | Protected CRUD endpoints | Authorization, validation, publish/unpublish, pinning, and deletion rules are tested |
| Test backend | APIs | Pytest suite | Auth, post CRUD, category, tag, and publish-state tests pass against an isolated database strategy |

## Phase 6 — Frontend API integration

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Create API client boundary | Public APIs | Typed fetch layer | SSR/client base URLs, cookies, error normalization, and abort behavior are consistent |
| Replace fixtures | API client | Live public pages | Mock data is removed without component rewrites; pagination/filter/search states remain correct |
| Add caching strategy | Live APIs | Nuxt data-fetching policy | SSR hydration avoids duplicate requests; stale/revalidation rules are explicit; mutations invalidate relevant data |
| Validate failure modes | Live integration | Loading/empty/error/offline behavior | Every public page handles API failures without broken layouts or leaked internals |

## Phase 7 — Administration

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Admin shell and login | Authentication API | `/admin/login`, protected `/admin` layout | Cookie auth, refresh, logout, route protection, keyboard navigation, and errors work |
| Dashboard | Admin APIs | `/admin` | Required counts and recent content are useful without unnecessary visualization complexity |
| Content management | Admin CRUD APIs | Posts, categories, tags, moments, chatter, projects, friends pages | Search, filters, CRUD, publish state, confirmation, errors, and optimistic behavior are consistent |
| Media management | Storage API | `/admin/media` | Upload, browse, copy URL, and delete enforce type/size rules and safe confirmation |
| Site settings | Settings API | `/admin/settings` | Identity, SEO, footer, social links, music, homepage visibility, avatar, and favicon are editable and validated |
| Admin E2E | Admin pages | Playwright workflows | Login and article create/edit/publish are covered; failures produce actionable output |

## Phase 8 — Markdown and media

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Establish Markdown pipeline | Public article shell | Markdown renderer | GFM, headings, anchors, code, quotes, images, tables, links, math, TOC, and lazy media work; raw HTML is disabled or sanitized by a strict allowlist |
| Integrate Tiptap | Admin post editor | Markdown-first editor | Saved canonical value is Markdown; editor JSON is optional transient state only; round-trip fixtures detect destructive conversions |
| Integrate Shiki and KaTeX | Renderer | Highlighted code and math | SSR output is stable, languages are lazy-loaded where practical, and CSS does not bloat every route |
| Complete media adapter | Storage foundation | Local and S3-compatible implementations | Upload validation, generated names, URL resolution, deletion safety, and deployment configuration are tested |

## Phase 9 — Animation polish

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Normalize motion tokens | Completed core UI | Shared durations/easings/springs | Motion is consistent and no arbitrary per-component timings remain |
| Polish route and component motion | Motion tokens | Refined transitions | Reveal, page, navigation, dialog, player, and hover motion clarify state and do not delay content |
| Audit continuous animation | All effects | Animation budget | Hidden/offscreen motion pauses; reduced motion works; mobile removes nonessential effects; no layout-property animation remains |

## Phase 10 — Responsive and performance

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Responsive audit | All pages functional | Screenshot/device matrix | Layouts pass at all required widths; no accidental horizontal overflow; touch and keyboard interactions remain usable |
| Browser audit | Responsive audit | Chromium, Firefox, WebKit results | Critical flows and visual surfaces work in all three engines, with documented noncritical differences only |
| Performance profiling | Production build | Lighthouse, bundle, layer, and runtime reports | Images are responsive/lazy; route splitting works; blur/layer count is bounded; mobile animation remains smooth; large dependencies are justified |
| Accessibility audit | Production build | Automated and manual findings | Semantic structure, focus, labels, contrast, reduced motion, and keyboard flows meet the agreed quality bar |

## Phase 11 — Deployment

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Build production images | Tested application | Frontend/backend/Nginx images | Multi-stage builds are reproducible, non-root where practical, health endpoints exist, and secrets are runtime-only |
| Compose production topology | Images | Nginx + frontend + backend + MySQL Compose | Reverse proxy, uploads/objects, DB volume, health checks, restart policy, and internal networking work |
| Establish operations | Deployment topology | Backup, restore, HTTPS, logging, migration runbook | A clean deployment and restore rehearsal succeeds; migration and rollback risks are explicit |

## Phase 12 — Final QA

| Task | Dependency | Deliverable | Acceptance criteria |
| --- | --- | --- | --- |
| Run complete functional regression | Deployed candidate | QA report | Navigation, links, CRUD, upload, auth, refresh, search, Markdown, SEO, and error pages pass |
| Run complete visual regression | Deployed candidate | Final screenshot set | Desktop/mobile layouts and accepted design direction match; no unresolved review comments remain |
| Run security and secret review | Deployed candidate | Security checklist | No committed secrets, unsafe HTML, permissive CORS, unvalidated upload, exposed traceback/SQL, or localStorage auth remains |
| Release readiness review | All checks | v1 release decision | Lint, types, tests, browser matrix, performance, accessibility, deployment, backup, docs, and known limitations are complete |
