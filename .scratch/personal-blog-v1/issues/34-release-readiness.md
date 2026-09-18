# 34: v1 final regression and release decision

**What to build:** Produce an evidence-backed v1 release decision after complete functional, visual, security, operational, and documentation regression.

**Blocked by:** 33: Cloud-server Docker deployment and operations.

**Status:** ready-for-agent

- [ ] Public navigation, content discovery, Markdown reading, player, all content types, search, taxonomy, links, metadata, and error recovery pass regression.
- [ ] Administrator authentication, refresh/logout, every CRUD surface, publishing, editor round trip, media, settings, and failure recovery pass regression.
- [ ] Final fixed-viewport and cross-browser visual evidence matches the approved design language with no unresolved material review issue.
- [ ] Security review finds no committed secrets, unsafe Markdown/HTML, permissive production CORS, invalid upload path, exposed traceback/SQL, default credential, or localStorage authentication.
- [ ] Performance, accessibility, SEO, deployment, migration, health, backup, restore, and known-limit documentation meet the agreed acceptance bar.
- [ ] Photo wall, 灵境, and all other excluded scope remain absent.
- [ ] Repository is clean; builds, lint, formatting, types, all automated tests, console review, secret scan, dead/debug cleanup, and final Standards/Spec review pass.

