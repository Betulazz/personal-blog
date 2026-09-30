import { expect, test } from '@playwright/test'

const mockSiteAvatarUrl =
  'http://127.0.0.1:8787/uploads/images/site-avatar.webp'

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

test('homepage aggregates distinct content domains with accessible metadata', async ({
  page,
}) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    consoleProblems.push(`pageerror: ${error.message}`)
  })

  const response = await page.goto('/')
  const ssrHtml = (await response?.text()) ?? ''

  await expect(page.getByRole('heading', { name: '最新文章' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '最近动态' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '最近杂谈' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '精选项目' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '保持联系' })).toBeVisible()
  const runtimeStatus = page.getByRole('region', { name: '网站运行状态' })
  await expect(runtimeStatus).toContainText('服务运行中')
  await expect(runtimeStatus).toContainText('累计运行 191天18小时')
  await expect(runtimeStatus.getByText('Nuxt 4')).toBeVisible()
  await expect(runtimeStatus.getByText('Vue 3')).toBeVisible()
  await expect(runtimeStatus.getByText('FastAPI')).toBeVisible()
  await expect(runtimeStatus.getByText('MySQL 8.4')).toBeVisible()
  await expect(runtimeStatus.getByLabel('本地时间')).toHaveText(
    /\d{2}:\d{2}:\d{2}/,
  )
  await expect(page).toHaveTitle('夜航手记')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    '关于技术、生活与缓慢生长的个人记录。',
  )
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    '夜航手记',
  )
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    '关于技术、生活与缓慢生长的个人记录。',
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    mockSiteAvatarUrl,
  )
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'http://127.0.0.1:3000/',
  )
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  )
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    '夜航手记',
  )
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    mockSiteAvatarUrl,
  )
  await expect(
    page.locator('meta[name="twitter:description"]'),
  ).toHaveAttribute('content', '关于技术、生活与缓慢生长的个人记录。')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://127.0.0.1:3000/',
  )
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  )
  expect(ssrHtml).toContain('<title>夜航手记</title>')
  expect(ssrHtml).toContain('rel="canonical"')
  expect(ssrHtml).toContain('http://127.0.0.1:3000/')
  expect(ssrHtml).toContain(
    `property="og:image" content="${mockSiteAvatarUrl}"`,
  )
  expect(ssrHtml).toContain('application/ld+json')
  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  ) as Record<string, string>
  expect(jsonLd).toMatchObject({
    '@type': 'WebSite',
    name: '夜航手记',
    description: '关于技术、生活与缓慢生长的个人记录。',
    url: 'http://127.0.0.1:3000/',
  })

  await expect(
    page.locator('.home-post-card').filter({ hasText: '把复杂的东西' }),
  ).toBeVisible()
  await expect(
    page.locator('.home-post-card').filter({ hasText: '今天把首页' }),
  ).toHaveCount(0)
  await expect(
    page.locator('.chatter-card').filter({
      hasText: '让界面先学会呼吸',
    }),
  ).toBeVisible()
  await expect(
    page.locator('.home-project-card').filter({ hasText: 'Lumen Notes' }),
  ).toBeVisible()

  await expect(page.locator('time[datetime]').first()).toBeVisible()
  await expect(
    page.getByRole('img', { name: '深蓝色夜空与柔和光晕' }),
  ).toHaveAttribute('loading', 'lazy')
  await expect(
    page.getByRole('link', { name: 'Lumen Notes 源码（外部链接）' }),
  ).toBeVisible()

  const homepageSocialLink = page
    .locator('[data-homepage-social-links]')
    .locator('a')
    .filter({ hasText: /^GitHub$/ })
  await expect(homepageSocialLink).toHaveAttribute('target', '_blank')
  await expect(homepageSocialLink).toHaveAttribute('rel', /noopener/)
  await expect(homepageSocialLink).toHaveAttribute('rel', /noreferrer/)

  expect(consoleProblems).toEqual([])
})

test('homepage remains stable and inside every required CSS viewport', async ({
  page,
}, testInfo) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    consoleProblems.push(`pageerror: ${error.message}`)
  })

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.scrollWidth,
      `${viewport.width}x${viewport.height} viewport`,
    ).toBeLessThanOrEqual(dimensions.clientWidth)
    await expect(page.getByRole('heading', { name: '最新文章' })).toBeVisible()
    await expect(page.locator('[data-home-runtime-status] time')).toHaveText(
      /\d{2}:\d{2}:\d{2}/,
    )

    await page.screenshot({
      path: `test-results/homepage/${testInfo.project.name}-viewport-${viewport.width}.png`,
      fullPage: false,
      scale: 'css',
      caret: 'initial',
    })
    await page.screenshot({
      path: `test-results/homepage/${testInfo.project.name}-full-page-${viewport.width}.png`,
      fullPage: true,
      scale: 'css',
      caret: 'initial',
    })
  }

  expect(consoleProblems).toEqual([])
})
