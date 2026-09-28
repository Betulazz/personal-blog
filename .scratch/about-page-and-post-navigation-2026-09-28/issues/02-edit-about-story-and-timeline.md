# 02: Edit About story and timeline

**What to build:** Give an Administrator a dedicated About Page Content workspace to maintain the story and timeline that visitors read on the public About page.

**Blocked by:** 01: Promote the selected About page design.

**Status:** resolved

- [x] The administration navigation has a distinct “关于页面” entry. The editor loads existing About Page Content and keeps Site Identity fields such as name, avatar, contact details, and social links in the existing site settings workspace.
- [x] An Administrator can edit the story and timeline section headings and introductions, add/edit/remove/reorder story paragraphs, and add/edit/remove/reorder timeline entries. Decorative English labels remain fixed, and content remains plain text.
- [x] Saving and reloading preserves the order and text; the public About page reflects the saved values. Existing records without new heading or introduction fields remain readable with sensible defaults.
- [x] Validation, session, or server failures show actionable feedback without losing the unsaved draft. Unauthorized visitors cannot change settings.
- [x] An authenticated Administrator flow and public-page browser check record the actual outcome; relevant checks and remaining limitations are recorded before resolution.

## Comments

2026-09-29 — 已完成验收。阻塞项 01 已 resolved。实现沿用现有 `/admin/settings` JSON，不需要数据库迁移；增加独立“关于页面”编辑入口，支持故事/时间线标题、导语和条目维护，公开页默认标题与导语兼容旧记录。

验证结果：

- `npm run test:e2e -- tests/e2e/admin-about-page.spec.ts` — 6 passed（Chromium 与 mobile-chromium）。覆盖编辑、新增/删除/排序、保存重载、公开页回显、旧记录默认值、错误草稿保留、未授权拒绝与移动端菜单/溢出。
- `npm run lint`、`npm run typecheck` — 通过。`npm exec prettier -- --check app/api/client.ts app/components/admin/AdminShell.vue app/components/admin/AdminAboutPageEditor.vue app/components/portfolio/AboutView.vue app/composables/usePublicSiteSettings.ts app/pages/admin/about/index.vue app/types/admin-portfolio.ts app/types/portfolio.ts app/types/site.ts app/utils/about-content.ts tests/e2e/admin-about-page.spec.ts` — 通过。
- `.venv\Scripts\python.exe -m pytest tests\test_about_page_settings_schema.py` — 2 passed；`ruff check app/schemas/portfolio.py tests/test_about_page_settings_schema.py` — 通过。
- 隔离目录构建：设置 `NUXT_E2E_BUILD_DIR=.cache/nuxt-build-about`、`NUXT_IGNORE_LOCK=1` 后 `npm run build` — 通过。默认构建目录当时被已有 3000 端口开发服务器占用，因此保留该进程并隔离输出目录完成构建。
- 本 ticket 提交集 `git diff --cached --check` — 通过。全仓检查只报告未修改、未暂存的 `CONTEXT.md:48` 既有 Markdown 行尾空格。
- Playwright 连接 Chrome 的现有 Administrator 登录态，页头身份为 `admin`。桌面 About 编辑、模拟设置保存/重载和移动端后台编辑均通过；移动视口 430×932 时页面宽度为 415/415，无横向溢出。设置 GET/PATCH 由浏览器路由 mock 拦截，身份验证继续使用现有登录态；未写入真实设置。mock E2E 的公开 About 桌面检查验证了保存后的标题、导语、段落顺序与时间线回显。浏览器应用错误为 0；开发模式记录 3 条 Nuxt 警告。

截图（仓库外）：`C:\Users\Birchtula\.codex\visualizations\2026\09\29\about-story-timeline-ticket-02\admin-about-authenticated-desktop.png`、`admin-about-authenticated-mobile.png`、`public-about-desktop-saved.png`、`public-about-mobile-saved.png`、`public-about-timeline-desktop.png`。

剩余限制：按要求使用 mock 测试环境，未对真实 MySQL 做写入或端到端持久化验证；schema 与 partial-update 语义由 Pydantic 单元测试覆盖，保存/重载和公开页回显由 mock API 覆盖。没有阻塞验收的已知问题。
