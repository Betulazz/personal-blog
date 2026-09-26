import { expect, test, type Page } from '@playwright/test'
import { join } from 'node:path'

const control = 'http://127.0.0.1:8787/__control'

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('administrator creates, filters, and publishes a GitHub Open-source Project', async ({
  page,
}, testInfo) => {
  const browserProblems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (
      message.type() === 'error' ||
      (message.type() === 'warning' &&
        !text.includes('[NUXT_E4011]') &&
        !text.includes('[nostics]') &&
        !text.includes('503 (Service Unavailable)'))
    ) {
      browserProblems.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (failure) =>
    browserProblems.push(`pageerror: ${failure.message}`),
  )
  await login(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/projects/new')

  await page.getByRole('combobox', { name: '项目类型' }).click()
  await page
    .getByRole('option', {
      name: 'GitHub Open-source Project（GitHub 开源项目）',
    })
    .click()
  await expect(page.getByLabel('技术栈')).toHaveCount(0)
  await expect(page.getByLabel('开发时间')).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: '状态' })).toHaveCount(0)
  await expect(page.getByLabel('Demo URL')).toHaveCount(0)

  await page.getByLabel('项目名称').fill('Open Source Atlas')
  await page.getByLabel('项目描述').fill('一份手动维护的开源仓库介绍。')
  await page
    .getByLabel('GitHub 仓库 URL')
    .fill('https://example.com/owner/repository')
  await page.getByLabel('展示顺序').fill('2')
  await page.getByLabel('精选项目').check()
  await page.getByRole('button', { name: '保存项目' }).click()
  await expect(page.locator('.admin-portfolio-error')).toContainText(
    '请输入 GitHub 上有效的仓库 URL。',
  )
  await expect(page.getByLabel('项目名称')).toHaveValue('Open Source Atlas')
  await expect(page.getByLabel('项目描述')).toHaveValue(
    '一份手动维护的开源仓库介绍。',
  )

  await page
    .getByLabel('GitHub 仓库 URL')
    .fill('https://github.com/example/open-source-atlas')
  await page.getByRole('button', { name: '保存项目' }).click()
  await expect(page).toHaveURL(/\/admin\/projects\/\d+\/edit$/)
  await expect(
    page.getByRole('heading', { name: 'Open Source Atlas' }),
  ).toBeVisible()
  await expect(page.getByLabel('GitHub 仓库 URL')).toHaveValue(
    'https://github.com/example/open-source-atlas',
  )

  await page.goto('/admin/projects')
  await page.getByLabel('搜索项目').fill('github.com/example/open-source-atlas')
  await page.getByRole('combobox', { name: '筛选项目类型' }).click()
  await page.getByRole('option', { name: 'GitHub Open-source Project' }).click()
  await page.getByRole('button', { name: '应用筛选' }).click()
  await expect(page.getByText('Open Source Atlas')).toBeVisible()
  await expect(
    page
      .locator('.admin-portfolio-row__main small')
      .filter({ hasText: 'GitHub Open-source Project' }),
  ).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/admin/projects/new')
  await page.getByRole('combobox', { name: '项目类型' }).click()
  await page
    .getByRole('option', {
      name: 'GitHub Open-source Project（GitHub 开源项目）',
    })
    .click()
  await expect(page.getByLabel('GitHub 仓库 URL')).toBeVisible()
  await expect(page.getByLabel('开发时间')).toHaveCount(0)
  const editorDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(editorDimensions.scrollWidth).toBeLessThanOrEqual(
    editorDimensions.clientWidth,
  )
  await captureViewport(page, testInfo.project.name, 'mobile-admin')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/projects')
  await expect(page).toHaveTitle(/项目/)
  const githubCard = page
    .getByRole('article')
    .filter({ hasText: 'Open Source Atlas' })
  await expect(githubCard).toContainText('GitHub 开源')
  const repositoryLink = githubCard.getByRole('link', {
    name: 'Open Source Atlas GitHub 仓库（外部链接）',
  })
  await expect(repositoryLink).toHaveAttribute(
    'href',
    'https://github.com/example/open-source-atlas',
  )
  await expect(repositoryLink).toHaveAttribute('target', '_blank')
  await expect(repositoryLink).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(githubCard).not.toContainText('开发时间')
  await expect(githubCard).not.toContainText('暂无公开演示')

  const personalCard = page
    .getByRole('article')
    .filter({ hasText: 'Lumen Notes' })
  await expect(personalCard).toContainText('Active')
  await expect(personalCard).toContainText('开发时间')
  await expect(personalCard).toContainText('Nuxt')
  await captureViewport(page, testInfo.project.name, 'desktop')
  await githubCard.scrollIntoViewIfNeeded()
  await captureViewport(page, testInfo.project.name, 'github-desktop')

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/projects')
  const mobileDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(mobileDimensions.scrollWidth).toBeLessThanOrEqual(
    mobileDimensions.clientWidth,
  )
  await expect(
    page
      .getByRole('article')
      .filter({ hasText: 'Open Source Atlas' })
      .getByRole('link', { name: 'Open Source Atlas GitHub 仓库（外部链接）' }),
  ).toBeVisible()
  await page
    .getByRole('article')
    .filter({ hasText: 'Open Source Atlas' })
    .scrollIntoViewIfNeeded()
  await captureViewport(page, testInfo.project.name, 'mobile')
  await captureViewport(page, testInfo.project.name, 'github-mobile')
  expect(browserProblems).toEqual([])
})

async function captureViewport(
  page: Page,
  projectName: string,
  viewport:
    'desktop' | 'mobile' | 'github-desktop' | 'github-mobile' | 'mobile-admin',
) {
  const directory = process.env.PROJECT_VARIANTS_SCREENSHOT_DIR
  if (!directory) return
  await page.screenshot({
    fullPage: false,
    path: join(directory, `${projectName}-${viewport}.png`),
  })
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
