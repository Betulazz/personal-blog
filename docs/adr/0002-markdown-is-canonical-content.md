# ADR-0002: Markdown is the canonical long-form content format

## Status

Accepted

## Context

The administration experience uses Tiptap, while the public site requires portable articles, syntax highlighting, mathematics, tables, links, images, and a table of contents. Persisting only Tiptap-specific JSON would make content dependent on one editor schema and complicate migration, static export, external editing, and long-term maintenance.

Markdown cannot represent every arbitrary rich-editor structure without conventions, so round-trip behavior must be constrained and tested.

## Decision

The canonical persisted body for Posts and other long-form content is Markdown. Tiptap is an editing interface over that format. Editor-specific JSON may be used as temporary client state or a rebuildable cache, but it is not the source of truth.

Raw HTML is disabled by default or processed through a strict sanitization allowlist before rendering.

## Consequences

- Content remains portable, diffable, exportable, and editor-independent.
- The supported editing feature set must have deterministic Markdown serialization.
- Round-trip fixtures are required to prevent the editor from silently destroying supported Markdown.
- Features that cannot be represented safely and predictably in Markdown will not be added merely because the editor can display them.

