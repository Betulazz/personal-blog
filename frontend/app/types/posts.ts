export interface PostCover {
  alt: string
  height: number
  src: string
  width: number
}

export interface PostCategory {
  name: string
  postCount: number
  slug: string
}

export interface PostTag {
  name: string
  postCount: number
  slug: string
}

export interface PostSummary {
  category: PostCategory
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
  canonicalUrl?: string
  ogImageUrl?: string
  seoDescription?: string
  seoTitle?: string
}

export interface PostPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PostQuery {
  category?: string
  page: number
  pageSize: number
  q?: string
  tag?: string
}

export interface PostCollectionResponse {
  data: PostSummary[]
  filters: {
    category?: string
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
  listCategories: (
    signal?: AbortSignal,
  ) => Promise<TaxonomyCollectionResponse<PostCategory>>
  listPosts: (
    query: PostQuery,
    signal?: AbortSignal,
  ) => Promise<PostCollectionResponse>
  listTags: (
    signal?: AbortSignal,
  ) => Promise<TaxonomyCollectionResponse<PostTag>>
}
