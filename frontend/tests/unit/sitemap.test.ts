import { describe, expect, it } from 'vitest'

import {
  buildSitemapEntries,
  escapeSitemapValue,
  normalizeSiteUrl,
  renderSitemap,
  SITEMAP_STATIC_PATHS,
} from '../../server/utils/sitemap'

describe('sitemap entries', () => {
  it('lists every static public route under the site origin', () => {
    const entries = buildSitemapEntries({
      categories: [],
      posts: [],
      siteUrl: 'https://blog.example.com/',
      tags: [],
    })

    expect(entries.map((entry) => entry.loc)).toEqual(
      SITEMAP_STATIC_PATHS.map((path) =>
        path === '/'
          ? 'https://blog.example.com/'
          : `https://blog.example.com${path}`,
      ),
    )
  })

  it('appends published Posts, Categories, and Tags in order', () => {
    const entries = buildSitemapEntries({
      categories: ['engineering', 'life'],
      posts: [
        { slug: 'first-post', updatedAt: '2026-09-21T08:00:00.000Z' },
        { slug: 'second-post' },
      ],
      siteUrl: 'https://blog.example.com',
      tags: ['markdown'],
    })

    expect(entries.slice(SITEMAP_STATIC_PATHS.length)).toEqual([
      {
        loc: 'https://blog.example.com/posts/first-post',
        lastmod: '2026-09-21T08:00:00.000Z',
      },
      { loc: 'https://blog.example.com/posts/second-post' },
      { loc: 'https://blog.example.com/categories/engineering' },
      { loc: 'https://blog.example.com/categories/life' },
      { loc: 'https://blog.example.com/tags/markdown' },
    ])
  })

  it('prefers a Post canonical override over the local slug URL', () => {
    const entries = buildSitemapEntries({
      categories: [],
      posts: [
        { canonicalUrl: 'https://example.com/notes/syndicated', slug: 'copy' },
        { canonicalUrl: '   ', slug: 'blank-canonical' },
        { canonicalUrl: null, slug: 'local-only' },
      ],
      siteUrl: 'https://blog.example.com',
      tags: [],
    })

    expect(entries.slice(SITEMAP_STATIC_PATHS.length)).toEqual([
      { loc: 'https://example.com/notes/syndicated' },
      { loc: 'https://blog.example.com/posts/blank-canonical' },
      { loc: 'https://blog.example.com/posts/local-only' },
    ])
  })

  it('normalizes trailing slashes on the site origin', () => {
    expect(normalizeSiteUrl('https://blog.example.com///')).toBe(
      'https://blog.example.com',
    )
  })
})

describe('sitemap rendering', () => {
  it('escapes XML-significant characters in locations', () => {
    expect(escapeSitemapValue(`/a&b<c>"d"'e`)).toBe(
      '/a&amp;b&lt;c&gt;&quot;d&quot;&apos;e',
    )

    const xml = renderSitemap([
      { loc: 'https://blog.example.com/posts/a&b', lastmod: '2026-09-21' },
    ])

    expect(xml).toContain('<loc>https://blog.example.com/posts/a&amp;b</loc>')
    expect(xml).not.toContain('a&b</loc>')
  })

  it('renders a urlset document with one url block per entry', () => {
    const xml = renderSitemap([
      { loc: 'https://blog.example.com/' },
      {
        lastmod: '2026-09-21T08:00:00.000Z',
        loc: 'https://blog.example.com/posts/first-post',
      },
    ])

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
    expect(xml.match(/<url>/g)).toHaveLength(2)
    expect(xml).toContain(
      '<url>\n    <loc>https://blog.example.com/</loc>\n  </url>',
    )
    expect(xml).toContain('<lastmod>2026-09-21T08:00:00.000Z</lastmod>')
  })
})
