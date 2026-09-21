import { expect, type Page, test } from '@playwright/test'

const publicRoutes = [
  { heading: '在夜色里，写下仍然发光的事', path: '/' },
  { heading: '文章', path: '/posts' },
  {
    heading: '把复杂的东西，留在安静的地方',
    path: '/posts/spatial-notes',
  },
  { heading: 'Markdown 是一条可迁移的路', path: '/posts/markdown-first' },
  { heading: '缓慢生长，也是一种进度', path: '/posts/slow-growth' },
  { heading: '让首屏从一开始就有内容', path: '/posts/ssr-first-paint' },
  { heading: '状态本身也是内容', path: '/posts/states-as-content' },
  { heading: '先把边界说清楚', path: '/posts/small-contracts' },
  { heading: '空间感不应该牺牲对比度', path: '/posts/contrast-in-space' },
  { heading: '给生活留一点空白', path: '/posts/a-little-blank' },
  { heading: '文章分类', path: '/categories' },
  {
    heading: '分类：设计札记',
    path: '/categories/design-notes',
  },
  {
    heading: '分类：工程实践',
    path: '/categories/engineering',
  },
  { heading: '分类：生活记录', path: '/categories/life' },
  { heading: '文章标签', path: '/tags' },
  { heading: '标签：Design System', path: '/tags/design-system' },
  { heading: '标签：Nuxt', path: '/tags/nuxt' },
  { heading: '标签：Markdown', path: '/tags/markdown' },
  { heading: '标签：Architecture', path: '/tags/architecture' },
  { heading: '标签：Life', path: '/tags/life' },
  { heading: '标签：Notes', path: '/tags/notes' },
  { heading: '标签：SSR', path: '/tags/ssr' },
  { heading: '标签：Accessibility', path: '/tags/accessibility' },
  { heading: '标签：TypeScript', path: '/tags/typescript' },
  { heading: '标签：API', path: '/tags/api' },
  { heading: '标签：CSS', path: '/tags/css' },
  { heading: '标签：Reflection', path: '/tags/reflection' },
  { heading: '搜索文章', path: '/search' },
  { heading: '动态', path: '/moments' },
  { heading: '杂谈', path: '/chatter' },
  { heading: '项目集', path: '/projects' },
  { heading: '友链', path: '/friends' },
  { heading: '在夜色里，写下仍然发光的事', path: '/about' },
] as const

const notFoundRoute = {
  heading: '这片夜空还没有页面',
  path: '/definitely-not-a-real-page',
} as const

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

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

const assertSafeExternalLinks = async (page: Page, route: string) => {
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

  expect(unsafeLinks, `${route}: unsafe external links`).toEqual([])
}

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

const unexpectedBrowserProblems = (
  problems: Array<{ message: string; url: string }>,
  expectedProblemPaths: readonly string[] = [
    '/media/missing-markdown-image.webp',
  ],
) =>
  problems.filter(
    ({ url }) => !expectedProblemPaths.some((path) => url.endsWith(path)),
  )

test('public route inventory renders every public entry point', async ({
  page,
}) => {
  test.setTimeout(600_000)
  const problems = collectBrowserProblems(page)

  for (const route of publicRoutes) {
    const response = await page.goto(route.path)

    expect(response?.status(), route.path).toBe(200)
    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(
      page.getByRole('heading', { exact: true, name: route.heading }),
    ).toBeVisible()
    await expect(page.locator('[data-error-page]')).toHaveCount(0)
    await assertNoHorizontalOverflow(page, route.path)
    await assertSafeExternalLinks(page, route.path)
  }

  const notFoundResponse = await page.goto(notFoundRoute.path)
  expect(notFoundResponse?.status(), notFoundRoute.path).toBe(404)
  await expect(page.locator('[data-error-page]')).toBeVisible()
  await expect(
    page.getByRole('heading', {
      exact: true,
      name: notFoundRoute.heading,
    }),
  ).toBeVisible()

  expect(
    unexpectedBrowserProblems(problems, [
      '/media/missing-markdown-image.webp',
      notFoundRoute.path,
    ]),
  ).toEqual([])
})

