import type {
  PublicCollectionPagination,
  PublicFeedFilters,
  PublicFeedQuery,
  PublicTag,
} from './public-content'

export interface MomentImage {
  alt: string
  height: number
  src: string
  width: number
}

export interface Moment {
  body: string
  id: string
  images?: MomentImage[]
  location?: string
  mood?: string
  publishedAt: string
  tags?: PublicTag[]
}

export interface MomentCollectionResponse {
  data: Moment[]
  filters: PublicFeedFilters
  pagination: PublicCollectionPagination
}

export interface MomentProvider {
  listMoments: (
    query: PublicFeedQuery,
    signal?: AbortSignal,
  ) => Promise<MomentCollectionResponse>
  listTags: (signal?: AbortSignal) => Promise<PublicTag[]>
}
