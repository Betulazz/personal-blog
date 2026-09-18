# Personal Blog v1 Implementation Specification

Status: ready-for-agent

## Problem Statement

The owner needs an independently implemented personal blog that carries the recognizable visual language of XingHuiSamaBlogs—dark spatial depth, restrained glass surfaces, ambient glow, editorial hierarchy, immersive motion, and a visually integrated music player—without copying its source code, identity, or excluded product areas.

The project already has a Phase 1 Nuxt and FastAPI architecture baseline, but it does not yet provide the design system, public experience, persistent content, administration tools, Markdown workflow, responsive behavior, performance work, or deployable production system required for a complete blog. The remaining work is large enough to span multiple isolated agent sessions, so every implementation task must be derivable from one stable specification and testable without relying on lost conversation context.

The application must be developed and run natively on the owner's current Windows machine using Node.js, Python, and the installed MySQL service. Docker is not part of the local development loop. Docker images, Compose, and Nginx become an active runtime concern only when preparing deployment to the owner's cloud server.

## Solution

Build the blog incrementally from the approved architecture, beginning with an original reusable dark design system and then adding the homepage, public content pages, asynchronous FastAPI APIs backed by MySQL, an authenticated administration interface, a portable Markdown-first authoring pipeline, media storage adapters, refined animation, responsive and accessibility quality, and production deployment assets.

The public experience will use Nuxt server rendering for meaningful first paint and metadata. The backend will enforce Router → Service → Repository → SQLAlchemy → MySQL boundaries. Post, Chatter, and Moment remain distinct concepts. Markdown remains the canonical long-form format even when edited through Tiptap. Site Identity, navigation, social links, homepage sections, footer content, and the music playlist are administrator-configurable rather than copied from the reference site.

Visual development will be browser-driven. Stable screenshots will use explicitly declared CSS-pixel viewports and separate viewport captures from full-page captures. Screenshot output will use CSS scaling so the host display's device-pixel ratio does not silently change baseline dimensions.

## User Stories

