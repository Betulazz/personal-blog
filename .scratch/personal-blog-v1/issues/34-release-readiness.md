# 34: v1 final regression and release decision

**What to build:** Produce an evidence-backed v1 release decision after complete functional, visual, security, operational, and documentation regression.

**Blocked by:** 33: Cloud-server Docker deployment and operations.

**Status:** completed

- [x] Public navigation, content discovery, Markdown reading, player, all content types, search, taxonomy, links, metadata, and error recovery pass regression.
- [x] Administrator authentication, refresh/logout, every CRUD surface, publishing, editor round trip, media, settings, and failure recovery pass regression.
- [x] Final fixed-viewport and cross-browser visual evidence matches the approved design language with no unresolved material review issue.
- [x] Security review finds no committed secrets, unsafe Markdown/HTML, permissive production CORS, invalid upload path, exposed traceback/SQL, default credential, or localStorage authentication.
- [x] Performance, accessibility, SEO, deployment, migration, health, backup, restore, and known-limit documentation meet the agreed acceptance bar.
- [x] Photo wall, 灵境, and all other excluded scope remain absent.
- [x] Repository is clean; builds, lint, formatting, types, all automated tests, console review, secret scan, dead/debug cleanup, and final Standards/Spec review pass.

## Comments

### 2026-09-24

**Release decision: v1 is release-ready.** The complete native regression (Node.js + FastAPI + MySQL, no Docker), the production-build quality and performance suites, the security review, the excluded-scope audit, and the operational documentation all pass. The regression and its two-axis review surfaced one sitemap gap and partial JSON-LD coverage against `PROJECT_SPEC.md` §14 plus one capture-suite flake; all were closed in this ticket and are detailed below. No unresolved material review issue remains.

**Automated regression (final revision):**

- Backend: `ruff check`, `ruff format --check`, and strict `mypy` clean; `pytest` **57 passed, 1 skipped** (the skip is a POSIX-only file-permission assertion on Windows). The skip does not weaken MySQL coverage: the isolated real-MySQL integration fixture recreated and migrated `personal_blog_test` from `base` to head during the run.
- Frontend: ESLint, Prettier, `nuxt typecheck`, and `nuxt build` clean; Vitest **128 passed** across 16 files.
- Mocked Playwright baseline (Chromium + mobile Chromium): **173 passed, 5 skipped, 0 failed** (178 total).
- Live Playwright acceptance (native MySQL + FastAPI + Nuxt): **32 passed**, covering SSR without duplicate browser reads, the full public route inventory, missing records/media recovery, keyboard/touch/reduced-motion, Post CRUD, session refresh/logout, editor round trip, media upload/delivery/deletion, taxonomy, Moments/Chatter, portfolio, Site Identity, music, admin failure recovery, and the new sitemap/robots checks.
- Quality convergence (Chromium, Firefox, WebKit; production build): **9 passed, 6 intentional skips**. Deterministic 6-viewport captures (375×812, 430×932, 768×1024, 1024×768, 1440×900, 1920×1080) with separate viewport and full-page images for home, Post, Moments, search, friends, admin dashboard, posts, editor, and settings; automated name/label/landmark/contrast audit; touch-target sweep; reduced-motion sweep; continuous-effect pause proof. Representative captures were re-inspected: composition, glass hierarchy, typography, mobile navigation, and the music player match the approved design language.
- Performance (Chromium, production build): **2 passed** — public scripts 35 vs admin 36 (11 admin-only chunks), CLS 0.0058, p95 frame gap 28.7 ms, max frame gap 38.0 ms, longest main-thread task 58 ms, responsive AVIF selection, lazy markdown/card media, one fixed background layer, zero canvases, ≤16 backdrop filters with ≤20 px blur.
- The final quality and performance runs were executed against the production bundle built from the final revision (verified by `nuxt build` immediately before) rather than rebuilding inside the Playwright web server: the host had only ~2.4 GB free memory during those runs and the in-suite build thrashed for seven minutes. The bundle under test was the same production artifact; no test logic was skipped.

**Security review (all pass):**

