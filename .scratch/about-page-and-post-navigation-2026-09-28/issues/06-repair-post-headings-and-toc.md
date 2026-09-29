# 06: Repair Post heading levels and table of contents

**What to build:** Make a Post's body headings and table of contents reflect the author's Markdown hierarchy while keeping the Post title as the only page H1.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The Post title is the sole DOM H1. Markdown `#` renders as H2, `##` as H3, and deeper levels shift where HTML allows; Markdown `######` remains H6. Stored Markdown is unchanged.
- [x] Every body heading remains in source order in the table of contents, with visible hierarchy for first and second Markdown levels and usable deeper nesting on desktop and narrow screens.
- [x] Existing generated fragment IDs, including duplicate-heading suffixes, remain stable. Opening the reported `#asdad` fragment still lands on the intended heading.
- [x] Long heading text, deep nesting, keyboard navigation, and mobile layouts remain readable without horizontal overflow or obscured target headings.
- [x] Browser evidence for representative heading levels and anchors, relevant checks, and remaining limitations are recorded before resolution.

## Comments

### 2026-09-29 implementation and initial acceptance attempt

- Dependency check: `Blocked by: None`; there are no predecessor tickets to resolve. The ticket directory has no separate Post-heading prototype; the current Post reader and its `markdown-first` mock fixture were inspected as the baseline.
- Mock setup: `frontend/playwright.config.ts` uses site `http://127.0.0.1:3103` and mock API `http://127.0.0.1:8787`; both `NUXT_API_BASE` and `NUXT_PUBLIC_API_BASE` point to `http://127.0.0.1:8787/api/v1`, covering SSR and browser requests.
- Checks passed: `npm run test:unit -- tests/unit/post-markdown.test.ts` (4 passed); `npm run test:e2e -- --config playwright.config.ts tests/e2e/post-reader.spec.ts --project chromium --grep 'renders the technical Markdown reading surface on desktop' --output 'D:\VibeCoding\evidence\post-headings-2026-09-29'` (1 passed); `npm run test:e2e -- --config playwright.config.ts tests/e2e/post-reader.spec.ts --project mobile-chromium --grep 'keeps the TOC accessible in a mobile sheet' --output 'D:\VibeCoding\evidence\post-headings-2026-09-29-mobile'` (1 passed); `npm run typecheck` (passed); `npm exec eslint -- --no-warn-ignored 'app/utils/post-markdown.ts' 'app/pages/posts/[slug].vue' 'tests/unit/post-markdown.test.ts' 'tests/e2e/mock-api.mjs' 'tests/e2e/post-reader.spec.ts'` (passed); `npm exec prettier -- --check 'app/utils/post-markdown.ts' 'app/pages/posts/[slug].vue' 'tests/unit/post-markdown.test.ts' 'tests/e2e/mock-api.mjs' 'tests/e2e/post-reader.spec.ts'` (passed).
- An unfiltered first run of `post-reader.spec.ts` also reached the unrelated cover fallback assertion: expected `https://example.com/media/site-avatar.webp`, received the mock API URL `http://127.0.0.1:8787/uploads/images/site-avatar.webp`. The ticket-specific desktop and mobile checks passed on focused runs; this assertion was left unchanged.
- Playwright mock evidence: desktop Chromium viewport 1440x900, full-page screenshot 1440x4105 at `D:\VibeCoding\evidence\post-headings-2026-09-29\post-reader-Post-reading-e-74670--reading-surface-on-desktop-chromium\post-headings-desktop.png`; mobile Chromium viewport 375x812, screenshots 984x2132 at `D:\VibeCoding\evidence\post-headings-2026-09-29-mobile\post-reader-Post-reading-e-0b46f--and-recovers-missing-media-mobile-chromium\post-headings-mobile-toc.png` and `D:\VibeCoding\evidence\post-headings-2026-09-29-mobile\post-reader-Post-reading-e-0b46f--and-recovers-missing-media-mobile-chromium\post-headings-mobile-fragment.png`.
- Initial real environment attempt: the API at port 8000 had not started, so the article request failed and the fragment could not yet be verified. No real business data or admin settings were read or changed. After the backend became available, the live check passed as recorded below.