1. As a visitor, I want the blog to have a distinctive dark, atmospheric identity, so that it feels immersive without impersonating the reference site's owner.
2. As a visitor, I want readable typography in both Chinese and English, so that mixed-language content remains comfortable to scan.
3. As a visitor, I want glass panels to preserve contrast over the background, so that the visual style never harms readability.
4. As a visitor, I want ambient glow and background effects to remain subtle, so that content stays visually dominant.
5. As a visitor using reduced-motion preferences, I want nonessential motion removed, so that the site remains comfortable to use.
6. As a visitor on a low-powered mobile device, I want expensive effects reduced automatically, so that scrolling stays responsive.
7. As a keyboard user, I want every interactive primitive to expose visible focus and logical navigation, so that I can use the complete site without a pointer.
8. As a touch user, I want navigation and controls to have reliable touch targets, so that mobile interaction is not error-prone.
9. As a visitor, I want navigation to show my current location and adapt deliberately to small screens, so that I can move through the site confidently.
10. As a visitor, I want the homepage to introduce the Site Identity, so that I understand whose blog I am viewing.
11. As a visitor, I want the homepage to surface recent Posts, Moments, and Chatter separately, so that each content type retains its meaning.
12. As a visitor, I want selected Projects and social links on the homepage, so that I can discover the owner's work and public profiles.
13. As a visitor, I want homepage loading, empty, and error states to match the visual system, so that partial failures do not look broken.
14. As a visitor, I want a music player that visually belongs to the site, so that audio feels like part of the ambient experience.
15. As a visitor, I want music playback to persist sensibly across client-side navigation, so that route changes do not unexpectedly restart a track.
16. As a visitor, I want clear playback, track, volume, and progress controls, so that the player is understandable and accessible.
17. As a visitor, I want the player to use only administrator-configured legal media sources, so that it does not depend on scraping or unauthorized proxy services.
18. As a visitor, I want to browse Posts with pagination, categories, tags, and search, so that durable writing is discoverable.
19. As a visitor, I want Post URLs to use stable slugs, so that articles can be bookmarked and shared.
20. As a visitor, I want Post metadata and summaries to be clear, so that I can decide what to read.
21. As a visitor, I want Post pages to render headings, links, quotes, images, tables, code, and mathematics correctly, so that technical writing is expressive.
22. As a visitor, I want syntax-highlighted code to remain readable without loading every language on every route, so that technical articles stay fast.
23. As a visitor, I want a generated table of contents and reading progress on long Posts, so that I can understand and navigate their structure.
24. As a desktop visitor, I want a useful sticky table of contents, so that section navigation stays available while reading.
25. As a mobile visitor, I want the table of contents presented in an accessible sheet, so that it does not squeeze the article column.
26. As a visitor, I want previous/next navigation and a back-to-top control, so that long-form reading has clear continuation and recovery points.
27. As a visitor, I want raw or unsafe HTML prevented from executing, so that Markdown content cannot introduce XSS.
28. As a visitor, I want category and tag pages to be linkable and state-safe, so that filtered collections can be revisited and shared.
29. As a visitor, I want search results to distinguish matching Posts and relevant metadata, so that I can recognize useful results quickly.
30. As a visitor, I want Moments presented as a readable chronological feed, so that lightweight life updates feel immediate.
31. As a visitor, I want Moment images, location, mood, and tags to be optional, so that simple updates do not require artificial metadata.
32. As a visitor, I want Chatter to feel more composed than a Moment but lighter than a Post, so that short technical and reflective notes have an appropriate home.
33. As a visitor, I want Chatter search and filtering, so that older notes remain discoverable.
34. As a visitor, I want Projects to expose status, technology, time span, source, and demonstration links, so that I can evaluate the owner's work.
35. As a visitor, I want external Project and Friend Link destinations to open safely, so that outbound navigation does not expose the originating page.
36. As a visitor, I want Friend Links to be curated without fake availability claims, so that the page remains honest and maintainable.
37. As a visitor, I want an About page with profile, skills, interests, story, timeline, contact, and social information, so that I can understand the person behind the site.
38. As a visitor, I want intentional 404 and failure pages with recovery actions, so that navigation errors do not fall back to framework defaults.
39. As a search-engine or link-preview consumer, I want correct canonical metadata, descriptions, social cards, and semantic headings, so that public content is represented accurately.
40. As an Administrator, I want to be created through an explicit local or deployment CLI command, so that the application never ships default credentials.
41. As an Administrator, I want secure login, refresh, logout, and current-session behavior, so that access remains usable without storing tokens in localStorage.
42. As an Administrator, I want protected administration routes to recover from expired access credentials safely, so that normal session rotation does not lose work.
43. As an Administrator, I want a focused dashboard with useful content counts and recent activity, so that I can understand the site's state without unnecessary analytics infrastructure.
44. As an Administrator, I want to create, edit, preview, publish, unpublish, and delete Posts, so that the editorial lifecycle is complete.
45. As an Administrator, I want slug conflicts and invalid publish transitions explained clearly, so that content errors are actionable.
46. As an Administrator, I want to manage Categories and Tags as reusable entities, so that taxonomy is normalized rather than stored as comma-separated strings.
47. As an Administrator, I want to manage Moments and their optional images independently from Posts, so that their lighter workflow stays simple.
48. As an Administrator, I want to manage Chatter independently from Posts and Moments, so that its fields and presentation can evolve without nullable universal content records.
49. As an Administrator, I want to manage Projects and Friend Links, so that portfolio and relationship content does not require code changes.
50. As an Administrator, I want to edit the Site Identity, SEO defaults, footer, social links, homepage visibility, avatar, favicon, and music playlist, so that the blog is configurable rather than reference-specific.
51. As an Administrator, I want to upload and browse validated Media Assets, so that images and audio can be reused safely.
52. As an Administrator, I want media filenames generated by the system and MIME content verified, so that malicious or conflicting uploads are rejected.
53. As an Administrator, I want media deletion to warn about references and partial storage failures, so that records and bytes do not silently diverge.
54. As an Administrator, I want to edit long-form content through Tiptap while storing Markdown canonically, so that authoring is pleasant without losing portability.
55. As an Administrator, I want supported Markdown to survive editor load-and-save cycles, so that opening an article never silently destroys its content.
56. As an Administrator, I want validation and server errors displayed without losing unsaved form state, so that recoverable failures are not destructive.
57. As a maintainer, I want public API responses to use stable success, pagination, and error envelopes, so that the frontend has one predictable integration contract.
58. As a maintainer, I want async request paths to avoid blocking I/O, so that concurrency remains correct.
59. As a maintainer, I want database evolution controlled through Alembic, so that startup never mutates production schema implicitly.
60. As a maintainer, I want MySQL tables and content to use utf8mb4, so that multilingual text and emoji are preserved.
61. As a maintainer, I want foreign keys, unique constraints, and query-driven indexes, so that domain integrity and common lookups remain reliable.
62. As a maintainer, I want public Nuxt requests to render meaningful SSR content without duplicate hydration fetches, so that first load and indexing remain efficient.
63. As a maintainer, I want frontend API calls centralized behind typed boundaries, so that transport and error handling are not duplicated across pages.
64. As a maintainer, I want local development to run with native Node.js, Python, and MySQL processes, so that Docker is not required on the development machine.
65. As a maintainer, I want local origins and API configuration explicit and restricted, so that native frontend/backend development does not require permissive production CORS.
66. As a maintainer, I want the supplied background image transformed into responsive AVIF/WebP derivatives with a fallback, so that small screens do not download the oversized source.
67. As a maintainer, I want animation durations, easing, layers, blur, shadows, and z-indexes represented as semantic tokens, so that visual behavior stays consistent.
68. As a maintainer, I want hidden and offscreen continuous effects paused, so that ambient presentation does not waste CPU or GPU.
69. As a maintainer, I want browser screenshots generated from declared CSS-pixel viewports, so that visual comparisons are reproducible across DPR values.
70. As a maintainer, I want viewport screenshots kept separate from full-page screenshots, so that first-screen composition is not confused with total document aspect ratio.
71. As a maintainer, I want critical workflows covered through the highest practical external test seam, so that tests describe behavior rather than component internals.
72. As a maintainer, I want linting, types, tests, secret scanning, and debug-code cleanup at every ticket and phase boundary, so that quality does not accumulate as deferred work.
73. As a deployer, I want production frontend, backend, Nginx, and MySQL containers prepared for a cloud server, so that deployment is reproducible when local implementation is complete.
74. As a deployer, I want runtime secrets supplied outside images, so that credentials are never embedded in source or container layers.
75. As a deployer, I want explicit migrations, health checks, persistent database/media storage, HTTPS guidance, backup, and restore procedures, so that deployment can be operated safely.
76. As the owner, I want photo wall and 灵境 features excluded, so that v1 remains focused on the agreed blog scope.
77. As the owner, I want speculative features recorded rather than implemented automatically, so that AI chat, Redis, search clusters, queues, microservices, PWA, internationalization, and complex permissions do not expand v1.

