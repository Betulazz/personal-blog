import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import type { PostQuery } from '~/types/posts'

export const POST_PAGE_SIZE = 4
export const POST_MAX_PAGE_SIZE = 20

export interface PostQueryContext {
  categorySlug?: string
  tagSlug?: string
}

export interface PostRouteQueryOptions {
  categoryIsPath?: boolean
  tagIsPath?: boolean
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const asSingleValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return asSingleValue(value[0])
  }

  return typeof value === 'string' ? value : undefined
}

const safeSlug = (value: unknown) => {
  const normalized = asSingleValue(value)?.trim().toLowerCase()
  return normalized && slugPattern.test(normalized) ? normalized : undefined
}

const safeSearch = (value: unknown) => {
  const normalized = asSingleValue(value)?.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, 80) : undefined
}

const safePage = (value: unknown) => {
  const raw = asSingleValue(value)?.trim() ?? ''
  if (!/^\d+$/u.test(raw)) {
    return 1
  }

  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

export function buildPostQuery(
  input: LocationQuery | Record<string, unknown>,
  context: PostQueryContext = {},
): PostQuery {
  return {
    category: safeSlug(context.categorySlug) ?? safeSlug(input.category),
    page: safePage(input.page),
    pageSize: POST_PAGE_SIZE,
    q: safeSearch(input.q),
    tag: safeSlug(context.tagSlug) ?? safeSlug(input.tag),
  }
}

export function buildPostRouteQuery(
  query: PostQuery,
  options: PostRouteQueryOptions = {},
): LocationQueryRaw {
  const routeQuery: LocationQueryRaw = {}

  if (query.page > 1) {
    routeQuery.page = String(query.page)
  }
  if (query.q) {
    routeQuery.q = query.q
  }
  if (query.category && !options.categoryIsPath) {
    routeQuery.category = query.category
  }
  if (query.tag && !options.tagIsPath) {
    routeQuery.tag = query.tag
  }

  return routeQuery
}

export function getPostPageCount(total: number, pageSize: number) {
  if (total <= 0 || pageSize <= 0) {
    return 0
  }

  return Math.ceil(total / pageSize)
}

export function isPostQueryPageOutOfRange(page: number, totalPages: number) {
  return totalPages > 0 && page > totalPages
}
