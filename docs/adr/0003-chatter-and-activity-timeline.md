# ADR-0003: Consolidate personal updates into Chatter and derive the Activity Timeline

Status: accepted and implemented for v2; integrated native acceptance recorded in issue 07 (2026-09-25)

The owner chose a single lightweight publishing space for personal thoughts instead of maintaining both Moment and Chatter. Migration 0012 moves existing Moments into Chatter while retaining their media and first-publication data in active rows and their retired fields and relationships in a private archive. Posts and Chatter remain separate authored content models, and 动态 will become a chronological read view over their published content rather than an independently authored entity.

This partially supersedes [ADR-0001](0001-separate-content-models.md): the separate Post/Chatter boundary remains, while the independent Moment lifecycle is retired. Posts retain Tags but no Category; Chatter has no Tags. Migration must preserve content, media ordering, publication state and dates; detailed legacy-field handling is recorded in the [v2 specification](../../.scratch/personal-blog-v2/spec.md).

The trade-off is accepting an explicit data migration and a composed timeline query in exchange for fewer overlapping authoring concepts. A unified polymorphic content table is unnecessary.
