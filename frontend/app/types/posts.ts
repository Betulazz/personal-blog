export interface PostCover {
  alt: string
  height: number
  src: string
  width: number
}

export interface PostTag {
  name: string
  postCount: number
  slug: string
}

export interface PostSummary {
  cover?: PostCover
  id: string
  pinned: boolean
  publishedAt: string
  readingCount: number
  readingTimeMinutes: number
  slug: string
  summary: string
  tags: PostTag[]
  title: string
  updatedAt?: string
}

export interface PostDetail extends PostSummary {
  body: string
}

export interface PostPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PostQuery {
  page: number
  pageSize: number
  q?: string
  tag?: string
}

export interface PostCollectionResponse {
  data: PostSummary[]
  filters: {
    q?: string
    tag?: string
  }
  pagination: PostPagination
}

export interface TaxonomyCollectionResponse<T> {
  data: T[]
  pagination: PostPagination
}

export interface PostDiscoveryProvider {
  getPostBySlug: (
    slug: string,
    signal?: AbortSignal,
  ) => Promise<PostDetail | null>
  listPosts: (
    query: PostQuery,
    signal?: AbortSignal,
  ) => Promise<PostCollectionResponse>
  listTags: (
    signal?: AbortSignal,
  ) => Promise<TaxonomyCollectionResponse<PostTag>>
}
