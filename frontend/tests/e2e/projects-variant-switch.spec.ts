import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const control = 'http://127.0.0.1:8787/__control'
const viewports = [
  { height: 812, width: 375 },
  { height: 932, width: 430 },
  { height: 1024, width: 768 },
  { height: 768, width: 1024 },
  { height: 900, width: 1440 },
  { height: 1080, width: 1920 },
]

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('filters variants, follows URL history, and paginates the complete selected collection', async ({
  page,
}, testInfo) => {
  const browserProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserProblems.push(`console: ${message.text()}`)
    }
  })
  page.on('pageerror', (failure) =>
    browserProblems.push(`pageerror: ${failure.message}`),
  )
  await seedProjects(page)
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/projects')
  await expect(page).toHaveURL(/\/projects\?type=github_open_source$/)
  await expect(page).toHaveTitle(/项目/)
  await expect(page.getByRole('heading', { name: '项目集' })).toBeVisible()
  await expect(page.getByRole('radio', { name: '开源项目' })).toBeChecked()
  await expect(
    page.getByRole('radio', { name: '自己的项目' }),
  ).not.toBeChecked()
  await expect(page.getByRole('article')).toHaveCount(2)

  const repositoryCard = page
    .getByRole('article')
    .filter({ hasText: 'Manual Open-source Sample' })
  await expect(repositoryCard).toContainText('GitHub 开源')
  await expect(
    repositoryCard.getByRole('link', {
      name: 'Manual Open-source Sample GitHub 仓库（外部链接）',
    }),
  ).toHaveAttribute('href', 'https://github.com/example/manual-open-source')
  await expect(page.getByText('Personal with GitHub Source')).toHaveCount(0)
  await capture(page, testInfo, 'github-open-source-desktop')

  await page.getByRole('radio', { name: '开源项目' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/projects\?type=personal$/)
  await expect(page.getByRole('radio', { name: '自己的项目' })).toBeChecked()
  await expect(page.getByRole('article')).toHaveCount(20)
  await expect(page.getByText('22 个项目')).toBeVisible()
  await expect(page.getByText('Manual Open-source Sample')).toHaveCount(0)

  const sourceCard = page
    .getByRole('article')
    .filter({ hasText: 'Personal with GitHub Source' })
  await expect(sourceCard).toHaveCount(1)
  await expect(sourceCard).toContainText('PERSONAL PROJECT')
  await expect(
    sourceCard.getByRole('link', {
      name: 'Personal with GitHub Source 源码（外部链接）',
    }),
  ).toHaveAttribute('href', 'https://github.com/example/personal-00')
  await expect(sourceCard).not.toContainText('GitHub 开源')

  await page.setViewportSize({ width: 375, height: 812 })
  await capture(page, testInfo, 'personal-mobile')
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page).toHaveURL(/\/projects\?type=personal&page=2$/)
  await expect(page.getByText('第 2 / 2 页')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(
    page.getByRole('heading', { name: 'Personal Project 20' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Personal Project 21' }),
  ).toBeVisible()
  await capture(page, testInfo, 'personal-page-two-mobile')

  await page.getByText('开源项目', { exact: true }).click()
  await expect(page).toHaveURL(/\/projects\?type=github_open_source$/)
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '下一页' })).toHaveCount(0)

  await page.goBack()
  await expect(page).toHaveURL(/\/projects\?type=personal&page=2$/)
  await expect(page.getByRole('radio', { name: '自己的项目' })).toBeChecked()
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.goForward()
  await expect(page).toHaveURL(/\/projects\?type=github_open_source$/)
  await expect(page.getByRole('radio', { name: '开源项目' })).toBeChecked()

  await page.goto('/projects?type=personal')
  await expect(page).toHaveURL(/\/projects\?type=personal$/)
  await expect(page.getByRole('article')).toHaveCount(20)

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('radio', { name: '开源项目' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '自己的项目' })).toBeVisible()
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.scrollWidth,
      `${viewport.width}px horizontal overflow`,
    ).toBeLessThanOrEqual(dimensions.clientWidth)
  }

  expect(browserProblems).toEqual([])
})

test('normalizes invalid variants and shows selected-variant empty and error states', async ({
  page,
}) => {
  await page.request.post(`${control}/projects`, { data: { projects: [] } })
  await page.goto('/projects?type=unknown&page=3&unused=discard')

  await expect(page).toHaveURL(/\/projects\?type=github_open_source$/)
  await expect(page.getByText('还没有找到开源项目')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '查看全部开源项目' }),
  ).toHaveAttribute('href', '/projects?type=github_open_source')

  await page.getByText('自己的项目', { exact: true }).click()
  await expect(page).toHaveURL(/\/projects\?type=personal$/)
  await expect(page.getByText('还没有找到自己的项目')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '查看全部自己的项目' }),
  ).toHaveAttribute('href', '/projects?type=personal')

  await page.request.get(`${control}/failure?resource=projects`)
  await page.goto('/projects?type=personal')
  await expect(page.getByText('暂时无法加载自己的项目')).toBeVisible()
})

async function seedProjects(page: Page) {
  const personalProjects = Array.from({ length: 22 }, (_, index) => ({
    id: index + 1,
    project_type: 'personal',
    name:
      index === 0
        ? 'Personal with GitHub Source'
        : `Personal Project ${index.toString().padStart(2, '0')}`,
    description: '由管理员手动维护的个人项目。',
    logo_url: null,
    logo_alt: null,
    technology: ['Nuxt', 'TypeScript'],
    source_url: `https://github.com/example/personal-${index.toString().padStart(2, '0')}`,
    demo_url: `https://example.com/personal-${index.toString().padStart(2, '0')}`,
    status: 'active',
    featured: index === 0,
    display_order: index,
    time_span: '2025 — 2026',
  }))
  const githubProjects = [
    {
      id: 1001,
      project_type: 'github_open_source',
      name: 'Manual Open-source Sample',
      description: '手动整理的 GitHub 开源项目。',
      logo_url: null,
      logo_alt: null,
      repository_url: 'https://github.com/example/manual-open-source',
      featured: true,
      display_order: 0,
    },
    {
      id: 1002,
      project_type: 'github_open_source',
      name: 'Manual Open-source Toolkit',
      description: '另一项手动整理的开源工具。',
      logo_url: null,
      logo_alt: null,
      repository_url: 'https://github.com/example/manual-open-source-toolkit',
      featured: false,
      display_order: 1,
    },
  ]

  await page.request.post(`${control}/projects`, {
    data: { projects: [...githubProjects, ...personalProjects] },
  })
}

async function capture(page: Page, testInfo: TestInfo, state: string) {
  const directory = process.env.PROJECT_VARIANT_SWITCH_SCREENSHOT_DIR
  if (!directory) return
  mkdirSync(directory, { recursive: true })
  const viewport = page.viewportSize()
  const filename = `${testInfo.project.name}-${state}-${viewport?.width ?? 'full'}`
  await page.screenshot({
    fullPage: false,
    path: join(directory, `${filename}-viewport.png`),
  })
  await page.screenshot({
    fullPage: true,
    path: join(directory, `${filename}-full.png`),
  })
}