## Implementation Decisions

- Work continues strictly by phase: Design System, Homepage Prototype, Public Pages, Database and Backend, API Integration, Administration, Markdown and Media, Animation Polish, Responsive and Performance, Deployment, and Final QA. A later phase does not begin until the current phase meets its acceptance criteria.
- The implementation remains an original Nuxt 4, Vue 3, TypeScript, Tailwind CSS 4, Reka UI/shadcn-vue, Motion for Vue, Pinia, VueUse, Tiptap, Shiki, and KaTeX frontend paired with a Python FastAPI, SQLAlchemy Async, Pydantic, Alembic, asyncmy, and MySQL backend.
- Nuxt SSR is the public rendering model. Public content must appear in the initial server response where practical, and hydration must not repeat requests already resolved by the server.
- The backend preserves Router → Service → Repository → SQLAlchemy → MySQL. Routers own transport semantics, Services own business rules and transaction intent, and Repositories own persistence queries.
- Pydantic transport schemas and SQLAlchemy ORM models remain separate.
- Post, Chatter, and Moment remain separate domain and persistence models. Shared infrastructure may be reused, but the concepts are not collapsed into a polymorphic universal content table.
- Markdown is the canonical persisted long-form representation. Tiptap-specific JSON may exist only as transient state or a rebuildable cache.
- Raw Markdown HTML is disabled by default or processed through a strict allowlist. Links, media sources, code rendering, and generated anchors are treated as untrusted inputs.
- The v1 visual theme is dark-only. Semantic token names must permit a future theme without requiring that light mode be implemented now.
- The design language prioritizes layout, spatial hierarchy, color, glass, glow, typography, cards, motion, and decorative detail in that order. It may improve accessibility and performance rather than reproduce reference defects.
- The supplied background is an approved source asset. Production rendering uses responsive optimized derivatives and does not send the full source to small devices unnecessarily.
- The design system is completed and browser-approved before homepage implementation. It includes semantic color, typography, spacing, radius, shadow, glass, blur, glow, motion, breakpoint, and z-index tokens plus all specified interaction primitives.
- Motion for Vue is the default animation system. Three.js and GSAP are not introduced unless a later documented technical need cannot be met more simply.
- Continuous animation is exceptional. Mobile and reduced-motion modes remove nonessential background and decorative movement.
- Site Identity is configurable example content. No name, biography, avatar, social identity, or copyrighted media is copied from the reference owner.
- Music Tracks are configured by an Administrator and must use legal remote URLs, locally stored media, or S3-compatible media. The application does not scrape, proxy, search, or mirror third-party music catalogs.
- Pinia is limited to genuinely cross-route client state such as the music player and administrator session presentation. Server-derived public data is not duplicated into a global store without a demonstrated need.
- APIs are versioned and use stable single-resource, collection pagination, and safe error envelopes. Validation responses remain machine-readable and do not expose SQL, tracebacks, secrets, or internal paths.
- Pagination has explicit upper bounds. Stable internal IDs and public slugs have distinct responsibilities.
- Authentication uses short-lived access credentials and rotated/revocable refresh credentials in HttpOnly cookies. Production cookies are Secure and use an explicit SameSite/CSRF policy. Authentication material is not stored in localStorage.
- Password hashing uses Argon2id unless deployment evidence requires a documented alternative. The first Administrator is created interactively; no default account or environment-variable bootstrap password is shipped.
- MySQL uses utf8mb4. Post and other long-form Markdown fields use LONGTEXT. Tags are normalized entities with junction tables. JSON is reserved for naturally configuration-shaped data.
- Alembic is the only schema evolution mechanism. Migrations are explicit deployment operations and are not hidden in application startup.
- Business services depend on a storage adapter. Local filesystem storage is supported for native development; S3-compatible storage is the preferred production option.
- Uploads enforce size limits, verified content type, generated names, image processing limits, and safe reference-aware deletion behavior.
- Native local development is the required workflow. The frontend runs through Node.js, the backend through the Python virtual environment and ASGI server, and persistence through the installed MySQL service.
- Local frontend/backend communication uses explicit development configuration and narrowly scoped origins. Production continues to expose one origin through Nginx.
- Existing Docker and Nginx assets are retained as a deployment foundation, but Docker execution is not required for Design System through Responsive and Performance phases on the current machine.
- Docker becomes an acceptance requirement in the Deployment phase, when production images, Compose networking, Nginx proxying, volumes, health checks, explicit migrations, backups, restore, and cloud-server operation are validated.
- Every significant UI ticket follows implement, run, browser inspection, viewport screenshot, comparison, correction, and repeat inspection.
- Required visual widths remain 375, 430, 768, 1024, 1440, and 1920 CSS pixels. Standard comparison viewports are 375 × 812, 430 × 932, 768 × 1024, 1024 × 768, 1440 × 900, and 1920 × 1080.
- Baseline screenshots use a controlled device scale factor and CSS scale. Device-pixel screenshots may be captured separately for asset sharpness checks but are not mixed with layout baselines.
- Viewport and full-page screenshots are separate artifacts with separate purposes. A full-page image is never used as evidence that first-screen aspect ratio or composition matches the owner's browser.
- A page is complete only when behavior, desktop, mobile, browser rendering, loading, empty, error, motion, console, and obvious performance conditions pass.
- New ideas outside v1 are documented for later consideration and do not enter implementation tickets automatically.

