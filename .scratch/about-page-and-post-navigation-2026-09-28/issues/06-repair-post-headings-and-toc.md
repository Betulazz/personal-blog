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
