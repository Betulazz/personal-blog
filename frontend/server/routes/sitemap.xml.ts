import {
  buildSitemapEntries,
  normalizeSiteUrl,
  renderSitemap,
  type SitemapEntry,
} from '../utils/sitemap'

interface CollectionEnvelope {
  data: unknown[]
  pagination?: { total_pages?: number }
}

const PAGE_SIZE = 100
const MAX_PAGES = 20

const fetchAll = async <T>(
  apiBase: string,
  path: string,
  toItem: (value: unknown) => T,
): Promise<T[]> => {
  const items: T[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= MAX_PAGES) {
    const response = await $fetch<CollectionEnvelope>(path, {
      baseURL: apiBase,
      query: { page, page_size: PAGE_SIZE },
    })
    totalPages = Math.max(1, response.pagination?.total_pages ?? 1)
    items.push(...response.data.map(toItem))
    page += 1
  }

  if (page <= totalPages) {
    console.warn(`sitemap: ${path} truncated after ${MAX_PAGES} pages`)
  }

  return items
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = normalizeSiteUrl(String(config.apiBase))
  const siteUrl = String(config.public.siteUrl)
  let degraded = false

  const collect = async <T>(
    path: string,
    toItem: (value: unknown) => T,
  ): Promise<T[]> => {
    try {
      return await fetchAll(apiBase, path, toItem)
    } catch (error) {
      degraded = true
      console.error(`sitemap: ${path} could not be collected`, error)
      return []
    }
  }

  const posts = await collect('/posts', (value) => {
    const post = value as {
      slug?: unknown
      updated_at?: unknown
    }
    return {
      slug: typeof post.slug === 'string' ? post.slug : '',
      updatedAt: typeof post.updated_at === 'string' ? post.updated_at : null,
    }
  })

  const entries: SitemapEntry[] = buildSitemapEntries({
    posts: posts.filter((post) => post.slug),
    siteUrl,
  })

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(
    event,
    'cache-control',
    degraded ? 'public, max-age=60' : 'public, max-age=900',
  )
  return renderSitemap(entries)
})
