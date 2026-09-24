import { normalizeSiteUrl } from '../utils/sitemap'

const DISALLOWED_PREFIXES = ['/admin', '/api/'] as const

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl))
  const lines = [
    'User-Agent: *',
    'Allow: /',
    ...DISALLOWED_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ]

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return lines.join('\n')
})
