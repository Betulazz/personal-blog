# 30: Tiptap Markdown-first editor

**What to build:** Upgrade Post authoring with a Tiptap editing surface while keeping Markdown as the portable canonical value and protecting every supported construct from destructive round trips.

**Blocked by:** 10: Markdown Post reading experience; 25: Admin Post, Category, and Tag management; 29: Admin Media Asset management.

**Status:** ready-for-agent

- [ ] Loading existing canonical Markdown into the editor and saving it preserves supported semantic content.
- [ ] Heading, fenced code, quote, image, table, link, math, Unicode, and TOC-related fixtures survive deterministic round trips.
- [ ] Raw/disallowed HTML, unsafe links, malformed Markdown, pasted content, and unsupported structures follow an explicit safe policy.
- [ ] Media selection/upload integrates through Media Asset behavior without embedding provider-specific storage assumptions.
- [ ] Editor loading, dirty state, validation, preview, save failure, session expiry, and navigation-away protection are complete.
- [ ] Fixture tests, Post create/edit/publish Playwright flow, accessibility/mobile checks, bundle review, lint, types, and diff review pass.

