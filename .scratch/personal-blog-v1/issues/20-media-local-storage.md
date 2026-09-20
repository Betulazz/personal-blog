# 20: Media Asset local-storage lifecycle

**What to build:** Give the Administrator a safe local-development Media Asset workflow whose business contract can later support S3-compatible storage without changing content behavior.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [x] Business behavior depends on the storage abstraction rather than provider-specific code.
- [x] Local uploads verify actual supported content, enforce size and image-processing limits, and use generated safe logical keys.
- [x] Media metadata records content type, size, logical identity, storage strategy, and URL resolution without exposing filesystem internals.
- [x] Public delivery supports intended images/audio while rejecting path traversal and unsupported content.
- [x] Delete behavior reports references and makes metadata/byte partial failures observable and recoverable.
- [x] HTTP and storage tests cover valid upload, spoofed MIME, oversize input, traversal, collisions, missing bytes, references, authorization, and cleanup.

## Comments

### 2026-09-20

- Added provider-neutral `StorageAdapter` and atomic local filesystem storage with generated logical keys, verified image/audio content, configurable upload and image-processing limits, and no filesystem paths in API responses.
- Added `media_assets` persistence, Administrator upload/list/detail/delete/orphan-cleanup endpoints, safe `/uploads/{key}` delivery, reference-aware deletion, missing-byte purge recovery, and stable storage failure envelopes.
- Added Alembic migration `0009_media_assets`, native MySQL HTTP/storage/failure coverage, parseable audio delivery coverage, and browser smoke verification through Swagger, CSRF login, upload, public delivery, traversal rejection, and deletion.
- Verification passed: backend Ruff, format, Mypy, full Pytest against native MySQL, frontend 51/51 unit tests, ESLint, Nuxt typecheck, Prettier, and frontend Playwright 90 passed / 2 skipped.
