import { expect, test } from '@playwright/test'

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

  await page.goto('/')

  await expect(page.getByRole('heading', { name: '最新文章' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '最近动态' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '最近杂谈' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '精选项目' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '保持联系' })).toBeVisible()
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
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'http://127.0.0.1:3000',
  )
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary',
  )
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    '夜航手记',
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
    page.getByRole('article').filter({ hasText: '把复杂的东西' }),
  ).toBeVisible()
  await expect(
    page.getByRole('article').filter({ hasText: '今天把首页' }),
  ).toBeVisible()
  await expect(
    page.getByRole('article').filter({ hasText: '让界面先学会呼吸' }),
  ).toBeVisible()
  await expect(
    page.getByRole('article').filter({ hasText: 'Lumen Notes' }),
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

    await page.screenshot({
      path: `test-results/homepage/${testInfo.project.name}-viewport-${viewport.width}.png`,
      fullPage: false,
      scale: 'css',
    })
    await page.screenshot({
      path: `test-results/homepage/${testInfo.project.name}-full-page-${viewport.width}.png`,
      fullPage: true,
      scale: 'css',
    })
  }

  expect(consoleProblems).toEqual([])
})