- No committed secrets: private-key/cloud-key/token pattern scan over tracked files is empty; only `.env.example` placeholders and obvious test fixtures remain; `.env`, `docker/certs/`, `backups/`, and `uploads/` are gitignored and untracked.
- Markdown/HTML: markdown-it runs with `html: false`; link and image URLs pass a scheme allowlist with control-character and decoding checks; unsafe links become `#`/`aria-disabled`, unsafe images become a labelled fallback; KaTeX renders with `trust: false`; Shiki output is escaped; only these sanitized paths feed `v-html`.
- CORS/CSRF/trusted hosts: wildcard CORS hosts are rejected at settings load, production rejects placeholder `JWT_SECRET`/`DATABASE_URL`, insecure cookies, and wildcard `TRUSTED_HOSTS`; state-changing admin requests require the double-submit CSRF header.
- Uploads: declared MIME must be allowlisted, bytes are verified with Pillow/mutagen, size/pixel/dimension limits apply, keys are server-generated UUID paths, and `validate_storage_key` plus `_safe_path` reject traversal and absolute paths.
- Error exposure: expected errors use stable envelopes; validation details contain only field names and messages; unexpected exceptions return a generic 500 with no traceback, SQL, path, or secret.
- Credentials/session: the first Administrator is created only through the interactive CLI; no default account or environment bootstrap password ships; access/refresh tokens are HttpOnly cookies and the admin-shell test asserts `localStorage` stays empty.

**Excluded scope:** no photo-wall or 灵境 page, route, API, model, migration, or test exists. The only "gallery" in the codebase is the Phase 2 `/design-system` debug page required by `PROJECT_SPEC.md`.

**Fixes and gap closures in this ticket:**

- **Sitemap conformance gap (PROJECT_SPEC §14).** No phase ticket had implemented a sitemap. Added Nitro server routes `/sitemap.xml` (static public routes plus published Posts, Categories, and Tags collected through the public API with bounded pagination, XML escaping, `lastmod`, Post `canonical_url` overrides, and a degraded-cache fallback when the API is unavailable) and `/robots.txt` (allow public, disallow `/admin` and `/api/`, absolute `Sitemap:` line from `PUBLIC_SITE_URL`), replacing the static `public/robots.txt`. Covered by 6 unit tests and both mocked and live Playwright checks. The API client's generic `$fetch` wrapper gained a narrow `as T` cast because Nitro's typed-route inference cannot resolve a runtime string path to the caller's envelope type once custom server routes exist.
- **Article JSON-LD (PROJECT_SPEC §14).** Structured data existed only as the homepage `WebSite` block. Post pages now emit a `BlogPosting` JSON-LD document (`headline`, `description`, dates, author, image, and canonical `mainEntityOfPage`) with `<` escaped as `\u003c`, asserted by the mocked Post-reader suite.
- **Capture-suite flake.** One Chromium capture run reported four in-flight homepage API reads cancelled as `net::ERR_ABORTED` during rapid navigation. A faithful 7.2-minute replica of the capture flow produced zero aborts and no server errors, and the performance suite asserts zero browser API reads on the homepage, so the event is a navigation cancellation rather than an application or duplicate-read defect. The quality suite now treats the navigation-cancellation markers of all three engines — Chromium `net::ERR_ABORTED`, WebKit `Load request cancelled`, and WebKit/Nuxt's transient `NUXT_E5002` app-manifest diagnostic — like the already-documented Firefox `NS_BINDING_ABORTED`, with the rationale in the filter comment. `response >= 400`, page errors, and all other console errors are still failures.

**Two-axis code review and follow-ups:** the Standards axis found no hard violations and only judgement-call duplication (the server route cannot import the browser-oriented typed API client); its local duplication points were reduced with a shared `normalizeSiteUrl` helper and a single slug extractor, and `docs/architecture.md` records the server routes. The Spec axis found the sitemap ignored Post canonical overrides and that per-article JSON-LD was missing; both are fixed and covered by tests, and the remaining judgement calls (bounded pagination with a truncation warning, short-cache degraded sitemap, navigation-cancellation filtering) are documented above.

**Operations and documentation review:**

- `docs/deployment.md` covers topology, first deployment, explicit migrations, interactive Administrator creation, HTTPS termination, health checks, restart behavior, logging, persistent volumes, backup/restore rehearsal, rollback limits, the 2 GB host constraint, and the Phase 11 verification record; `docs/native-mysql-development.md` covers native setup and test isolation; `docs/architecture.md` now records the SEO server routes; README status reflects the completed release decision.
- Known limits remain documented rather than hidden: no Alembic downgrade contract (backup restore is the schema rollback path), local-only media in v1, single-host topology, self-signed certificate only for rehearsal, prebuilt frontend bundle required on small hosts, and Docker not required for native development.
- Console/network review is clean across the mocked, live, quality, and performance suites apart from seeded intentionally-missing media and the documented engine differences. No debug code, TODO markers, or temporary reports remain; ignored test artifacts are removed before commit.
