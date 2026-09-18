# 31: Admin workflow end-to-end acceptance

**What to build:** Prove all administration workflows work together through the rendered application and native local backend/database before animation and final quality work.

**Blocked by:** 26: Admin Moment and Chatter management; 27: Admin Project, Friend Link, and Site Identity management; 28: Admin Music Track management; 29: Admin Media Asset management; 30: Tiptap Markdown-first editor.

**Status:** ready-for-agent

- [ ] Playwright covers login, refresh recovery, logout, Post creation/edit/publish, Markdown preservation, and public visibility.
- [ ] Representative Moment, Chatter, Project, Friend Link, Site Identity, Music Track, and Media Asset changes reach their public consumers.
- [ ] Validation, unauthorized, expired session, conflict, missing record, upload failure, and backend error recovery are exercised.
- [ ] Keyboard navigation, focus, dialogs/sheets, touch targets, mobile layout, and unsaved-form behavior pass review.
- [ ] Tests run against native local Node, Python, and MySQL services without Docker.
- [ ] Console/network review, frontend/backend suites, production builds, secret scan, cleanup, and diff review pass.

