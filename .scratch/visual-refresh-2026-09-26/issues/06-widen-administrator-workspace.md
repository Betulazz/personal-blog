# 06: Widen the administrator workspace

Type: task
Status: resolved
Blocked by: None

## What to build

Move the administrator sidebar toward the left viewport gutter and let the main work area occupy the released width, while preserving the existing admin visual system and navigation.

## Acceptance criteria

- [x] At 1920 CSS pixels the sidebar begins within approximately 32 px of the viewport's left edge. The administrator header and main workspace use the wider grid consistently, without the previous 80rem outer cap wasting large side gutters.
- [x] Post authoring, Project editing, media, settings, and list views use available space without excessively long text lines or broken overlays. Existing select/popover stacking and focus behavior remain intact.
- [x] At 1024, 768, and 430 CSS-pixel widths, sidebar/navigation remains usable and no main control is clipped, overlapped, or horizontally scroll-trapped. Public layout widths are unchanged.
- [x] Authenticated Playwright checks exercise at least dashboard, Post editor, Project editor, and Site Identity settings; capture desktop and mobile screenshots, inspect console errors, and verify a representative primary action or control on each. A login redirect alone is insufficient evidence.

## Starting points

`frontend/app/components/admin/AdminShell.vue`, `frontend/app/layouts/admin.vue`, existing `frontend/tests/e2e/admin-shell.spec.ts` and administrator authoring tests. The reference site's public UI does not define an admin layout target; use this ticket's measurable local criteria.

## Comments

## Answer

- 将后台 header 和主体网格改为占满视口宽度，左右 gutter 随视口从 16px 增长到最多 32px；1920px 时侧栏起点实测为 32px，主工作区宽 1576px。
- Markdown 正文编辑列限制为 80ch，并在宽面板中居中；Project、Media、Site Identity、Dashboard 和列表使用展开后的后台网格。
- Playwright 使用隔离的真实 API/MySQL `_test` 环境登录，验证了 HttpOnly access/refresh Cookie。Dashboard、文章列表与编辑器、Project 列表与编辑器、Media、Site Identity 在 1024/768/430px 下共检查 21 个页面状态，均无横向溢出或水平越界控件。1920px 主区、Project Select 弹层层级与焦点、移动导航与 Escape 焦点返回、文章预览、媒体类型过滤和设置开关均通过；公开 header 仍为 1280px。
- Browser 插件未在会话工具中提供，按要求回退到 Playwright。截图保存在仓库外：`C:\Users\Birchtula\.codex\visualizations\2026\09\27\01a0e1f2-2a05-7a03-8589-f4ee13bc0922\admin-workspace-qa\`。
- 检查通过：`npm run test:e2e -- admin-shell.spec.ts admin-post-authoring.spec.ts --project=chromium`（7 passed）、authenticated Playwright workspace QA、`npm run lint`、`npm run typecheck`、改动文件 Prettier check、`npm run build`。
- 浏览器无应用级 console/page 错误。唯一失败资源请求为既有验收种子数据引用的缺失图片 `/uploads/live-acceptance/missing-moment.webp`。Production build 完成，但仍报告现有大于 500KB 的 client chunks 和依赖导出路径弃用警告。
