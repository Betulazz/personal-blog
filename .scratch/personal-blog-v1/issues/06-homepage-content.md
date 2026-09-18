# 06: Homepage content aggregation

**What to build:** Make the homepage useful with typed fixture-backed sections for recent Posts, Moments, Chatter, selected Projects, social links, and resilient state handling.

**Blocked by:** 05: Public shell, navigation, and Site Identity.

**Status:** ready-for-agent

- [ ] Typed fixtures deliberately match the future API contracts and can later be removed without rewriting view components.
- [ ] Post, Moment, Chatter, and Project sections preserve their distinct domain meanings and visual treatments.
- [ ] Loading, empty, partial-error, and complete states retain a stable layout and clear recovery behavior.
- [ ] The page uses focused components rather than one giant route component or duplicated card recipes.
- [ ] Headings, links, images, metadata, and SEO placeholders are semantic and accessible.
- [ ] Browser checks at all fixed viewports, focused tests, lint, types, and diff review pass.

