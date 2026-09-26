export interface PublicTag {
  name: string
  slug: string
}

export interface PublicCollectionPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PublicFeedQuery {
  entry?: string
  page: number
  pageSize: number
  q?: string
  tag?: string
}

export interface PublicFeedFilters {
  q?: string
  tag?: string
}

export type PublicFeedRouteQuery = Record<string, unknown>
