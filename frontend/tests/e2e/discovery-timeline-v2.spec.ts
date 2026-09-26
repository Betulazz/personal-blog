import { expect, test } from '@playwright/test'

const evidence =
  'C:/Users/Birchtula/.codex/visualizations/2026/09/24/01a0d3f5-0c5f-7123-aebc-b0ad1640ce1a'

test('mixed timeline searches all pages and preserves navigation history', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/moments')
  await expect(page).toHaveTitle(/动态/)
  await expect(page.locator('.timeline__entry')).toHaveCount(12)
  await expect(page.locator('[data-kind="post"]').first()).toBeVisible()
  await expect(page.locator('[data-kind="chatter"]').first()).toBeVisible()
  await page.getByRole('link', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.getByLabel('搜索动态').fill('Markdown')
  await page
    .getByRole('search')
    .getByRole('button', { name: '搜索', exact: true })
    .click()
  await expect(page).toHaveURL('/moments?q=Markdown')
  await expect(page.locator('.timeline__entry')).toHaveCount(1)
  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByLabel('搜索动态')).toHaveValue('')
  await page.goForward()
  await expect(page.getByLabel('搜索动态')).toHaveValue('Markdown')
  await page.getByRole('link', { name: /阅读：/ }).click()
  await expect(page).toHaveURL(/\/posts\/markdown-first/)
  expect(errors).toEqual([])
})

test('article search and tag selection compose and retired links preserve intent', async ({
  page,
}) => {
  await page.goto('/tags/nuxt?q=Nuxt&category=engineering')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL('/posts?q=Nuxt&tag=nuxt')
  await expect(page.getByText('2 篇公开文章')).toBeVisible()
  await expect(page.getByRole('combobox', { name: '分类' })).toHaveCount(0)
  await page.getByLabel('按标签筛选').selectOption('__all__')
  await expect(page).toHaveURL('/posts?q=Nuxt')
  await page.goBack()
  await expect(page).toHaveURL('/posts?q=Nuxt&tag=nuxt')
  await page.getByLabel('搜索文章').fill('不会命中')
  await page.getByRole('search').getByRole('button', { name: '搜索' }).click()
  await expect(page).toHaveURL(/tag=nuxt/)
  await expect(page.getByText('还没有找到搜索结果')).toBeVisible()
  await page.goto('/search?q=Markdown&page=1')
  await expect(page).toHaveURL('/posts?q=Markdown')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.goto('/categories/engineering')
  await expect(page).toHaveURL('/posts')
  await page.goto('/tags')
  await expect(page).toHaveURL('/posts')
})

test('body-only Chatter, expansion and stable inline links work without tags', async ({
  page,
}) => {
  await page.goto('/chatter')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: '杂谈标签' })).toHaveCount(
    0,
  )
  const entry = page.locator('#chatter-1')
  const expand = entry.locator('button[aria-controls]')
  await expect(expand).toBeVisible()
  await expect(expand).toHaveAttribute('aria-expanded', 'false')
  await expand.click()
  await expect(expand).toHaveAttribute('aria-expanded', 'true')
  await expect(entry.locator('#chatter-body-1')).toContainText(
    '这是一条可以展开的长记录。'.repeat(8),
  )
  await page.getByLabel('搜索杂谈').fill('雨后的街道')
  await page.getByRole('search').getByRole('button', { name: '搜索' }).click()
  await expect(page).toHaveURL(/\/chatter\?q=/)
  // A body-only migrated note has no empty heading, and keeps its images.
  await page.goto('/chatter?entry=101#chatter-101')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article').getByRole('heading')).toHaveCount(0)
  await expect(page.locator('#chatter-101')).toBeVisible()
  await expect(page.locator('#chatter-101').getByRole('link')).toHaveAttribute(
    'href',
    '/chatter?entry=101#chatter-101',
  )
})

test('Timeline layout adapts across six viewports without errors or overflow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Viewport matrix runs once')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().includes('Hydration'))
      errors.push(message.text())
  })
  for (const [width, height] of [
    [375, 812],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width: width!, height: height! })
    await page.goto('/moments')
    await expect(
      page.getByRole('heading', { name: '动态', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.timeline__entry')).toHaveCount(12)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const cards = await page
      .locator('.timeline__entry')
      .evaluateAll((elements) =>
        elements.slice(0, 2).map((e) => ({
          x: e.getBoundingClientRect().x,
          width: e.getBoundingClientRect().width,
        })),
      )
    if (width! <= 768) expect(cards[0]!.x).toBe(cards[1]!.x)
    else expect(cards[1]!.x).toBeGreaterThan(cards[0]!.x + cards[0]!.width)
    await page.screenshot({
      path: `${evidence}/timeline-${width}-viewport.png`,
      fullPage: false,
    })
    await page.screenshot({
      path: `${evidence}/timeline-${width}-full.png`,
      fullPage: true,
    })
  }
  expect(errors).toEqual([])
})

test('home and navigation expose the revised content surfaces', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('search')).toHaveCount(0)
  await expect(
    page.locator('a[href="/categories"], a[href="/tags"], a[href="/search"]'),
  ).toHaveCount(0)
  await expect(page.locator('a[href="/music"]').first()).toBeAttached()
  await expect(page.getByRole('heading', { name: '最近动态' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '最近杂谈' })).toBeVisible()
  await expect(page.getByText('暂时无法加载')).toHaveCount(0)
})
