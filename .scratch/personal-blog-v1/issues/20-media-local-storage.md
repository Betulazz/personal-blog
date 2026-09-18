# 20: Media Asset local-storage lifecycle

**What to build:** Give the Administrator a safe local-development Media Asset workflow whose business contract can later support S3-compatible storage without changing content behavior.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [ ] Business behavior depends on the storage abstraction rather than provider-specific code.
- [ ] Local uploads verify actual supported content, enforce size and image-processing limits, and use generated safe logical keys.
- [ ] Media metadata records content type, size, logical identity, storage strategy, and URL resolution without exposing filesystem internals.
- [ ] Public delivery supports intended images/audio while rejecting path traversal and unsupported content.
- [ ] Delete behavior reports references and makes metadata/byte partial failures observable and recoverable.
- [ ] HTTP and storage tests cover valid upload, spoofed MIME, oversize input, traversal, collisions, missing bytes, references, authorization, and cleanup.

