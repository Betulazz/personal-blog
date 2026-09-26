import type { Chatter } from './chatter'
import type { PostSummary } from './posts'
import type { PublicCollectionPagination } from './public-content'
export type TimelineEntry =
  { kind: 'post'; content: PostSummary } | { kind: 'chatter'; content: Chatter }
export interface TimelineCollectionResponse {
  data: TimelineEntry[]
  filters: { q?: string }
  pagination: PublicCollectionPagination
}
