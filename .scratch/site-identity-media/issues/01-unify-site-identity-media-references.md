# Unify Site Identity Media References

Status: ready-for-agent
Type: task
Implementation: complete

## Scope

Implement the confirmed [spec](../spec.md) through a shared module, replacing duplicated Site Identity validation and substring deletion checks. Preserve unrelated work.

## Acceptance

- All five structured reference locations use the shared rules.
- Missing or non-image managed avatar/favicon references return 422 and leave settings unchanged.
- Encoded references protect their asset; longer filenames and external lookalikes do not.
- Existing PATCH/clearing behavior and media deletion recovery contracts pass.

## Comments

- 2026-10-08: User confirmed the proposed behavior and implementation draft with “都按建议”. Implementation started.
- 2026-10-08: Implemented and verified. Related suite: 123 passed, 1 Windows/POSIX permission skip. Native MySQL tests used a unique disposable database; database and temporary grant were removed. Ruff, formatting, mypy, and diff checks passed. See [validation](../validation.md). No commit, deployment, or live site writes.
- 2026-10-08: User reported all manual acceptance checks complete and requested commit and server deployment.
