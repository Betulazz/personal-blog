import { expect, test, type Page } from '@playwright/test'

const missingMediaPaths = [
  '/uploads/live-acceptance/missing-markdown.webp',
  '/uploads/live-acceptance/missing-moment.webp',
]

const requiredViewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

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
  page.on('pageerror', (error) => {
    problems.push({ message: `pageerror: ${error.message}`, url: '' })
  })
  page.on('requestfailed', (request) => {
    problems.push({
      message: `requestfailed: ${request.failure()?.errorText ?? 'unknown'}`,
      url: request.url(),
    })
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push({
        message: `response: ${response.status()} ${response.statusText()}`,
        url: response.url(),
      })
    }
  })
  return problems
}

const unexpectedProblems = (
  problems: Array<{ message: string; url: string }>,
) =>
  problems.filter(
    ({ url }) => !missingMediaPaths.some((path) => url.endsWith(path)),
  )

const assertNoHorizontalOverflow = async (page: Page, route: string) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(
    dimensions.scrollWidth,
    `${route}: ${dimensions.scrollWidth}px exceeds ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth)
}

const assertSafeExternalLinks = async (page: Page) => {
  const unsafeLinks = await page
    .locator('a[target="_blank"]')
    .evaluateAll((links) =>
      links
        .filter((link) => {
          const rel = (link.getAttribute('rel') ?? '')
            .split(/\s+/)
            .filter(Boolean)
          return !rel.includes('noopener') || !rel.includes('noreferrer')
        })
        .map((link) => (link as HTMLAnchorElement).href),
    )
  expect(unsafeLinks).toEqual([])
}

test('native MySQL data reaches SSR without a duplicate browser read', async ({
  page,
}) => {
  const response = await page.request.get('/')
  expect(response.status()).toBe(200)
  const source = await response.text()
  expect(source).toContain('公开验收从真实内容开始')
  expect(source).toContain('真实数据抵达浏览器之后')

  const browserApiRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('127.0.0.1:8000/api/v1/')) {
      browserApiRequests.push(request.url())
    }
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '让真实内容先抵达，再让细节慢慢发光',
  )
  await expect(page.getByText('公开验收从真实内容开始')).toBeVisible()
  await page.waitForTimeout(500)
  expect(browserApiRequests).toEqual([])
})

test('native public route inventory, missing records, and media recovery work', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const problems = collectBrowserProblems(page)
  const routes = [
    { path: '/', heading: '让真实内容先抵达，再让细节慢慢发光' },
    { path: '/posts', heading: '文章' },
    {
      path: '/posts/live-acceptance-markdown',
      heading: 'Markdown 仍然是一条可迁移的路',
    },
    { path: '/categories', heading: '文章分类' },
    { path: '/categories/live-acceptance', heading: '分类：现场验收' },
    { path: '/tags', heading: '文章标签' },
    { path: '/tags/markdown', heading: '标签：Markdown' },
    { path: '/search?q=portable', heading: '搜索：portable' },
    { path: '/moments', heading: '动态' },
    { path: '/chatter', heading: '杂谈' },
    { path: '/projects', heading: '项目集' },
    { path: '/friends', heading: '友链' },
    {
      path: '/about',
      heading: '让真实内容先抵达，再让细节慢慢发光',
    },
  ] as const

  for (const route of routes) {
    const response = await page.goto(route.path)
    expect(response?.status(), route.path).toBe(200)
    await expect(
      page.getByRole('heading', { exact: true, name: route.heading }),
    ).toBeVisible()
    await expect(page.locator('[data-error-page]')).toHaveCount(0)
    await assertNoHorizontalOverflow(page, route.path)
    await assertSafeExternalLinks(page)
  }

  await page.goto('/posts/live-acceptance-markdown')
  await expect(
    page.getByRole('heading', { name: '可迁移的正文' }),
  ).toBeVisible()
  await expect(
    page.locator('[data-media-fallback]:not([hidden])'),
  ).toBeVisible()
  await expect(
    page.locator('script').filter({ hasText: 'traceback' }),
  ).toHaveCount(0)

  const missingPostResponse = await page.goto('/posts/not-a-real-live-post')
  expect(missingPostResponse?.status()).toBe(200)
  await expect(page.getByText('没有找到这篇文章')).toBeVisible()

  const notFoundResponse = await page.goto('/not-a-real-live-route')
  expect(notFoundResponse?.status()).toBe(404)
  await expect(page.locator('[data-error-page]')).toBeVisible()

  expect(
    unexpectedProblems(problems).filter(
      ({ url }) => !url.includes('/not-a-real-live-route'),
    ),
  ).toEqual([])
})

test('native public pages hold layout at fixed viewports with separate screenshots', async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000)
  const problems = collectBrowserProblems(page)
  for (const viewport of requiredViewports) {
    await page.setViewportSize(viewport)
    for (const route of [
      '/',
      '/posts/live-acceptance-markdown',
      '/moments',
      '/projects',
      '/about',
    ]) {
      await page.goto(route)
      await expect(page.locator('main#main-content')).toBeVisible()
      await assertNoHorizontalOverflow(page, route)
      await assertSafeExternalLinks(page)
      const name = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')
      const prefix = `test-results/live-public-acceptance/${testInfo.project.name}-${name}-${viewport.width}`
      await page.screenshot({ path: `${prefix}-viewport.png`, scale: 'css' })
      await page.screenshot({
        path: `${prefix}-full-page.png`,
        fullPage: true,
        scale: 'css',
      })
    }
  }
  expect(unexpectedProblems(problems)).toEqual([])
})

test('keyboard, touch targets, and reduced motion remain usable on native data', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/')

  const skipLink = page.getByRole('link', { name: '跳到主要内容' })
  await skipLink.focus()
  await skipLink.press('Enter')
  await expect(page.locator('main#main-content')).toBeFocused()

  const menuButton = page.getByRole('button', { name: '打开主导航' })
  await expect(menuButton).toBeEnabled()
  const menuSize = await menuButton.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { height: rect.height, width: rect.width }
  })
  expect(menuSize.height).toBeGreaterThanOrEqual(44)
  expect(menuSize.width).toBeGreaterThanOrEqual(44)
  await menuButton.click()
  await expect(page.getByRole('button', { name: '关闭主导航' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menuButton).toBeFocused()

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.playState === 'running').length,
        ),
      { timeout: 3_000 },
    )
    .toBe(0)

  const playerControls = await page
    .locator(
      '[data-testid="music-player"] button, [data-testid="music-player"] input',
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { height: rect.height, width: rect.width }
      }),
    )
  expect(playerControls.length).toBeGreaterThan(0)
  expect(
    playerControls.every(({ height, width }) => height >= 44 && width >= 44),
  ).toBe(true)
})

test('native API errors and unavailable media stay safe at the page boundary', async ({
  page,
}) => {
  await page.goto('/')

  const missingPostResponse = await page.request.get(
    'http://127.0.0.1:8000/api/v1/posts/not-a-real-live-post',
  )
  expect(missingPostResponse.status()).toBe(404)
  const missingPostPayload = await missingPostResponse.json()
  expect(JSON.stringify(missingPostPayload)).not.toMatch(
    /sql|traceback|[A-Z]:\\|\/app\//i,
  )

  const emptySearchResponse = await page.request.get(
    'http://127.0.0.1:8000/api/v1/posts?q=not-a-real-live-query',
  )
  expect(emptySearchResponse.status()).toBe(200)
  expect((await emptySearchResponse.json()).data).toEqual([])

  const missingMediaResponse = await page.request.get(
    'http://127.0.0.1:8000/uploads/live-acceptance/missing-moment.webp',
  )
  expect(missingMediaResponse.status()).toBe(404)

  await page.route('**/api/v1/projects**', async (route) => {
    await route.abort('failed')
  })
  const browserFailure = await page.evaluate(async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/v1/projects')
      return 'unexpected-success'
    } catch {
      return 'network-failure'
    }
  })
  expect(browserFailure).toBe('network-failure')
  await page.unroute('**/api/v1/projects**')
  await expect(page.locator('main#main-content')).toBeVisible()
})

test('native sitemap and robots expose the live public origin', async ({
  request,
}) => {
  const sitemapResponse = await request.get('/sitemap.xml')
  expect(sitemapResponse.status()).toBe(200)
  expect(sitemapResponse.headers()['content-type']).toContain('application/xml')

  const sitemap = await sitemapResponse.text()
  expect(sitemap).toContain('<loc>http://127.0.0.1:3000/</loc>')
  expect(sitemap).toContain(
    '<loc>http://127.0.0.1:3000/posts/live-acceptance-markdown</loc>',
  )
  expect(sitemap).toContain(
    '<loc>http://127.0.0.1:3000/categories/live-acceptance</loc>',
  )
  expect(sitemap).not.toContain('/admin')

  const robotsResponse = await request.get('/robots.txt')
  expect(robotsResponse.status()).toBe(200)
  expect(await robotsResponse.text()).toContain(
    'Sitemap: http://127.0.0.1:3000/sitemap.xml',
  )
})
