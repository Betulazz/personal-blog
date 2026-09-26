# 08: Run integrated v2 polish acceptance

**What to build:** Verify the complete refinement against the accepted specification and saved visual references, repair integration regressions found by that verification, and update durable project documentation with only behavior that has actually passed.

**Blocked by:** 01 — Repair shared administrator select overlays; 02 — Expand the Post authoring workspace; 03 — Enable safe referenced-Tag deletion; 04 — Introduce Personal and GitHub Project variants; 05 — Add the configurable rotating Background Gallery; 06 — Refine public glass and heading rhythm; 07 — Align music lyrics and record proportions.

**Status:** acceptance complete; debug-artifact cleanup blocked by host command policy (2026-09-26)

- [x] Frontend unit tests, type checking, lint, formatting verification, production build, affected Playwright workflows, backend tests, backend static checks, and migration checks pass or have clearly separated external-provider blockers.
- [x] Production browser acceptance exercises every administrator select, Post editing and reading-time derivation, referenced-Tag deletion, both Project variants, Background Gallery management/rotation, public heading rhythm, and music synchronization.
- [x] The six required viewports have separate viewport and full-page screenshots for affected public and administrator surfaces with no clipping, horizontal overflow, framework overlay, or relevant console error.
- [x] A fidelity ledger compares at least heading offset, background visibility, glass translucency, disc rim/aperture, lyric initial position, desktop density, and mobile stacking against the saved reference evidence.
- [x] Accessibility acceptance covers keyboard paths, focus return, visible focus, control names, contrast across configured backgrounds, touch targets, and reduced motion.
- [x] Schema upgrades are verified from representative pre-refinement data and a fresh database without losing existing Projects, Posts, Tags, settings, or media references.
- [x] Architecture, domain, API/type, environment, deployment, and administrator guidance describe only the final verified behavior and explicitly defer GitHub API integration.
- [ ] Temporary debugging artifacts are removed while the user-requested reference screenshots and final acceptance evidence remain linked from the documentation.

## Integrated Acceptance Record (2026-09-26)

All tickets 01–07 were complete before this integrated run. The run used the
local MySQL 8.0.44 database and local fixture API with a freshly built Nuxt
production server. I directly inspected saved reference images and the latest
implementation captures. The complete image index is [matrix-index.md](C:/Users/Birchtula/.codex/visualizations/2026/09/26/01a0dca0-957b-7ba3-9824-a54f7923e97c/personal-blog-v2-polish-acceptance/matrix-index.md); the successful production build log is [production-build-final.log](C:/Users/Birchtula/.codex/visualizations/2026/09/26/01a0dca0-957b-7ba3-9824-a54f7923e97c/personal-blog-v2-polish-acceptance/production-build-final.log). The full screenshot and test evidence directory is:

