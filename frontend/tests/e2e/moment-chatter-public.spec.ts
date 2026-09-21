import { expect, test } from '@playwright/test'

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

test('Moments keeps optional metadata and recovers missing media accessibly', async ({
  page,
}) => {
  await page.goto('/moments')

  await expect(page).toHaveTitle(/动态 · 夜航手记/)
  await expect(
    page.getByRole('heading', { name: '动态', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(12)
  await expect(
    page.getByText('今天把首页的第一道光调得更柔和了。', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByText('来自公开 API 的动态记录', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByText('周末留了一点空白，没有安排，也没有追赶什么。'),
  ).toBeVisible()

  await page.waitForLoadState('networkidle')
  const missingImage = page.locator('img[alt="傍晚的蓝色街景"]')
  await expect(missingImage).toHaveCount(1)
  await missingImage.evaluate((element) => {
    element.dispatchEvent(new Event('error'))
  })
  await expect(page.getByRole('img', { name: /媒体暂不可用/ })).toBeVisible()
  await expect(page.getByLabel('动态标签').first()).toBeVisible()
  await expect(page.getByRole('navigation', { name: '动态分页' })).toBeVisible()
  await page.getByRole('link', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/\/moments\?page=2$/)
  await expect(page.getByRole('article')).toHaveCount(2)
})

test('Moment search and tag filters remain durable in the URL', async ({
  page,
}) => {
  await page.goto('/moments')

  const search = page.getByRole('search')
  await search.getByLabel('搜索动态').fill('窗帘')
  await search.getByRole('button', { name: '搜索' }).click()

  await expect(page).toHaveURL(/\/moments\?q=%E7%AA%97%E5%B8%98$/)
  await expect(page.getByText('1 条公开动态')).toBeVisible()
  await expect(
    page.getByText('今天把首页的第一道光调得更柔和了。'),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(1)

  await page.getByRole('link', { name: '#Building' }).click()
  await expect(page).toHaveURL(/\/moments\?tag=building$/)
  await expect(page.getByText('2 条公开动态')).toBeVisible()
})

test('Chatter has its own composed cards, search and tag filtering', async ({
  page,
}) => {
  await page.goto('/chatter')

  await expect(page).toHaveTitle(/杂谈 · 夜航手记/)
  await expect(
    page.getByRole('heading', { name: '杂谈', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(12)
  await expect(page.getByText('先把边界说清楚')).toBeVisible()
  await expect(page.getByText('让界面先学会呼吸')).toBeVisible()
  await expect(
    page.getByText('公开 API 的杂谈', { exact: false }),
  ).toBeVisible()

  const search = page.getByRole('search')
  await search.getByLabel('搜索杂谈').fill('边界')
  await search.getByRole('button', { name: '搜索' }).click()

  await expect(page).toHaveURL(/\/chatter\?q=%E8%BE%B9%E7%95%8C$/)
  await expect(page.getByText('1 条公开杂谈')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByText('先把边界说清楚')).toBeVisible()

  await page.goto('/chatter')
  await page.getByRole('link', { name: 'TypeScript', exact: true }).click()
  await expect(page).toHaveURL(/\/chatter\?tag=typescript$/)
  await expect(page.getByRole('article')).toHaveCount(1)

  await page.goto('/chatter')
  await expect(page.getByRole('navigation', { name: '杂谈分页' })).toBeVisible()
  await page.getByRole('link', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/\/chatter\?page=2$/)
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('empty and stale feed states provide recovery actions', async ({
  page,
}) => {
  await page.goto('/moments?q=not-a-real-moment')
  await expect(page.getByText('还没有找到动态')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '查看全部动态' }),
  ).toHaveAttribute('href', '/moments')

  await page.goto('/chatter?page=99')
  await expect(page.getByText('这一页暂不存在')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '返回可用页面' }),
  ).toHaveAttribute('href', '/chatter')
})

test('public feeds stay keyboard reachable and inside fixed CSS viewports', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)

  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    consoleProblems.push(`pageerror: ${error.message}`)
  })

  for (const route of ['/moments', '/chatter']) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto(route)

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(
        dimensions.scrollWidth,
        `${route} ${viewport.width}x${viewport.height} viewport`,
      ).toBeLessThanOrEqual(dimensions.clientWidth)

      const searchInput = page.getByLabel(
        route === '/moments' ? '搜索动态' : '搜索杂谈',
      )
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
        path: `test-results/moment-chatter/${testInfo.project.name}-${route.slice(1)}-viewport-${viewport.width}.png`,
        fullPage: false,
        scale: 'css',
      })
      await page.screenshot({
        path: `test-results/moment-chatter/${testInfo.project.name}-${route.slice(1)}-full-page-${viewport.width}.png`,
        fullPage: true,
        scale: 'css',
      })
    }
  }

  expect(consoleProblems).toEqual([])
})
