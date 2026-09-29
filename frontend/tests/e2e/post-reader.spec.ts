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

const expectAsdadFragmentAtReadableOffset = async (page: Page) => {
  const heading = page.locator('#asdad')
  await expect(heading).toBeInViewport()
  await expect
    .poll(async () => {
      const top = await heading.evaluate(
        (element) => element.getBoundingClientRect().top,
      )
      return top >= 64 && top < 200
    })
    .toBe(true)
}

test.describe('Post reading experience', () => {
  test('renders the technical Markdown reading surface on desktop', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only visual flow')
    const problems = collectBrowserProblems(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    const response = await page.goto('/posts/markdown-first')
    const ssrHtml = (await response?.text()) ?? ''

    await expect(page).toHaveTitle('Markdown 是一条可迁移的路 · 夜航手记')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://127.0.0.1:3000/posts/markdown-first',
    )
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      '可迁移的内容格式，给长期写作留出比编辑器更长的寿命。',
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Markdown 是一条可迁移的路 · 夜航手记',
    )
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://example.com/media/markdown-first.webp',
    )
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
    expect(ssrHtml).toContain(
      '<title>Markdown 是一条可迁移的路 · 夜航手记</title>',
    )
    expect(ssrHtml).toContain('rel="canonical"')
    expect(ssrHtml).toContain('http://127.0.0.1:3000/posts/markdown-first')
    expect(ssrHtml).toContain(
      'property="og:image" content="https://example.com/media/markdown-first.webp"',
    )
    expect(ssrHtml).toContain(
      'name="description" content="可迁移的内容格式，给长期写作留出比编辑器更长的寿命。"',
    )
    expect(ssrHtml).toContain('application/ld+json')
    const structuredData = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .first()
        .textContent()) ?? '{}',
    )
    expect(structuredData).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Markdown 是一条可迁移的路',
      description: '可迁移的内容格式，给长期写作留出比编辑器更长的寿命。',
      mainEntityOfPage: 'http://127.0.0.1:3000/posts/markdown-first',
    })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Markdown 是一条可迁移的路',
    )
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('.post-detail-page__body h1')).toHaveCount(0)
    await expect(page.locator('.post-detail-page__body h2')).toContainText(
      'Markdown 一级标题',
    )
    await expect(page.locator('.post-detail-page__body h3')).toContainText([
      '一种更长寿的写作格式',
      'asdad',
      '重复目录',
      '重复目录',
    ])
    await expect(
      page.getByRole('heading', { level: 4, name: '第三级目录' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 5, name: '第四级目录' }),
    ).toBeVisible()
    await expect(page.locator('.post-detail-page__body h6')).toContainText([
      '第五级目录',
      '第六级目录',
    ])
    await expect(
      page.locator('.post-detail-page__toc--desktop li[data-level="1"]'),
    ).toContainText('Markdown 一级标题')
    await expect(
      page
        .locator('.post-detail-page__toc--desktop li[data-level="2"]')
        .filter({ hasText: '一种更长寿的写作格式' }),
    ).toHaveCount(1)
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
    await tocLink.focus()
    await expect(tocLink).toBeFocused()
    await page.keyboard.press('Enter')
    expect(page.url()).toContain(encodeURIComponent('一种更长寿的写作格式'))

    await page.goto('/posts/markdown-first#asdad')
    await expectAsdadFragmentAtReadableOffset(page)
    await expect(page).toHaveURL(/#asdad$/)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath('post-headings-desktop.png'),
      fullPage: true,
    })

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

  test('falls back from a missing article cover to the Site Identity avatar', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Desktop-only metadata check',
    )
    await page.goto('/posts/slow-growth')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://example.com/media/site-avatar.webp',
    )
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      'content',
      'https://example.com/media/site-avatar.webp',
    )
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
    if (await missingImage.isVisible()) {
      await missingImage.scrollIntoViewIfNeeded()
    }
    await expect(
      page.locator('[data-media-fallback]:not([hidden])'),
    ).toBeVisible()

    await page.getByRole('button', { name: '打开文章目录' }).click()
    const sheet = page.getByRole('dialog', { name: '文章目录' })
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('li[data-level="6"] a').last()).toHaveText(
      '第六级目录',
    )
    await expect(
      sheet.getByRole('link', { name: '一种更长寿的写作格式' }),
    ).toBeVisible()
    await sheet.locator('li[data-level="6"]').last().scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath('post-headings-mobile-toc.png'),
    })
    await sheet.getByRole('link', { name: '一种更长寿的写作格式' }).click()
    await expect(sheet).toBeHidden()
    expect(page.url()).toContain(encodeURIComponent('一种更长寿的写作格式'))
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.goto('/posts/markdown-first#asdad')
    await expectAsdadFragmentAtReadableOffset(page)
    await page.screenshot({
      path: testInfo.outputPath('post-headings-mobile-fragment.png'),
    })

    expect(unexpectedBrowserProblems(problems)).toEqual([])
  })
})