`C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\`

### Commands and outcomes

Frontend checks ran on npm-bundled Node 22.22.2 (system Node is 22.20.0):

```powershell
npm exec --yes --package=node@22.22.2 -- npm run test:unit
npm exec --yes --package=node@22.22.2 -- npm run typecheck
npm exec --yes --package=node@22.22.2 -- npm run lint
npm exec --yes --package=node@22.22.2 -- npm run format:check
```

Results: 140 unit tests passed in 18 files; typecheck, lint, and formatting
passed. The unit runner printed a non-failing HappyDOM cleanup diagnostic.

Production build environment and command:

```powershell
$env:NUXT_E2E_DISABLE_TYPECHECK = 'true'
$env:NUXT_API_BASE = 'http://127.0.0.1:8787/api/v1'
$env:NUXT_DESIGN_SYSTEM_FIXTURES = 'true'
$env:NUXT_PUBLIC_API_BASE = 'http://127.0.0.1:8787/api/v1'
$env:PUBLIC_SITE_URL = 'http://127.0.0.1:3102'
npm exec --yes --package=node@22.22.2 -- npm run build
```

Result: exit 0. Existing bundle-size and dependency trailing-slash warnings
were reported without failing the build.

The complete production Playwright acceptance used:

```powershell
$env:POLISH_ACCEPTANCE_REUSE_SERVERS = 'true'
$env:POLISH_ACCEPTANCE_EVIDENCE = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance'
$env:POLISH_ACCEPTANCE_RESULTS = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\playwright-results-final'
$env:VISUAL_REFINEMENT_EVIDENCE = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\visual-refinement'
$env:DESIGN_SYSTEM_EVIDENCE_DIR = 'C:\Users\Birchtula\.codex\visualizations\2026\09\26\01a0dca0-957b-7ba3-9824-a54f7923e97c\personal-blog-v2-polish-acceptance\design-system'
npm exec --yes --package=node@22.22.2 -- npm run test:e2e:polish
```

Result: 115 passed, 3 intentional skips, desktop Chromium and Pixel 7. The
acceptance covers 14 public/admin surfaces, all select overlays, Post
round-trip/derived reading time, referenced Tag deletion, both Project
variants, Background Gallery ordering and motion, Music, and visual/keyboard
workflows. The six-size matrix is 14 × 6 × 2 = 168 separate viewport/full-page
PNGs at 375×812, 430×932, 768×1024, 1024×768, 1440×900, and 1920×1080.
There were no horizontal overflows, application error pages, relevant browser
console errors, or failed responses. Two mobile matrix duplicates and the
mobile portfolio viewport matrix are intentionally skipped. Gallery behavior,
six design-system captures, and 24 Timeline/Music captures are also preserved.

The accepted references directly inspected are
`.scratch/personal-blog-v2/reference/xinghuisama-home-1920x1080.png`,
`xinghuisama-timeline-1440x900.png`, `xinghuisama-timeline-pixel7-full.png`,
`xinghuisama-music-1920x1080.png`, and
`xinghuisama-music-pixel7-full.png`. The fidelity measurements and comparison
are in [`docs/personal-blog-v2-polish-fidelity-ledger.md`](../../../docs/personal-blog-v2-polish-fidelity-ledger.md).

Backend commands, run from `backend/`:

```powershell
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run alembic heads
uv run pytest -q -rs tests/test_content_model_migration.py tests/test_project_variant_migration.py tests/test_background_gallery_contract.py
```

Results: 83 passed, 1 skipped, 15 deprecation warnings; Ruff checks passed,
Ruff format reported 123 files formatted, mypy found no errors in 80 files,
and Alembic reports `0016_background_gallery (head)`. Targeted representative
legacy-data, variant, and Background Gallery migration tests exited 0 against
native MySQL 8.0.44. The complete suite also upgraded an empty isolated test
schema and exercised existing Posts, Tags, Projects, settings, and media
references. Docker was unavailable, so container migration rehearsal was not
claimed.

### Regression found and repaired

The unsafe-Markdown persistence E2E could read storage while its save request
was still in flight; the production form now waits for the Markdown editor's
canonical-ready signal before submitting and the E2E waits for the Save control
to re-enable before inspecting persisted data. Ten production repetitions of
the formerly racy scenario passed. Markdown sanitization/canonicalization
policy itself was not changed.

### External limits and intentional visual differences

- Playwright used local mocked API/media fixtures. NetEase login, paid
  entitlement, real playback/media availability, provider album art, and live
  lyric timing were not proven. Captures can correctly show the fallback disc
  and no active lyric when there is no playback clock. GitHub Projects are
  manually authored; the GitHub API is deliberately not called.
- Docker and the Browser plugin were unavailable. Local Playwright Chromium
  was used and backend integration ran against native MySQL. The v2 Compose
  deployment was not revalidated.
- The current 夜航手记 branding, copy, and v2 page/navigation structure
  intentionally differ from older XingHuiSama screenshots; the ledger compares
  visual rhythm/layout, not identical content. Exact heading, glass, contrast,
  disc, mobile, and lyric observations are recorded in the ledger.
- Playwright color-environment and build dependency/bundle warnings were
  non-failing. The three skips above are the only intentional browser skips.
- Cleanup of the two intermediate directories `playwright-results/` and
  `focused-results/` and the intermediate `production-build.log` was attempted
  only after resolving each target under the acceptance evidence directory.
  The host command policy rejected each native PowerShell `Remove-Item`
  operation. Those three temporary items remain; the final screenshot matrix,
  `playwright-results-final/`, and `production-build-final.log` are retained.

The detailed command/results record is also in
[`docs/deployment.md`](../../../docs/deployment.md#v2-polish-integrated-acceptance-record-2026-09-26).
