import { expect, type Page, test } from '@playwright/test'

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

const assertNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
}

test('Projects communicate complete portfolio metadata and safe outbound links', async ({
  page,
}) => {
  await page.goto('/projects')

  await expect(page).toHaveTitle(/项目 · 夜航手记/)
  await expect(
    page.getByRole('heading', { name: '项目集', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(page.getByText('2026.03 — 至今')).toBeVisible()
  await expect(page.getByText('精选', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('暂无公开演示')).toBeVisible()
  await expect(page.getByText('来自公开 API 的项目描述')).toBeVisible()

  const source = page.getByRole('link', {
    name: 'Lumen Notes 源码（外部链接）',
  })
  await expect(source).toHaveAttribute('target', '_blank')
  await expect(source).toHaveAttribute('rel', /noopener/)
  await expect(source).toHaveAttribute('rel', /noreferrer/)
  await expect(source).toHaveAttribute('referrerpolicy', 'no-referrer')
})

test('Friend Links remain curated, honest, and actionable', async ({
  page,
}) => {
  await page.goto('/friends')

  await expect(page).toHaveTitle(/友链 · 夜航手记/)
  await expect(
    page.getByRole('heading', { name: '友链', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(page.getByText('人工整理 · 不代表在线状态')).toHaveCount(3)
  await expect(
    page.getByRole('heading', { name: '想交换友链？' }),
  ).toBeVisible()
  await expect(page.getByText('提交并不等于即时收录。')).toBeVisible()
  await expect(page.getByText('live@example.com')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Lantern Notes 网站（外部链接）' }),
  ).toHaveAttribute('rel', /noopener.*noreferrer/)
})

test('About presents profile context, long-form story, timeline, contact, and socials', async ({
  page,
}) => {
  await page.goto('/about')

  await expect(page).toHaveTitle(/关于 · 夜航手记/)
  await expect(
    page.getByRole('heading', { name: '技能', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '我为什么写这里', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '时间线', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '兴趣', exact: true }),
  ).toBeVisible()
  await expect(page.locator('#about-contact-title')).toBeVisible()
  await expect(
    page
      .getByRole('complementary')
      .getByText('一个喜欢把复杂问题拆小、把长期工作做得可持续的人。'),
  ).toBeVisible()
  await expect(
    page.getByText('这段内容来自可配置的 About Site Identity。'),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'GitHub' }).last(),
  ).toHaveAttribute('target', '_blank')
})

test('custom recovery pages handle not-found and unexpected errors', async ({
  page,
}) => {
  const notFoundResponse = await page.goto('/definitely-not-a-real-page')

  expect(notFoundResponse?.status()).toBe(404)
  await expect(page.locator('[data-error-page]')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '这片夜空还没有页面' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible()
  await page.getByRole('link', { name: '阅读文章' }).click()
  await expect(page).toHaveURL(/\/posts$/)

  const unexpectedResponse = await page.goto('/__acceptance/unexpected-error')

  expect(unexpectedResponse?.status()).toBe(500)
  await expect(page.locator('[data-error-page]')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '页面暂时离开了' }),
  ).toBeVisible()
  await expect(page.getByText('fixture-only unexpected error')).toHaveCount(0)
  await page
    .getByRole('link', { name: '返回首页' })
    .evaluate((link) => (link as HTMLAnchorElement).click())
  await expect(page).toHaveURL(/\/$/)
})

test('secondary pages stay inside required fixed viewports without console problems', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    consoleProblems.push(`pageerror: ${error.message}`)
  })

  for (const route of ['/projects', '/friends', '/about']) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto(route)
      await assertNoHorizontalOverflow(page)
      await expect(page.locator('main#main-content')).toBeVisible()

      const firstAction = page
        .locator('main#main-content a, main#main-content button')
        .first()
      if (await firstAction.count()) {
        const size = await firstAction.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return { height: rect.height, width: rect.width }
        })
        expect(Math.min(size.height, size.width)).toBeGreaterThanOrEqual(44)
      }

      await page.screenshot({
        path: `test-results/secondary-public-pages/${testInfo.project.name}-${route.slice(1)}-viewport-${viewport.width}.png`,
        fullPage: false,
        scale: 'css',
      })
      await page.screenshot({
        path: `test-results/secondary-public-pages/${testInfo.project.name}-${route.slice(1)}-full-page-${viewport.width}.png`,
        fullPage: true,
        scale: 'css',
      })
    }
  }

  expect(consoleProblems).toEqual([])
})
