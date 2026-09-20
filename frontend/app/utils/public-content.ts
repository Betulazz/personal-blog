import type {
  PublicFeedQuery,
  PublicFeedRouteQuery,
} from '~/types/public-content'

export const PUBLIC_FEED_PAGE_SIZE = 12
export const PUBLIC_FEED_MAX_PAGE_SIZE = 20

const toScalar = (value: unknown) => {
  if (Array.isArray(value)) {
    return toScalar(value[0])
  }

  return typeof value === 'string' ? value : undefined
}

const normalizeSlug = (value: unknown) => {
  const scalar = toScalar(value)?.trim().toLocaleLowerCase()
  return scalar && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scalar)
    ? scalar
    : undefined
}

const normalizePage = (value: unknown) => {
  const scalar = toScalar(value)
  return scalar && /^\d+$/.test(scalar) ? Math.max(Number(scalar), 1) : 1
}

const normalizeSearch = (value: unknown) => {
  const scalar = toScalar(value)?.trim()
  return scalar ? scalar.slice(0, 120) : undefined
}

export const buildPublicFeedQuery = (
  routeQuery: PublicFeedRouteQuery,
): PublicFeedQuery => {
  const query: PublicFeedQuery = {
    page: normalizePage(routeQuery.page),
    pageSize: PUBLIC_FEED_PAGE_SIZE,
  }
  const q = normalizeSearch(routeQuery.q)
  const tag = normalizeSlug(routeQuery.tag)

  if (q) {
    query.q = q
  }
  if (tag) {
    query.tag = tag
  }

  return query
}

export const buildPublicFeedRouteQuery = (query: PublicFeedQuery) => ({
  ...(query.page > 1 ? { page: String(query.page) } : {}),
  ...(query.q ? { q: query.q } : {}),
  ...(query.tag ? { tag: query.tag } : {}),
})

export const clampPublicPageSize = (pageSize: number) =>
  Math.min(Math.max(Math.trunc(pageSize), 1), PUBLIC_FEED_MAX_PAGE_SIZE)

export const isPublicFeedPageOutOfRange = (page: number, totalPages: number) =>
  totalPages > 0 && page > totalPages

export const toPublicFilters = (query: PublicFeedQuery) => ({
  ...(query.q ? { q: query.q } : {}),
  ...(query.tag ? { tag: query.tag } : {}),
})

export const formatPublicDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).format(new Date(value))