## Testing Decisions

- Tests assert externally observable behavior and durable contracts. They do not pin incidental component trees, private helper calls, CSS class ordering, SQLAlchemy internals, or animation implementation details.
- The primary and highest test seam is Playwright driving the rendered application. Critical public and administration workflows should cross Nuxt and FastAPI boundaries and use MySQL where the behavior depends on persistence.
- Core Playwright coverage includes navigation, homepage content states, Post discovery and reading, search/filtering, administrator login, Post create/edit/publish, session refresh, media interaction, and representative failure recovery.
- Visual Playwright runs explicitly set the CSS viewport before navigation. Screenshots use CSS-pixel scale for comparison. Browser zoom remains 1, and viewport captures do not use full-page mode.
- Full-page screenshots are captured separately to evaluate vertical rhythm, late-page overflow, sticky behavior, and section continuity.
- Responsive visual checks cover 375 × 812, 430 × 932, 768 × 1024, 1024 × 768, 1440 × 900, and 1920 × 1080 using controlled browser configuration rather than dimensions observed while developer tools are being resized.
- Chromium is used continuously during UI implementation. Chromium, Firefox, and WebKit are all required during the final responsive/performance phase.
- FastAPI contract tests use HTTPX through the ASGI boundary for authentication, authorization, validation, pagination, filtering, error envelopes, publish transitions, and protected CRUD. These tests should not call routers, Services, or Repositories directly when the HTTP seam can prove the behavior.
- MySQL-specific behavior is tested against an isolated real MySQL database. SQLite is not accepted as proof of migrations, collation, JSON, constraints, indexes, transaction behavior, or asyncmy compatibility.
- Alembic tests prove that a fresh database upgrades successfully. Migration rollback is tested only where a safe downgrade is explicitly supported.
- Focused Service or Repository tests are added only when they provide substantially faster diagnosis for complex business or query behavior that would be opaque through HTTP tests.
- Markdown fixtures are a deliberate lower seam because round-trip preservation and sanitization need precise diagnosis. Fixtures cover supported headings, fenced code, quotes, images, tables, links, math, TOC anchors, disallowed HTML, malformed input, and Unicode.
- Markdown editor tests prove that loading and saving supported Markdown preserves its meaning and does not silently delete constructs. Exact formatting is asserted only where canonicalization is an intentional contract.
- Vitest is reserved for pure utilities, SSR-sensitive composables, Pinia state transitions such as music playback, and complex accessible primitive behavior that would be difficult to diagnose exclusively through end-to-end tests.
- Component tests interact through roles, labels, emitted public events, and visible state. They do not assert internal refs or implementation-only class lists.
- Loading, empty, validation, network error, unauthorized, forbidden, not-found, and unexpected-error states receive explicit coverage instead of being inferred from successful paths.
- Accessibility validation combines semantic and keyboard Playwright checks, automated scanning where practical, and manual inspection of focus, contrast, reduced motion, dialogs, sheets, and touch targets.
- Performance acceptance uses production builds and observes responsive image delivery, route/code splitting, SSR duplication, long tasks, layout shifts, GPU-heavy layers, backdrop-filter count, animation behavior, and mobile scrolling.
- Local implementation acceptance runs native frontend, backend, and MySQL processes. A passing Docker run is not required before the Deployment phase.
- Deployment acceptance runs the production containers and Nginx topology on a Docker-capable environment representative of the cloud server. It includes clean migration, health checks, persistent volumes, HTTPS termination strategy, backup, and restore rehearsal.
- Each ticket finishes with targeted tests plus repository lint, formatting, type checks, secret scanning, console review where relevant, and review of the diff against both this specification and repository standards.
- Existing baseline tests for the class-name utility and liveness endpoint are prior art for small frontend pure-unit and backend HTTP tests. New tests should deepen behavior coverage rather than multiply trivial examples.

