# 25: Admin Post, Category, and Tag management

**What to build:** Let the Administrator manage the complete Post editorial lifecycle and normalized taxonomy through resilient administration screens.

**Blocked by:** 16: Post, Category, and Tag lifecycle API; 24: Admin login, shell, and dashboard.

**Status:** ready-for-agent

- [ ] Post collection supports useful search, filters, pagination, publication state, and clear empty/loading/error states.
- [ ] Create/edit supports title, slug, summary, canonical Markdown, Category, Tags, cover/media references, SEO fields, and validation.
- [ ] Preview, publish, unpublish, and delete workflows explain conflicts and invalid transitions with safe confirmation.
- [ ] Category and Tag management preserves uniqueness and communicates references before destructive actions.
- [ ] Failed validation, expired sessions, and server errors do not silently discard editable form state.
- [ ] HTTP/Playwright tests cover a basic create-edit-publish flow; accessibility, responsive checks, lint, types, and diff review pass.

