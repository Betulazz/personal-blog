# 10: Markdown Post reading experience

**What to build:** Give visitors a safe, responsive long-form Post experience with technical content rendering and useful reading navigation.

**Blocked by:** 09: Post discovery, taxonomy, and search.

**Status:** ready-for-agent

- [ ] Supported Markdown renders headings, links, quotes, images, tables, fenced code, and mathematics during SSR without unsafe raw HTML execution.
- [ ] Shiki language loading and KaTeX styling are scoped so unrelated routes do not inherit unnecessary payload.
- [ ] Stable heading anchors, generated TOC, reading progress, previous/next navigation, and back-to-top behavior work.
- [ ] Desktop sticky TOC and mobile Sheet TOC remain keyboard accessible and do not squeeze article content.
- [ ] Fixtures cover Unicode, malformed input, disallowed HTML, long code lines, wide tables, and missing media.
- [ ] Security-focused tests, fixed-viewport browser checks, console review, lint, types, and diff review pass.

