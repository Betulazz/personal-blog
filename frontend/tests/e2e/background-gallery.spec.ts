import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const control = 'http://127.0.0.1:8787/__control'
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#3949ab"/></svg>'

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('administrator adds, previews, reorders, removes, saves, and reloads gallery entries', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/settings')
  const gallery = page.getByRole('list', { name: '背景图库顺序' })
  await expect(
    page.getByText(/公开页面会按顺序显示并每 10 秒切换/),
  ).toBeVisible()

  await page
    .getByLabel('背景图片 HTTPS URL')
    .fill('http://images.example.test/bad.webp')
  await page.getByLabel('背景图片替代文本').fill('不安全的图片')
  await page.getByRole('button', { name: '添加 HTTPS 图片' }).click()
  await expect(page.getByRole('alert')).toContainText('安全的 HTTPS 图片 URL')
  await expect(gallery.locator('li')).toHaveCount(0)

  await page
    .getByLabel('背景图片 HTTPS URL')
    .fill('https://images.example.test/first.webp')
  await page.getByLabel('背景图片替代文本').fill('第一张夜空')
  await page.getByRole('button', { name: '添加 HTTPS 图片' }).click()
  await expect(gallery.locator('li')).toHaveCount(1)
  await expect(gallery.locator('img').first()).toHaveAttribute(
    'src',
    'https://images.example.test/first.webp',
  )

  await page
    .getByLabel('背景图片 HTTPS URL')
    .fill('https://images.example.test/second.webp')
  await page.getByLabel('背景图片替代文本').fill('第二张夜空')
  await page.getByRole('button', { name: '添加 HTTPS 图片' }).click()
  await gallery.getByRole('button', { name: '背景图片 2 上移' }).click()
  await expect(gallery.locator('li').first()).toContainText('第二张夜空')
  await gallery.getByRole('button', { name: '移除背景图片 2' }).click()
  await expect(gallery.locator('li')).toHaveCount(1)

  await page.getByRole('button', { name: '从媒体库选择' }).click()
  const picker = page.getByRole('dialog', { name: '从媒体库插入图片' })
  await picker
    .getByTestId('media-picker-asset')
    .filter({ hasText: 'night-sky.webp' })
    .click()
  await picker.getByLabel('替代文本').fill('媒体库中的夜空')
  await picker.getByRole('button', { name: '插入选中图片' }).click()
  await expect(gallery.locator('li')).toHaveCount(2)
  await expect(gallery.locator('li').nth(1)).toContainText('媒体库中的夜空')

  await page.request.get(`${control}/failure?resource=admin`)
  await page.getByRole('button', { name: '保存网站设置' }).click()
  await expect(page.getByRole('alert')).toContainText('当前输入仍然保留')
  await expect(gallery.locator('li')).toHaveCount(2)
  await page.request.get(`${control}/clear-failures`)

  await page.getByRole('button', { name: '保存网站设置' }).click()
  await expect(page.getByText('设置已保存', { exact: true })).toBeVisible()
  await page.reload()
  await expect(gallery.locator('li')).toHaveCount(2)
  await expect(gallery.locator('li').first()).toContainText('第二张夜空')
  await expect(gallery.locator('li').nth(1)).toContainText('媒体库中的夜空')
})

