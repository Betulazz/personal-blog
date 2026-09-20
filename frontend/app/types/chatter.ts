import type {
  PublicCollectionPagination,
  PublicFeedFilters,
  PublicFeedQuery,
  PublicTag,
} from './public-content'

export interface Chatter {
  body: string
  id: string
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
  listChatter: (query: PublicFeedQuery) => Promise<ChatterCollectionResponse>
  listTags: () => Promise<PublicTag[]>
}
