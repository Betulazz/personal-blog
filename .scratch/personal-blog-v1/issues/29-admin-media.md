# 29: Admin Media Asset management

**What to build:** Let the Administrator upload, inspect, reuse, and safely delete local Media Assets through the administration interface.

**Blocked by:** 20: Media Asset local-storage lifecycle; 24: Admin login, shell, and dashboard.

**Status:** completed

- [x] Upload surfaces accepted types/limits and gives safe progress, success, validation, network, and server-error feedback.
- [x] The media library supports useful browsing, preview, metadata, copyable resolved URL/reference, loading, and empty states.
- [x] Spoofed type, oversize content, processing failure, missing bytes, and expired session have actionable non-destructive UI.
- [x] Delete confirmation reports known references and partial failure without pretending metadata and bytes are synchronized.
- [x] Keyboard, touch, image/audio preview, and narrow-screen behavior are usable.
- [x] HTTP/Playwright tests, security cases, lint, types, storage cleanup, and diff review pass.

## Comments

### 2026-09-22

- Added `GET /admin/media/policy` (accepted types plus upload/image limits from Settings) and
  `GET /admin/media/{id}/references` (known content references) so the UI can be truthful before
  an upload or delete begins. The existing admin listing now accepts a `kind=image|audio` filter
  backed by the `ix_media_assets_listing` index.
- Added `/admin/media`: upload dropzone with client validation against the fetched policy, XHR
  upload with a real progress bar, kind filters, pagination, image/audio previews with a
  missing-bytes state, metadata, copyable adapter-resolved URL and content reference, and a
  reference-aware delete dialog. Byte/metadata divergence (`media_bytes_missing`,
  `media_metadata_delete_failed`) is reported honestly with a `purge_metadata` recovery action.
- Kept the Admin shell mounted while the session status is `refreshing` so an in-flight upload or
  delete survives an expired access token instead of losing its UI state.
- Media asset responses now use the adapter-resolved `url` as the reference and copyable URL
  instead of rebuilding `/uploads/{key}` on the client, keeping S3-compatible storage possible.
- Verification: backend Ruff/format/Mypy clean and 49 Pytest tests passed against native MySQL;
  frontend 71 unit tests, ESLint, Nuxt typecheck, and Prettier clean; mocked Playwright 155 passed
  / 5 skipped; live Playwright 14 passed across Chromium and mobile Chromium.
- Browser review: fixed desktop (1440) and mobile (430) captures plus full-page captures and a
  delete-reference dialog capture inspected; no overflow at 375/430/768/1024/1440/1920, clean
  console logs, keyboard file input/dialog paths and touch targets verified.
- Code review (Standards and Spec axes) findings addressed: adapter-resolved URL, stale pagination
  after deleting the last item on a page, upload trimming at page size, a dead reference helper,
  policy retry, and explicit coverage for loading, policy/list failure, and reference-check
  failure. Pre-existing admin style duplication and the `useAdmin*` naming precedent were kept to
  avoid unrelated refactors.
