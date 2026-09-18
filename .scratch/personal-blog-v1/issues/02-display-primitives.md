# 02: Glass containers and display primitives

**What to build:** Provide the reusable non-form visual building blocks needed to compose the blog while keeping glass, glow, spacing, borders, and content hierarchy consistent.

**Blocked by:** 01: Visual concept, tokens, and background assets.

**Status:** ready-for-agent

- [ ] GlassPanel, GlassCard, Badge, SectionHeader, PageContainer, GlowLayer, and BackgroundLayer expose focused, typed interfaces.
- [ ] Every primitive consumes semantic tokens instead of duplicating visual recipes or relying on unexplained magic numbers.
- [ ] Content stress cases cover long Chinese/English text, missing media, narrow widths, and dense metadata.
- [ ] Hover and decorative effects respect reduced motion and do not create avoidable continuous GPU work.
- [ ] Primitives remain accessible and readable over every approved background treatment.
- [ ] Browser inspection, focused tests, lint, type checks, and diff review pass.