## Out of Scope

- Photo wall.
- 灵境 pages or experiences.
- AI chat.
- Third-party music scraping, catalog search, unauthorized proxying, or media mirroring.
- Redis, Elasticsearch, message queues, WebSockets, or microservices.
- Multi-tenancy.
- PWA/offline application behavior.
- Internationalization infrastructure.
- Complex role or permission systems beyond the trusted Administrator need.
- Large Three.js scenes or multiple full-screen canvases.
- Complex game systems.
- Light theme implementation in v1.
- Reference-site identity, private data, copyrighted media, or line-for-line source copying.
- Docker as a mandatory local development dependency before deployment work begins.
- Features recorded as future ideas unless they receive a separate approved specification.

## Further Notes

- This specification is subordinate to the project's highest-priority product specification and accepted architecture decisions.
- Phase 0 reference findings remain the visual and performance evidence base; they are guidance for an original implementation, not permission to copy the reference product.
- The Phase 1 architecture baseline is complete and is the starting point for implementation tickets. Phase 2 Design System is the first unfinished phase.
- The local Markdown issue tracker should next split this specification into blocker-aware, self-contained tickets. Each ticket must state dependencies, deliverables, acceptance criteria, relevant source documents, and the tests that prove completion.
- Fresh implementation conversations should read the repository agent instructions, product specification, domain glossary, accepted ADRs, this specification, and the selected ticket before changing code.
- The local machine currently provides a native Node/Python/MySQL development environment but no Docker runtime. Docker validation is intentionally deferred to a Docker-capable cloud-deployment preparation environment rather than simulated or claimed as complete locally.
