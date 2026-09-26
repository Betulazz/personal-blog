export interface SitemapEntry {
  lastmod?: string
  loc: string
}

export interface SitemapSource {
  posts: Array<{
    slug: string
    updatedAt?: string | null
  }>
  siteUrl: string
}

export const normalizeSiteUrl = (siteUrl: string): string =>
  siteUrl.replace(/\/+$/, '')

export const SITEMAP_STATIC_PATHS = [
  '/',
  '/posts',
  '/moments',
  '/chatter',
  '/music',
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
  posts,
  siteUrl,
}: SitemapSource): SitemapEntry[] => {
  const base = normalizeSiteUrl(siteUrl)
  const entries: SitemapEntry[] = SITEMAP_STATIC_PATHS.map((path) => ({
    loc: path === '/' ? `${base}/` : `${base}${path}`,
  }))

  for (const post of posts) {
    entries.push({
      loc: `${base}/posts/${post.slug}`,
      ...(post.updatedAt ? { lastmod: post.updatedAt } : {}),
    })
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
