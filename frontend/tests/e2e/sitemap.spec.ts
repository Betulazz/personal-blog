import { expect, test } from '@playwright/test'

test('sitemap and robots expose crawlable public URLs', async ({ request }) => {
  const sitemapResponse = await request.get('/sitemap.xml')
  expect(sitemapResponse.status()).toBe(200)
  expect(sitemapResponse.headers()['content-type']).toContain('application/xml')

  const sitemap = await sitemapResponse.text()
  expect(sitemap).toContain(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  )
  expect(sitemap).toContain('<loc>http://127.0.0.1:3000/</loc>')
  expect(sitemap).toContain(
    '<loc>http://127.0.0.1:3000/posts/spatial-notes</loc>',
  )
  expect(sitemap).toContain('<lastmod>2026-09-14T08:00:00.000Z</lastmod>')
  expect(sitemap).toContain(
    '<loc>http://127.0.0.1:3000/posts/markdown-first</loc>',
  )
  expect(sitemap).toContain('<loc>http://127.0.0.1:3000/moments</loc>')
  expect(sitemap).toContain('<loc>http://127.0.0.1:3000/music</loc>')
  expect(sitemap).not.toContain('/categories')
  expect(sitemap).not.toContain('/tags')
  expect(sitemap).not.toContain('/admin')
  expect(sitemap).not.toContain('/search')

  const robotsResponse = await request.get('/robots.txt')
  expect(robotsResponse.status()).toBe(200)
  expect(robotsResponse.headers()['content-type']).toContain('text/plain')

  const robots = await robotsResponse.text()
  expect(robots).toContain('User-Agent: *')
  expect(robots).toContain('Disallow: /admin')
  expect(robots).toContain('Disallow: /api/')
  expect(robots).toContain('Sitemap: http://127.0.0.1:3000/sitemap.xml')
})
