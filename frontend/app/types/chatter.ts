import type {
  PublicCollectionPagination,
  PublicFeedFilters,
  PublicFeedQuery,
  PublicTag,
} from './public-content'

export interface Chatter {
  body: string
  id: string
  lead?: string
  mood?: string
  publishedAt: string
  tags: PublicTag[]
  title: string
}

export interface ChatterCollectionResponse {
  data: Chatter[]
  filters: PublicFeedFilters
  pagination: PublicCollectionPagination
}

export interface ChatterProvider {
  listChatter: (
    query: PublicFeedQuery,
    signal?: AbortSignal,
  ) => Promise<ChatterCollectionResponse>
  listTags: (signal?: AbortSignal) => Promise<PublicTag[]>
}
