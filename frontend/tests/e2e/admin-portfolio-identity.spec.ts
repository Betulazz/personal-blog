import { expect, test, type Page } from '@playwright/test'

const control = 'http://127.0.0.1:8787/__control'

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('administrator can maintain Projects and Friend Links with safe confirmations', async ({
  page,
}) => {
  await login(page)

  await page.goto('/admin/projects')
  await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible()
  await expect(page.getByText('Lumen Notes')).toBeVisible()
  await page.getByRole('link', { name: '新建项目' }).click()

  await page.getByLabel('项目名称').fill('Night Atlas')
  await page.getByLabel('项目描述').fill('一份可持续维护的夜间资料集。')
  await page.getByLabel('技术栈').fill('Nuxt, TypeScript, MySQL')
  await page.getByLabel('开发时间').fill('2026.01 — 至今')
  await page.getByRole('combobox', { name: '状态' }).click()
  await page.getByRole('option', { name: '开发中' }).press('Enter')
  await page.getByLabel('展示顺序').fill('1')
  await page.getByLabel('精选项目').check()
  await page.getByLabel('Source URL').fill('javascript:alert(1)')
  await page.getByRole('button', { name: '保存项目' }).click()
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: '请输入安全的 HTTP(S) URL。' })
      .first(),
  ).toBeVisible()
  await expect(page.getByLabel('项目名称')).toHaveValue('Night Atlas')

  await page
    .getByLabel('Source URL')
    .fill('https://github.com/example/night-atlas')
  await page.getByLabel('Demo URL').fill('https://example.com/night-atlas')
  await page.getByRole('button', { name: '保存项目' }).click()
  await expect(page).toHaveURL(/\/admin\/projects\/\d+\/edit$/)
  await expect(page.getByRole('heading', { name: 'Night Atlas' })).toBeVisible()

  await page.getByLabel('项目名称').fill('Night Atlas Updated')
  await page.getByRole('button', { name: '保存项目' }).click()
  await expect(
    page.getByRole('heading', { name: 'Night Atlas Updated' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '删除项目' }).click()
  await expect(
    page.getByRole('dialog', { name: '确认删除这个项目？' }),
  ).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '取消' }).click()
  await expect(page.getByLabel('项目名称')).toHaveValue('Night Atlas Updated')
  await page.getByRole('button', { name: '删除项目' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/projects$/)
  await expect(page.getByText('Night Atlas Updated')).toHaveCount(0)

  await page.goto('/admin/friends')
  await expect(page.getByRole('heading', { name: '友链管理' })).toBeVisible()
  await page.getByRole('link', { name: '新建友链' }).click()
  await page.getByLabel('友链名称').fill('Quiet Garden')
  await page.getByLabel('友链描述').fill('分享阅读与界面观察。')
  await page.getByLabel('目标 URL').fill('javascript:alert(1)')
  await page.getByRole('button', { name: '保存友链' }).click()
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: '请输入安全的 HTTP(S) URL。' })
      .first(),
  ).toBeVisible()
  await page.getByLabel('目标 URL').fill('https://example.com/quiet-garden')
  await page.getByLabel('公开展示').uncheck()
  await page.getByLabel('展示顺序').fill('4')
  await page.getByRole('button', { name: '保存友链' }).click()
  await expect(page).toHaveURL(/\/admin\/friends\/\d+\/edit$/)
  await expect(page.getByText('已隐藏', { exact: true })).toBeVisible()
})

test('Site Identity preserves configuration and explains its public preview', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: '网站设置' })).toBeVisible()

  await page.getByLabel('网站名称').fill('夜航档案')
  await page.getByLabel('网站标语').fill('把长期工作写得清楚')
  await page.getByLabel('网站描述').fill('关于工程、阅读与日常维护的公开记录。')
  await page.getByLabel('个人简介').fill('一个喜欢清晰边界的独立作者。')
  await page.getByLabel('头像 URL').fill('/uploads/avatar.webp')
  await page.getByLabel('Favicon URL').fill('https://example.com/favicon.ico')
  await page.getByLabel('默认 SEO 标题').fill('夜航档案 | 默认 SEO')
  await page.getByLabel('默认 SEO 描述').fill('默认搜索摘要。')
  await page.getByLabel('SEO 关键词').fill('博客, 工程, 阅读')
  await page.getByLabel('页脚说明').fill('一个安静的个人出版空间。')
  await page.getByLabel('联系邮箱').fill('hello@example.com')
  await page.getByLabel('社交链接名称 1').fill('GitHub')
  await page.getByLabel('社交链接地址 1').fill('https://github.com/example')
  await page.getByLabel('首页显示精选项目').uncheck()
  await page.getByRole('button', { name: '保存网站设置' }).click()

  await expect(page.getByText('设置已保存')).toBeVisible()
  await expect(
    page.getByRole('region', { name: '公开呈现预览' }),
  ).toContainText('夜航档案')
  await expect(
    page.getByRole('region', { name: '公开呈现预览' }),
  ).toContainText('把长期工作写得清楚')
  await expect(page.getByLabel('网站名称')).toHaveValue('夜航档案')
})

test('portfolio administration preserves failed input and stays usable on mobile', async ({
  page,
}) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    const knownNuxtDevWarning =
      text.includes('[NUXT_E4011]') || text.includes('[nostics]')
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !knownNuxtDevWarning &&
      !text.includes('503 (Service Unavailable)')
    ) {
      consoleProblems.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (failure) =>
    consoleProblems.push(`pageerror: ${failure.message}`),
  )

  await login(page)
  await page.goto('/admin/projects/new')
  await page.getByLabel('项目名称').fill('仍然保留的项目')
  await page.getByLabel('项目描述').fill('服务失败后仍保留。')
  await page.getByLabel('开发时间').fill('2026')
  await page.request.get(`${control}/failure?resource=admin`)
  await page.getByRole('button', { name: '保存项目' }).click()
  await expect(page.getByRole('alert')).toContainText('后台服务暂时无法响应')
  await expect(page.getByLabel('项目名称')).toHaveValue('仍然保留的项目')

  await page.request.get(`${control}/reset`)
  await login(page)
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: '网站设置' })).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  await page.getByLabel('网站名称').focus()
  await expect(page.getByLabel('网站名称')).toBeFocused()
  expect(consoleProblems).toEqual([])
})

test('portfolio administration fits the declared viewport matrix', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'The desktop project owns the fixed CSS viewport matrix.',
  )
  await login(page)
  const viewports = [
    { height: 812, width: 375 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
  ]
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const route of [
      '/admin/projects',
      '/admin/friends',
      '/admin/settings',
    ]) {
      await page.goto(route)
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(
        dimensions.scrollWidth,
        `${route} at ${viewport.width}px admin viewport`,
      ).toBeLessThanOrEqual(dimensions.clientWidth)
      await expect(page.locator('main')).toBeVisible()
      if (viewport.width === 430 && route === '/admin/settings') {
        await page.screenshot({
          path: `test-results/admin-portfolio-identity/${testInfo.project.name}-430-viewport.png`,
          fullPage: false,
          scale: 'css',
        })
      }
      if (viewport.width === 1440 && route === '/admin/projects') {
        await page.screenshot({
          path: `test-results/admin-portfolio-identity/${testInfo.project.name}-1440-viewport.png`,
          fullPage: false,
          scale: 'css',
        })
      }
    }
  }
})

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
