import { expect, test, type Page } from '@playwright/test'

const mockControl = 'http://127.0.0.1:8787/__control'

test.beforeEach(async ({ page }) => {
  await page.request.get(`${mockControl}/reset`)
})

test('login exposes accessible validation and safe credential feedback', async ({
  page,
}) => {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()

  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(
    page.getByText('请输入用户名或邮箱。', { exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('用户名或邮箱')).toHaveAttribute(
    'aria-invalid',
    'true',
  )

  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a wrong password')
  await page.getByRole('button', { name: '登录后台' }).click()

  await expect(page.getByRole('alert')).toContainText('账号或密码不正确')
  await expect(page.getByRole('alert')).not.toContainText('invalid_credentials')
  await expect(page.getByRole('alert')).not.toContainText('password')
})

test('authenticated administrator sees protected dashboard without browser storage tokens', async ({
  page,
}) => {
  await login(page)

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('站点状态')).toBeVisible()
  await expect(page.getByText('最近编辑')).toBeVisible()
  await expect(page.getByText('后台状态示例文章')).toBeVisible()

  const localStorageKeys = await page.evaluate(() => Object.keys(localStorage))
  expect(localStorageKeys).toEqual([])
})

test('dashboard omits lifecycle status for a statusless GitHub project', async ({
  page,
}) => {
  await login(page)

  const projectActivity = page.getByRole('link', {
    name: /Dashboard GitHub 项目/,
  })
  await expect(
    projectActivity.locator('.admin-dashboard__activity-copy > span'),
  ).toHaveText('项目')
})

test('administrator workspace uses the viewport width and keeps navigation usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(
    page.getByRole('complementary', { name: '后台侧栏' }),
  ).toBeVisible()
  await page.setViewportSize({ width: 1920, height: 1080 })

  const desktopLayout = await page.evaluate(() => {
    const body = document.querySelector<HTMLElement>('.admin-shell__body')!
    const header = document.querySelector<HTMLElement>(
      '.admin-shell__header-inner',
    )!
    const sidebar = document.querySelector<HTMLElement>(
      '.admin-shell__sidebar',
    )!
    const main = document.querySelector<HTMLElement>('.admin-shell__main')!
    return {
      bodyWidth: body.getBoundingClientRect().width,
      headerGutter: Number.parseFloat(getComputedStyle(header).paddingLeft),
      mainWidth: main.getBoundingClientRect().width,
      sidebarLeft: sidebar.getBoundingClientRect().left,
    }
  })
  expect(desktopLayout.bodyWidth).toBe(1920)
  expect(desktopLayout.sidebarLeft).toBeLessThanOrEqual(32.5)
  expect(desktopLayout.headerGutter).toBeCloseTo(32, 0)
  expect(desktopLayout.mainWidth).toBeGreaterThan(1400)

  for (const width of [1024, 768, 430]) {
    await page.setViewportSize({ width, height: 932 })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      main: document
        .querySelector<HTMLElement>('.admin-shell__main')!
        .getBoundingClientRect(),
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
    expect(dimensions.main.left).toBeGreaterThanOrEqual(0)
    expect(dimensions.main.right).toBeLessThanOrEqual(width)
    await expect(
      page.getByRole('button', { name: '打开后台导航' }),
    ).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: '后台侧栏' }),
    ).toBeHidden()

    const menuButton = page.getByRole('button', { name: '打开后台导航' })
    await menuButton.click()
    await expect(
      page.getByRole('navigation', { name: '移动端后台导航' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menuButton).toBeFocused()
  }

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  const publicHeader = page.locator('.site-header')
  await expect(publicHeader).toBeVisible()
  const publicHeaderBox = await publicHeader.boundingBox()
  expect(publicHeaderBox).not.toBeNull()
  expect(publicHeaderBox!.x).toBeCloseTo(0, 0)
  expect(publicHeaderBox!.width).toBeCloseTo(1920, 0)
})

test('expired access session refreshes and preserves the protected route', async ({
  page,
}) => {
  await login(page)
  await page.evaluate(async (controlUrl) => {
    await fetch(`${controlUrl}/expire-access`)
  }, mockControl)

  await page.reload()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('正在恢复后台会话')).toBeHidden()
})

test('mobile administration navigation manages focus and logout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 })
  await login(page)

  const menuButton = page.getByRole('button', { name: '打开后台导航' })
  await expect(menuButton).toBeVisible()
  await menuButton.click()
  await expect(
    page.getByRole('navigation', { name: '移动端后台导航' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '关闭后台导航' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('navigation', { name: '移动端后台导航' }),
  ).toBeHidden()
  await expect(menuButton).toBeFocused()

  await page.getByRole('button', { name: '退出后台' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  await expect(page.getByRole('heading', { name: '进入后台' })).toBeVisible()
})

test('protected routes expose forbidden and backend-unavailable states', async ({
  page,
}) => {
  await page.request.get(`${mockControl}/forbid`)
  await page.goto('/admin')

  await expect(
    page.getByRole('heading', { name: '暂时无法访问后台' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('没有访问后台的权限')
  await expect(page.getByRole('link', { name: '返回公开站点' })).toBeVisible()

  await page.request.get(`${mockControl}/reset`)
  await page.request.get(`${mockControl}/failure?resource=auth`)
  await page.reload()

  await expect(
    page.getByRole('heading', { name: '后台服务暂时不可用' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('暂时无法响应')
})

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
