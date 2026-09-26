import type {
  PublicCollectionPagination,
  PublicFeedFilters,
  PublicFeedQuery,
} from './public-content'

export interface Chatter {
  body: string
  id: string
  mood?: string
  publishedAt: string
  images: Array<{ src: string; alt: string; width: number; height: number }>
  title?: string
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
}
