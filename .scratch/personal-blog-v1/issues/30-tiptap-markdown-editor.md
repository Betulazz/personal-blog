# 30: Tiptap Markdown-first editor

**What to build:** Upgrade Post authoring with a Tiptap editing surface while keeping Markdown as the portable canonical value and protecting every supported construct from destructive round trips.

**Blocked by:** 10: Markdown Post reading experience; 25: Admin Post, Category, and Tag management; 29: Admin Media Asset management.

**Status:** completed

- [x] Loading existing canonical Markdown into the editor and saving it preserves supported semantic content.
- [x] Heading, fenced code, quote, image, table, link, math, Unicode, and TOC-related fixtures survive deterministic round trips.
- [x] Raw/disallowed HTML, unsafe links, malformed Markdown, pasted content, and unsupported structures follow an explicit safe policy.
- [x] Media selection/upload integrates through Media Asset behavior without embedding provider-specific storage assumptions.
- [x] Editor loading, dirty state, validation, preview, save failure, session expiry, and navigation-away protection are complete.
- [x] Fixture tests, Post create/edit/publish Playwright flow, accessibility/mobile checks, bundle review, lint, types, and diff review pass.

## Comments

### 2026-09-22

- **Canonical round trips.** `tests/fixtures/markdown-round-trip.ts` covers headings, fenced code (including
  unclosed fences), quotes, task lists, tables, links, images, inline/block math, Unicode/emoji, malformed
  input, footnotes, definition lists, and unsupported extensions. Unit tests prove each fixture is idempotent
  (`load → save → load → save` is stable), that no content word is silently deleted, and that the public
  TOC (`extractPostToc`) keeps identical ids/levels/text across a save cycle.
- **Explicit safe policy** (`utils/admin-markdown-editor-policy.ts` + `utils/markdown-safety.ts`):
  - raw HTML tags outside code are literalized to entities before parsing, so disallowed HTML never becomes a
    node, never executes, and is not dropped; a dismissible notice tells the author what was normalized;
  - unsafe `javascript:`/`data:`/obfuscated URLs are neutralized at Markdown serialization for links and images
    (`SafeLink`/`SafeImage` overrides) and rejected by the link command; the first save persists the safe form;
  - footnote-style reference definitions are literalized so their text is not consumed/dropped;
  - pasted HTML goes through a strict allowlist sanitizer (`transformPastedHTML`): active elements are removed,
    images are dropped (Media Assets are the supported path), unsafe anchors are unwrapped, attributes stripped;
  - relative links/images (`guide/intro`, `images/cover.webp`) are preserved rather than destroyed; the shared
    `isSafeContentUrl` is also used by the public renderer so editor and reader agree.
- **Media integration.** New `AdminMediaPicker` lists Media Assets, uploads with policy validation/progress, and
  inserts the adapter-resolved `reference` (never a rebuilt `/uploads/{key}` URL). A dev-only `/uploads` route
  rule proxies the local adapter origin so inserted media actually renders natively; the production build
  contains no proxy rule (Nginx owns `/uploads` per `docs/architecture.md`).
- **Editor completeness.** Loading skeleton, dirty tracking with a visible state, leave-guard dialog plus
  `beforeunload`, validation/preview reuse, save failures that keep the form, and session expiry that preserves
  work through a sessionStorage draft with an explicit recovery dialog after re-login. A spurious initial
  Tiptap canonicalization update is suppressed so opening a post is never reported as dirty.
- **Verification:** frontend 110 unit tests; mocked Playwright 80/80 across chromium + mobile-chromium for the
  affected specs (full suite 176 passed, 5 skipped) including create/edit/publish, media insertion, policy,
  validation/save-failure, dirty guard, session-expiry recovery, loading, keyboard/touch checks and six fixed
  viewports with viewport/full-page/media-picker screenshots; live Playwright 14 passed against native
  Nuxt → FastAPI → MySQL with a Markdown-preserving create/edit/publish/unpublish flow; backend Ruff/format/mypy
  clean and 49 Pytest tests passed; ESLint, Nuxt typecheck, Prettier, and production build clean.
- **Bundle review:** Tiptap + editor + picker live in one lazy chunk (`B3aG7KGH.js`, 530,341 B raw /
  ~167 KB gzip) referenced only by `/admin/posts/new` and `/admin/posts/[id]/edit`; the shared entry and public
  routes do not include it.
- **Code review (Standards + Spec) findings addressed:** native `window.alert` replaced with inline
  `role="alert"`; debug console listener removed; viewport evidence extended to all six widths; save-failure/
  validation/preview covered by a new Playwright test; explicit TOC and reference-style unsafe-link fixtures
  added; content-loss guard added; media test now asserts the API-provided reference instead of hardcoding the
  local adapter path; `applyInput`/`syncPost` share one field mapper; dirty handlers share one snapshot helper;
  `serializeAdminPostInput` uses named keys; `@tiptap/extension-list` declared explicitly; duplicated test
  console scaffolding hoisted. The remaining picker/media-library duplication is intentionally left to avoid an
  unrelated refactor of ticket 29's screen.