test('primary navigation resolves to the same public route inventory', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const problems = collectBrowserProblems(page)
  await page.goto('/')

  const desktopNavigation = page.getByRole('navigation', { name: '主导航' })
  let navigation = desktopNavigation
  if (!(await desktopNavigation.isVisible())) {
    const menuButton = page.getByRole('button', { name: '打开主导航' })
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    navigation = page.getByRole('navigation', { name: '移动端主导航' })
  }

  const navigationLinks = await navigation
    .getByRole('link')
    .evaluateAll((links) =>
      links.map((link) => ({
        href: (link as HTMLAnchorElement).getAttribute('href'),
        label: link.textContent?.trim(),
      })),
    )

  const expectedPaths = publicRoutes
    .filter(({ path }) => path === '/' || path.split('/').length === 2)
    .map(({ path }) => path)
    .sort()
  expect(navigationLinks.map(({ href }) => href).sort()).toEqual(expectedPaths)

  for (const link of navigationLinks) {
    expect(link.href).toBeTruthy()
    await page.goto(link.href!)
    await expect(page.locator('main#main-content')).toBeVisible()
    await assertNoHorizontalOverflow(page, link.href!)
  }

  expect(unexpectedBrowserProblems(problems)).toEqual([])
})

test('public surfaces hold their layout at every required CSS viewport', async ({
  page,
}, testInfo) => {
  test.setTimeout(900_000)
  const problems = collectBrowserProblems(page)
  const routes = [...publicRoutes.map(({ path }) => path), notFoundRoute.path]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)

    for (const route of routes) {
      await page.goto(route)
      await expect(page.locator('main#main-content')).toBeVisible()
      await assertNoHorizontalOverflow(page, route)
      await assertSafeExternalLinks(page, route)

      const navigationTiming = await page.evaluate(() => {
        const entry = performance.getEntriesByType('navigation')[0]
        if (!(entry instanceof PerformanceNavigationTiming)) {
          return null
        }

        return {
          domContentLoaded: entry.domContentLoadedEventEnd,
          load: entry.loadEventEnd,
        }
      })
      expect(
        navigationTiming,
        `${route}: missing navigation timing`,
      ).not.toBeNull()
      expect(
        navigationTiming?.domContentLoaded,
        `${route}: slow DOM`,
      ).toBeLessThan(60_000)
      expect(navigationTiming?.load, `${route}: slow load`).toBeLessThan(60_000)

      const firstAction = page
        .locator(
          'main#main-content a:visible, main#main-content button:visible',
        )
        .first()
      if (await firstAction.count()) {
        await expect
          .poll(
            async () => {
              const rect = await firstAction.boundingBox()
              return rect ? Math.min(rect.height, rect.width) : 0
            },
            {
              message: `${route} @ ${viewport.width}px: first visible action is too small`,
              timeout: 5_000,
            },
          )
          .toBeGreaterThanOrEqual(44)
      }

      const routeName =
        route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')
      const prefix = `test-results/public-mock-acceptance/${testInfo.project.name}-${routeName}-${viewport.width}`
      await page.screenshot({
        path: `${prefix}-viewport.png`,
        fullPage: false,
        scale: 'css',
      })
      await page.screenshot({
        path: `${prefix}-full-page.png`,
        fullPage: true,
        scale: 'css',
      })
    }
  }

  expect(
    unexpectedBrowserProblems(problems, [
      '/media/missing-markdown-image.webp',
      notFoundRoute.path,
    ]),
  ).toEqual([])
})

test('public error and empty states offer an intentional recovery path', async ({
  page,
}) => {
  await page.goto('/posts/not-a-real-post')
  await expect(page.getByText('没有找到这篇文章')).toBeVisible()
  await expect(
    page.getByRole('link', { exact: true, name: '返回文章发现' }),
  ).toHaveAttribute('href', '/posts')

  await page.goto('/tags/not-a-real-tag')
  await expect(page.getByText('没有找到这个标签')).toBeVisible()
  await expect(
    page.getByRole('link', { exact: true, name: '返回文章发现' }),
  ).toHaveAttribute('href', '/tags')

  await page.goto('/search?q=not-a-real-query')
  await expect(page.getByText('还没有找到搜索结果')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '查看全部文章' }),
  ).toHaveAttribute('href', '/posts')

  await page.goto('/definitely-not-a-real-page')
  await expect(
    page.getByRole('heading', { name: '这片夜空还没有页面' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: '返回首页' })).toHaveAttribute(
    'href',
    '/',
  )
})