test('public gallery rotates every 10 seconds and continues across routes', async ({
  page,
}, testInfo) => {
  const consoleProblems: string[] = []
  const failedRequests: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleProblems.push(message.text())
  })
  page.on('pageerror', (failure) => consoleProblems.push(failure.message))
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} (${request.failure()?.errorText})`)
  })
  await page.clock.install({ time: new Date('2026-09-26T08:00:00.000Z') })
  await fulfillImages(page)
  await setGallery(page, [
    { alt: '第一张测试背景', url: 'https://images.example.test/one.svg' },
    { alt: '第二张测试背景', url: 'https://images.example.test/two.svg' },
  ])

  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page).toHaveTitle(/夜航手记/)
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByText(/Nuxt Error|Internal Server Error/)).toHaveCount(
    0,
  )
  await expect(
    page.getByTestId('background-gallery-image').last(),
  ).toHaveAttribute('src', 'https://images.example.test/one.svg')
  await expect(page.locator('.ambient-background')).toHaveAttribute(
    'data-rotator-ready',
    'true',
  )
  await page.clock.fastForward(9_999)
  await expect(
    page.getByTestId('background-gallery-image').last(),
  ).toHaveAttribute('src', 'https://images.example.test/one.svg')
  await page.clock.fastForward(1)
  await expect(
    page.locator(
      '[data-testid="background-gallery-image"][src="https://images.example.test/two.svg"]',
    ),
  ).toBeVisible()
  await page.screenshot({
    path: join(
      process.env.POLISH_ACCEPTANCE_EVIDENCE ?? tmpdir(),
      `background-gallery-${testInfo.project.name}.png`,
    ),
    fullPage: false,
  })

  const desktopNavigation = page.getByRole('navigation', { name: '主导航' })
  if (await desktopNavigation.isVisible()) {
    await desktopNavigation.getByRole('link', { name: '文章' }).click()
  } else {
    await page.getByRole('button', { name: '打开主导航' }).click()
    await page
      .getByRole('navigation', { name: '移动端主导航' })
      .getByRole('link', { name: '文章' })
      .click()
  }
  await expect(page).toHaveURL(/\/posts$/)
  await page.clock.fastForward(10_000)
  await expect(
    page.locator(
      '[data-testid="background-gallery-image"][src="https://images.example.test/one.svg"]',
    ),
  ).toBeVisible()
  expect(
    consoleProblems,
    `Failed browser requests: ${failedRequests.join('; ')}`,
  ).toEqual([])
})

test('reduced motion holds the first configured image', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-26T08:00:00.000Z') })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await fulfillImages(page)
  await setGallery(page, [
    { alt: '第一张测试背景', url: 'https://images.example.test/one.svg' },
    { alt: '第二张测试背景', url: 'https://images.example.test/two.svg' },
  ])

  await page.goto('/')
  await expect(
    page.getByTestId('background-gallery-image').last(),
  ).toHaveAttribute('src', 'https://images.example.test/one.svg')
  await expect(page.locator('.ambient-background')).toHaveAttribute(
    'data-rotator-ready',
    'true',
  )
  await page.clock.fastForward(90_000)
  await expect(
    page.getByTestId('background-gallery-image').last(),
  ).toHaveAttribute('src', 'https://images.example.test/one.svg')
})

test('hidden pages pause the timer and resume with a full 10-second interval', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-09-26T08:00:00.000Z') })
  await fulfillImages(page)
  await setGallery(page, [
    { alt: '第一张测试背景', url: 'https://images.example.test/one.svg' },
    { alt: '第二张测试背景', url: 'https://images.example.test/two.svg' },
  ])
  await page.goto('/')
  await expect(
    page.getByTestId('background-gallery-image').last(),
  ).toHaveAttribute('src', 'https://images.example.test/one.svg')
  await expect(page.locator('.ambient-background')).toHaveAttribute(
    'data-rotator-ready',
    'true',
  )

  await setVisibility(page, 'hidden')
  await page.clock.fastForward(60_000)
  await expect(
    page.getByTestId('background-gallery-image').last(),
  ).toHaveAttribute('src', 'https://images.example.test/one.svg')
  await setVisibility(page, 'visible')
  await page.clock.fastForward(9_999)
  await expect(
    page.getByTestId('background-gallery-image').last(),
  ).toHaveAttribute('src', 'https://images.example.test/one.svg')
  await page.clock.fastForward(1)
  await expect(
    page.locator(
      '[data-testid="background-gallery-image"][src="https://images.example.test/two.svg"]',
    ),
  ).toBeVisible()
})

test('empty gallery and unavailable settings retain the built-in fallback', async ({
  page,
}) => {
  await setGallery(page, [])
  await page.goto('/')
  await expect(page.getByTestId('background-gallery-fallback')).toBeVisible()
  await expect(page.getByTestId('background-gallery-image')).toHaveCount(0)

  await page.request.get(`${control}/reset`)
  await page.request.get(`${control}/failure?resource=settings`)
  await page.reload()
  await expect(page.getByTestId('background-gallery-fallback')).toBeVisible()
  await expect(page.getByTestId('background-gallery-image')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('站点设置暂时无法加载')
})

test('broken gallery images are skipped once and fall back without retrying', async ({
  page,
}) => {
  const requests = new Map<string, number>()
  await page.clock.install({ time: new Date('2026-09-26T08:00:00.000Z') })
  await page.route('https://images.example.test/**', async (route) => {
    const url = route.request().url()
    requests.set(url, (requests.get(url) ?? 0) + 1)
    await route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'missing',
    })
  })
  await setGallery(page, [
    { alt: '损坏背景一', url: 'https://images.example.test/broken-one.svg' },
    { alt: '损坏背景二', url: 'https://images.example.test/broken-two.svg' },
  ])

  await page.goto('/')
  await expect(page.getByTestId('background-gallery-image')).toHaveCount(0)
  await expect(page.getByTestId('background-gallery-fallback')).toBeVisible()
  await page.clock.fastForward(60_000)
  await expect(page.getByTestId('background-gallery-image')).toHaveCount(0)
  expect(requests.get('https://images.example.test/broken-one.svg')).toBe(1)
  expect(requests.get('https://images.example.test/broken-two.svg')).toBe(1)
})

async function setGallery(
  page: Page,
  gallery: Array<{ alt: string; url: string }>,
) {
  const response = await page.request.post(`${control}/site-settings`, {
    data: { background_gallery: gallery },
  })
  expect(response.ok()).toBeTruthy()
}

async function fulfillImages(page: Page) {
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg }),
  )
}

async function setVisibility(page: Page, value: 'hidden' | 'visible') {
  await page.evaluate((visibility) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: visibility,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, value)
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
