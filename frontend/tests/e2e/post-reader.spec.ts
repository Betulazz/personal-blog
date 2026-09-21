import { expect, test, type Page } from '@playwright/test'

const collectBrowserProblems = (page: Page) => {
  const problems: Array<{ message: string; url: string }> = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push({
        message: `${message.type()}: ${message.text()}`,
        url: message.location().url,
      })
    }
  })
  page.on('pageerror', (error) =>
    problems.push({ message: `pageerror: ${error.message}`, url: '' }),
  )
  return problems
}

const unexpectedBrowserProblems = (
  problems: Array<{ message: string; url: string }>,
) =>
  problems.filter(
    ({ url }) => !url.includes('/media/missing-markdown-image.webp'),
  )

test.describe('Post reading experience', () => {
  test('renders the technical Markdown reading surface on desktop', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only visual flow')
    const problems = collectBrowserProblems(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/posts/markdown-first')

    await expect(page).toHaveTitle('Markdown 首先是一条可迁移的路')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://example.com/notes/markdown-first',
    )
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      '为长期写作保留可迁移、可审阅的 Markdown 内容。',
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Markdown 首先是一条可迁移的路',
    )
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://example.com/media/markdown-first.webp',
    )
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary',
    )
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Markdown 是一条可迁移的路',
    )
    await expect(
      page.getByRole('heading', { name: '一种更长寿的写作格式' }),
    ).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: '文章目录' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '打开文章目录' }),
    ).toBeHidden()
    await expect(
      page.getByRole('progressbar', { name: '文章阅读进度' }),
    ).toHaveAttribute('aria-valuenow', '0')
    await expect(page.locator('.post-markdown__code .shiki')).toBeVisible()
    await expect(page.locator('.katex')).toHaveCount(2)
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('blockquote')).toBeVisible()

    const tocLink = page
      .getByRole('complementary', { name: '文章目录' })
      .getByRole('link', { name: '一种更长寿的写作格式' })
    await tocLink.click()
    expect(page.url()).toContain(encodeURIComponent('一种更长寿的写作格式'))

    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop =
          document.scrollingElement.scrollHeight
      }
      window.dispatchEvent(new Event('scroll'))
    })
    await expect
      .poll(async () =>
        Number(
          await page
            .getByRole('progressbar', { name: '文章阅读进度' })
            .getAttribute('aria-valuenow'),
        ),
      )
      .toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: '返回顶部' })).toBeVisible()
    await page.getByRole('button', { name: '返回顶部' }).click()
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(40)

    expect(unexpectedBrowserProblems(problems)).toEqual([])
  })

  test('keeps the TOC accessible in a mobile sheet and recovers missing media', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'Mobile-only sheet flow',
    )
    const problems = collectBrowserProblems(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/posts/markdown-first')

    await expect(
      page.getByRole('button', { name: '打开文章目录' }),
    ).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: '文章目录' }),
    ).toBeHidden()
    const missingImage = page.locator('img[data-post-media]').last()
    await missingImage.scrollIntoViewIfNeeded()
    await expect(
      page.locator('[data-media-fallback]:not([hidden])'),
    ).toBeVisible()

    await page.getByRole('button', { name: '打开文章目录' }).click()
    const sheet = page.getByRole('dialog', { name: '文章目录' })
    await expect(sheet).toBeVisible()
    await expect(
      sheet.getByRole('link', { name: '一种更长寿的写作格式' }),
    ).toBeVisible()
    await sheet.getByRole('link', { name: '一种更长寿的写作格式' }).click()
    await expect(sheet).toBeHidden()
    expect(page.url()).toContain(encodeURIComponent('一种更长寿的写作格式'))

    expect(unexpectedBrowserProblems(problems)).toEqual([])
  })
})
