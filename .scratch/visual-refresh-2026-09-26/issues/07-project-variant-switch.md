# 07: Add a Project variant switch backed by complete filtering

Type: task
Status: resolved
Blocked by: None

## What to build

Add a two-option segmented control to `/projects` for 开源项目 and 自己的项目. Use the existing discriminated Project variants; default to open source, synchronize with the URL, and filter before pagination.

## Acceptance criteria

- [x] 开源项目 maps only to `github_open_source`; 自己的项目 maps only to `personal`. Existing cards retain variant-specific fields/links. A Personal Project with a GitHub source URL remains personal and appears only once.
- [x] Initial `/projects` defaults to 开源项目 and normalizes to a canonical `type=github_open_source` query. `type=personal` deep links render the corresponding option. Invalid values normalize to the default. Toggling creates useful browser history; Back/Forward restores the prior selection.
- [x] The public API filters by `project_type` before pagination, reports the filtered total, and lets users reach entries after the first 20. Switching type resets the page. Loading, empty, and error states are specific to the selected variant.
- [x] The segmented control exposes a clear selected state, accessible names, keyboard operation, focus visibility, and touch targets. It works at all established mobile/desktop viewports without horizontal overflow.
- [x] Backend contract tests cover both types, a personal item with a GitHub source URL, 21+ entries of one type, filtered totals/pages, and invalid type parameters. Playwright verifies direct links, history, pagination, both empty states, card links, and screenshots.
- [x] Homepage Project selection and administrator project type assignment are unchanged. No GitHub API calls or automatic metadata enrichment are added.

## Starting points

`frontend/app/components/portfolio/ProjectsView.vue`, `frontend/app/pages/projects/index.vue`, public project API in `backend/app/api/v1/routes/portfolio.py` and service/repository methods. Admin project filtering already exists, but public `GET /projects` currently has no type parameter and defaults to page size 20.

## Comments

### 2026-09-27 implementation and validation

- Added public `project_type` filtering before pagination and filtered totals. The `/projects` page now defaults to the canonical `type=github_open_source` URL, supports `personal` deep links, resets page when switching, restores Back/Forward history, and exposes keyboard-operable variant selection and pagination. Personal Projects remain personal when their source URL points to GitHub.
- Backend contract test: `python -m pytest tests/test_project_variants_contract.py` — **3 passed** against the dedicated MySQL `_test` database; one existing Starlette 422 deprecation warning. Coverage includes 22 Personal Projects over two pages, filtered totals, GitHub source URLs, distinct variant results, and invalid types.
- Frontend checks: `npm run typecheck`, `npm run lint`, and targeted `prettier --check` — **passed**. Backend `ruff check` — **passed**.
- Playwright: `npm run test:e2e -- --config=C:\Users\Birchtula\.codex\visualizations\2026\09\27\project-variant-switch\playwright.project-variant.config.mjs --project=chromium` — **3 passed**. Verified variant cards/links, keyboard selection, deep links, invalid normalization, browser history, pagination, selected empty/error states, and no horizontal overflow at 375, 430, 768, 1024, 1440, and 1920 CSS pixels. The suite also ran the existing administrator project-variant test against its mock API.
- Screenshots are outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\27\project-variant-switch\`.
- Real Chrome acceptance completed via the enabled Playwright Extension using the user's already-authenticated administrator profile. The feature-branch frontend/backend ran from this worktree at `127.0.0.1:3000` and `127.0.0.1:8000` against the local development database. No project/content writes were performed; the project form was opened for inspection and not submitted. The normal auth refresh endpoint ran during the existing admin session.
- In the real administrator session, `/admin/projects` showed the authenticated `退出` control. `/admin/projects/new` retained both `personal` and `github_open_source` project type options. The homepage still showed its existing featured Personal Projects without a variant switch.
- On the real public page, initial `/projects` normalized to `?type=github_open_source`, selected 开源项目, and rendered one open-source project. Switching to 自己的项目 rendered two cards tagged `PERSONAL PROJECT`, including their GitHub links. Keyboard arrows changed and restored the selected variant; Back/Forward restored each prior query; an invalid type normalized to the GitHub-open-source default. The focus outline was visible, each switch target measured at least 90×44 CSS pixels, and the rendered page had no horizontal overflow at 1536 CSS pixels. Browser console errors: **0**.
- Real-session screenshots are outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\27\project-variant-switch\real-admin-projects-github-open-source-default.png`, `real-admin-projects-personal.png`, and `real-admin-projects-personal-full.png`.
- All acceptance criteria passed; this ticket is resolved.
