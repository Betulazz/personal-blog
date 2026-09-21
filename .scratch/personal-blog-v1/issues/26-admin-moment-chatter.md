# 26: Admin Moment and Chatter management

**What to build:** Let the Administrator manage Moment and Chatter through distinct, efficient workflows that reflect their separate fields and editorial intent.

**Blocked by:** 17: Moment and Chatter lifecycle API; 24: Admin login, shell, and dashboard.

**Status:** completed

- [x] Moment management supports chronological browsing, body, optional media, location, mood, Tags, status, and deletion.
- [x] Chatter management supports search/filtering, lead/title, body, mood, Tags, status, and deletion independently of Moment.
- [x] Forms omit irrelevant fields instead of presenting one universal content editor.
- [x] Loading, empty, validation, authorization, session expiry, server error, and confirmation states are complete.
- [x] Failed operations preserve recoverable input and successful mutations invalidate only relevant data.
- [x] HTTP/Playwright flows, keyboard/mobile checks, lint, types, and diff review pass.

## Comments

### 2026-09-22

- Added distinct admin Moment and Chatter list/editor routes, typed resource clients, tag selection, image/location/mood fields, status actions, confirmation dialogs, recoverable draft state, and mock Playwright coverage.
- Verification: focused and full frontend Playwright flows passed in Chromium and mobile Chromium; frontend typecheck, lint, Prettier, unit tests, and the Moment/Chatter backend contract tests passed.
