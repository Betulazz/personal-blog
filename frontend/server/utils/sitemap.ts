export interface SitemapEntry {
  lastmod?: string
  loc: string
}

export interface SitemapSource {
  categories: string[]
  posts: Array<{
    canonicalUrl?: string | null
    slug: string
    updatedAt?: string | null
  }>
  siteUrl: string
  tags: string[]
}

export const normalizeSiteUrl = (siteUrl: string): string =>
  siteUrl.replace(/\/+$/, '')

export const SITEMAP_STATIC_PATHS = [
  '/',
  '/posts',
  '/categories',
  '/tags',
  '/moments',
  '/chatter',
  '/projects',
  '/friends',
  '/about',
] as const

export const escapeSitemapValue = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

export const buildSitemapEntries = ({
  categories,
  posts,
  siteUrl,
  tags,
}: SitemapSource): SitemapEntry[] => {
  const base = normalizeSiteUrl(siteUrl)
  const entries: SitemapEntry[] = SITEMAP_STATIC_PATHS.map((path) => ({
    loc: path === '/' ? `${base}/` : `${base}${path}`,
  }))

  for (const post of posts) {
    entries.push({
      loc: post.canonicalUrl?.trim() || `${base}/posts/${post.slug}`,
      ...(post.updatedAt ? { lastmod: post.updatedAt } : {}),
    })
  }
  for (const category of categories) {
    entries.push({ loc: `${base}/categories/${category}` })
  }
  for (const tag of tags) {
    entries.push({ loc: `${base}/tags/${tag}` })
  }

  return entries
}

export const renderSitemap = (entries: SitemapEntry[]): string => {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${escapeSitemapValue(entry.lastmod)}</lastmod>`
        : ''
      return `  <url>\n    <loc>${escapeSitemapValue(entry.loc)}</loc>${lastmod}\n  </url>`
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}