### 2026-09-29 real environment acceptance completed

- Dependency status remains `Blocked by: None`; implementation review against the spec completed with no findings.
- Environment: reused the attached, logged-in Chrome session at the real site `http://127.0.0.1:3000`; backend `http://127.0.0.1:8000` was listening and `/openapi.json` returned HTTP 200. `playwright-cli -s=about-banner-live route-list` reported no active routes, so the page used the real API and no mock replacement.
- Passed: `playwright-cli -s=about-banner-live goto 'http://127.0.0.1:3000/posts/testing#asdad'` and reload showed the intended `asdad` H2 with stable ID `asdad`. The hash target was visible at the top offset (desktop 95.8 CSS px; mobile 96.2 CSS px) matching its computed `scroll-margin-top: 96px`; the article had one H1 and no horizontal overflow at either viewport. `playwright-cli -s=about-banner-live console` reported 0 errors and 0 warnings.
- Real-site screenshots, captured while the existing `#asdad` value was visible: desktop viewport/output 1440x900 at `D:\VibeCoding\evidence\post-headings-live-2026-09-29\post-headings-live-desktop-1440x900.png`; mobile viewport/output 375x812 at `D:\VibeCoding\evidence\post-headings-live-2026-09-29\post-headings-live-mobile-375x812.png`. Both files are outside the repository.
- Real data: no backend/admin or business data was changed; no restoration was necessary. All acceptance criteria are now verified, so the ticket is resolved. Remaining risks: none identified for this ticket.

### 2026-09-29 follow-up: mock avatar fallback assertion

- Root cause: commit `9f9c511` changed the mock Site Identity `avatar_url` to the relative upload path `/uploads/images/site-avatar.webp`; the API client correctly resolves that path against the configured mock API origin. The old `https://example.com/media/site-avatar.webp` assertions no longer matched this fixture contract.
- Updated the Post-reader and homepage E2E metadata assertions to expect `http://127.0.0.1:8787/uploads/images/site-avatar.webp`. No production code or real data was changed.
- Passed: the formerly failing Post-reader fallback test (1 passed); full `post-reader.spec.ts` on Chromium (2 passed, 1 mobile-only test skipped); focused homepage metadata test (1 passed); ESLint and Prettier checks for both changed specs.
- Separate observation: the unfiltered `homepage-content.spec.ts` run also reported a viewport-stability test failure from Nuxt runtime-config and hydration warnings. This is independent of the avatar fallback assertion and was not changed here.

### 2026-09-29 follow-up: screenshot-time hydration warnings

- Root cause: Playwright's default screenshot caret hiding injected `caret-color: transparent !important` into the homepage music progress input while Nuxt hydration was still pending. A later viewport iteration then observed a style mismatch and emitted a Vue hydration warning together with `NUXT_E1003`.
- Set `caret: 'initial'` on both screenshots in the viewport-stability loop so screenshots do not mutate the live page while hydration is pending. No application code or real data changed.
- Passed: full `homepage-content.spec.ts` on desktop Chromium (2 passed) and mobile Chromium (2 passed); each includes the six-viewport stability check, whose page console/pageerror assertion is empty. ESLint and Prettier checks for the changed spec passed. Two mobile startup attempts initially timed out at the configured mock WebServer, but the subsequent full mobile run started and passed.
- The Playwright/Node process still prints `NO_COLOR`/`FORCE_COLOR` environment precedence notices; these are runner-level output and are not browser console warnings or application warnings.
- Environment/data: checks use the mock site and mock API configured at ports 3103 and 8787. This is a test-only change; no real site/API or business data was accessed or modified in this follow-up.
