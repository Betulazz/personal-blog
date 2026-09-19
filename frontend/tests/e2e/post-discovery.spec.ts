import { expect, test } from '@playwright/test'

test('renders Post summaries with durable pagination and navigation destinations', async ({
  page,
}) => {
  await page.goto('/posts')

  await expect(
    page.getByRole('heading', { name: '文章', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(4)
  const detailLink = page
    .getByRole('article')
    .first()
    .getByRole('link', { name: '阅读：把复杂的东西，留在安静的地方' })
  await expect(detailLink).toHaveAttribute('href', '/posts/spatial-notes')
  await detailLink.click()
  await expect(page).toHaveURL(/\/posts\/spatial-notes$/)
  await expect(
    page.getByRole('heading', { name: '把复杂的东西，留在安静的地方' }),
  ).toBeVisible()

  await page.goto('/posts')
  await expect(
    page.getByRole('article').first().getByText('置顶'),
  ).toBeVisible()
  await expect(
    page.getByRole('article').first().getByText('Design System'),
  ).toBeVisible()

  const pageTwoLink = page.getByRole('link', { name: '2', exact: true })
  await pageTwoLink.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/posts\?page=2$/)
  await expect(page.getByRole('article')).toHaveCount(4)
  await expect(page.getByText('给生活留一点空白')).toBeVisible()
})

test('search and taxonomy filters remain represented in the URL', async ({
  page,
}) => {
  await page.goto('/search')
  const searchInput = page.getByRole('search').getByLabel('搜索文章')
  await searchInput.fill('Markdown')
  await expect(searchInput).toHaveValue('Markdown')
  await page.getByRole('search').getByRole('button', { name: '搜索' }).click()

  await expect(page).toHaveURL(/\/search\?q=Markdown$/)
  await expect(page.getByText('Markdown 是一条可迁移的路')).toBeVisible()
  await expect(page.getByText('1 篇公开文章')).toBeVisible()

  await page.goto('/posts?category=engineering')
  await expect(page).toHaveURL(/\/posts\?category=engineering$/)
  await expect(page.getByText('3 篇公开文章')).toBeVisible()

  await page.goto('/search?category=engineering')
  await expect(page).toHaveURL(/\/search\?category=engineering$/)
  await expect(page.getByText('3 篇公开文章')).toBeVisible()

  await page.goto('/search?tag=nuxt')
  await expect(page).toHaveURL(/\/search\?tag=nuxt$/)
  await expect(page.getByText('2 篇公开文章')).toBeVisible()

  await page.goto('/search?q=Nuxt&category=engineering&tag=nuxt')
  await expect(page).toHaveURL(
    /\/search\?q=Nuxt&category=engineering&tag=nuxt$/,
  )
  await expect(page.getByText('1 篇公开文章')).toBeVisible()

  await page.goto('/search?category=engineering&tag=nuxt')
  await page.getByRole('search').getByLabel('搜索文章').fill('Nuxt')
  await page.getByRole('search').getByRole('button', { name: '搜索' }).click()
  await expect(page).toHaveURL(
    /\/search\?q=Nuxt&category=engineering&tag=nuxt$/,
  )
  await expect(page.getByText('1 篇公开文章')).toBeVisible()

  await page.goto('/posts')
  const categorySelect = page.getByRole('combobox', { name: '分类' })
  await categorySelect.focus()
  await expect(categorySelect).toBeFocused()

  await page.goto('/categories')
  const engineeringLink = page.getByRole('link', { name: '工程实践' })
  await engineeringLink.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/categories\/engineering$/)
  await expect(
    page.getByRole('heading', { name: '分类：工程实践' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Nuxt', exact: true }).first(),
  ).toHaveAttribute('href', '/tags/nuxt')

  await page.goto('/tags/nuxt?category=engineering&page=2')
  await expect(page).toHaveURL(/\/tags\/nuxt\?category=engineering&page=2$/)
  await expect(page.getByText('这一页暂不存在')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '返回可用页面' }),
  ).toHaveAttribute('href', '/tags/nuxt?category=engineering')
})

test('invalid taxonomy links recover with an intentional not-found state', async ({
  page,
}) => {
  await page.goto('/categories/not-a-real-category')

  await expect(page.getByRole('heading', { name: '分类未找到' })).toBeVisible()
  await expect(page.getByText('没有找到这个分类')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '返回文章发现' }),
  ).toHaveAttribute('href', '/categories')
})

test('invalid and stale pagination values recover without breaking discovery', async ({
  page,
}) => {
  await page.goto('/posts?page=not-a-number')
  await expect(page.getByRole('article')).toHaveCount(4)
  await expect(page.getByText('把复杂的东西，留在安静的地方')).toBeVisible()

  await page.goto('/posts?page=999')
  await expect(page.getByText('这一页暂不存在')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '返回可用页面' }),
  ).toHaveAttribute('href', '/posts?page=2')
})

test('Post discovery stays keyboard reachable and inside fixed CSS viewports', async ({
  page,
}, testInfo) => {
  const viewports = [
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ] as const

  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.type() + ': ' + message.text())
    }
  })
  page.on('pageerror', (error) => {
    consoleProblems.push('pageerror: ' + error.message)
  })

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/posts')

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.scrollWidth,
      String(viewport.width) + 'x' + String(viewport.height) + ' viewport',
    ).toBeLessThanOrEqual(dimensions.clientWidth)

    const searchInput = page.getByLabel('搜索文章')
    await searchInput.focus()
    await expect(searchInput).toBeFocused()

    const searchButtonSize = await page
      .getByRole('search')
      .getByRole('button', { name: '搜索' })
      .evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return { height: rect.height, width: rect.width }
      })
    expect(searchButtonSize.height).toBeGreaterThanOrEqual(44)
    expect(searchButtonSize.width).toBeGreaterThanOrEqual(44)

    await page.screenshot({
      path:
        'test-results/post-discovery/' +
        testInfo.project.name +
        '-viewport-' +
        viewport.width +
        '.png',
      fullPage: false,
      scale: 'css',
    })
    await page.screenshot({
      path:
        'test-results/post-discovery/' +
        testInfo.project.name +
        '-full-page-' +
        viewport.width +
        '.png',
      fullPage: true,
      scale: 'css',
    })
  }

  expect(consoleProblems).toEqual([])
})
