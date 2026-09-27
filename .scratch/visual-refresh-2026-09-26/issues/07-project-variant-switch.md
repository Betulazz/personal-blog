# 07: Add a Project variant switch backed by complete filtering

Type: task
Status: ready-for-agent
Blocked by: None

## What to build

Add a two-option segmented control to `/projects` for 开源项目 and 自己的项目. Use the existing discriminated Project variants; default to open source, synchronize with the URL, and filter before pagination.

## Acceptance criteria

- [ ] 开源项目 maps only to `github_open_source`; 自己的项目 maps only to `personal`. Existing cards retain variant-specific fields/links. A Personal Project with a GitHub source URL remains personal and appears only once.
- [ ] Initial `/projects` defaults to 开源项目 and normalizes to a canonical `type=github_open_source` query. `type=personal` deep links render the corresponding option. Invalid values normalize to the default. Toggling creates useful browser history; Back/Forward restores the prior selection.
- [ ] The public API filters by `project_type` before pagination, reports the filtered total, and lets users reach entries after the first 20. Switching type resets the page. Loading, empty, and error states are specific to the selected variant.
- [ ] The segmented control exposes a clear selected state, accessible names, keyboard operation, focus visibility, and touch targets. It works at all established mobile/desktop viewports without horizontal overflow.
- [ ] Backend contract tests cover both types, a personal item with a GitHub source URL, 21+ entries of one type, filtered totals/pages, and invalid type parameters. Playwright verifies direct links, history, pagination, both empty states, card links, and screenshots.
- [ ] Homepage Project selection and administrator project type assignment are unchanged. No GitHub API calls or automatic metadata enrichment are added.

## Starting points

`frontend/app/components/portfolio/ProjectsView.vue`, `frontend/app/pages/projects/index.vue`, public project API in `backend/app/api/v1/routes/portfolio.py` and service/repository methods. Admin project filtering already exists, but public `GET /projects` currently has no type parameter and defaults to page size 20.

## Comments

### 2026-09-27 implementation and validation

- Added public `project_type` filtering before pagination and filtered totals. The `/projects` page now defaults to the canonical `type=github_open_source` URL, supports `personal` deep links, resets page when switching, restores Back/Forward history, and exposes keyboard-operable variant selection and pagination. Personal Projects remain personal when their source URL points to GitHub.
- Backend contract test: `python -m pytest tests/test_project_variants_contract.py` — **3 passed** against the dedicated MySQL `_test` database; one existing Starlette 422 deprecation warning. Coverage includes 22 Personal Projects over two pages, filtered totals, GitHub source URLs, distinct variant results, and invalid types.
- Frontend checks: `npm run typecheck`, `npm run lint`, and targeted `prettier --check` — **passed**. Backend `ruff check` — **passed**.
- Playwright: `npm run test:e2e -- --config=C:\Users\Birchtula\.codex\visualizations\2026\09\27\project-variant-switch\playwright.project-variant.config.mjs --project=chromium` — **3 passed**. Verified variant cards/links, keyboard selection, deep links, invalid normalization, browser history, pagination, selected empty/error states, and no horizontal overflow at 375, 430, 768, 1024, 1440, and 1920 CSS pixels. The suite also ran the existing administrator project-variant test against its mock API.
- Screenshots are outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\27\project-variant-switch\`.
- **Pending acceptance:** the requested real administrator Chrome session could not be inspected. `playwright-cli attach --extension=chrome` reported that the Playwright Extension is not installed; `attach --cdp=chrome` reported that `DevToolsActivePort` is absent; Computer Use browser inventory returned `Unable to load browser request-header policy` on the initial attempt and retry. The mock-authenticated admin test is not a substitute for that live session. This ticket is intentionally not marked resolved until that verification is completed.
