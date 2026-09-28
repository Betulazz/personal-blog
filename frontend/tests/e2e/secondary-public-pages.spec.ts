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
  await page.goto('/about?variant=c')

  await expect(page).toHaveTitle(/关于 · .+/)
  await expect(page.locator('[data-about-page]')).toBeVisible()
  await expect(page.locator('[data-about-prototype]')).toHaveCount(0)
  await expect(page.locator('[data-about-prototype-switcher]')).toHaveCount(0)
  await expect(page.locator('main h1')).toHaveCount(1)
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
    page.getByRole('complementary').locator('.about-page__bio'),
  ).toBeVisible()
  await expect(page.locator('.about-page__story p').first()).toBeVisible()

  const externalSocial = page.locator('.about-page__socials a[target="_blank"]')
  if (await externalSocial.count()) {
    await expect(externalSocial.first()).toHaveAttribute(
      'rel',
      /noopener.*noreferrer/,
    )
  }
})

test('About keeps Profile in document flow above Skills on desktop and mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/about?variant=b', { waitUntil: 'networkidle' })

  const identity = page.locator('.about-page__identity')
  const portrait = page.locator('.about-page__portrait')
  const avatar = portrait.locator('img')
  const skills = page.locator('.about-page__skills')
  const layout = page.locator('.about-page__layout')

  await expect(identity).toBeVisible()
  await expect(portrait).toBeVisible()
  await expect(avatar).toHaveCSS('object-fit', 'cover')
  await expect
    .poll(() =>
      portrait.evaluate((element) => getComputedStyle(element).borderRadius),
    )
    .toBe('50%')

  expect(
    await layout.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
    ),
  ).toBe(2)

  const readDocumentPosition = (locator: typeof identity) =>
    locator.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return {
        position: getComputedStyle(element).position,
        viewportTop: bounds.top,
        documentTop: bounds.top + window.scrollY,
        documentBottom: bounds.bottom + window.scrollY,
      }
    })

  const profileAtStart = await readDocumentPosition(identity)
  const skillsAtStart = await readDocumentPosition(skills)
  expect(profileAtStart.position).toBe('static')
  expect(skillsAtStart.position).toBe('static')
  expect(skillsAtStart.documentTop).toBeGreaterThan(
    profileAtStart.documentBottom,
  )

  const longSkills = page.locator('.about-page__skill-groups')
  await longSkills.evaluate((element) => {
    for (let index = 1; index <= 18; index += 1) {
      const group = document.createElement('div')
      const heading = document.createElement('h3')
      const list = document.createElement('ul')
      heading.textContent = `长技能组 ${index}`
      for (let item = 1; item <= 5; item += 1) {
        const entry = document.createElement('li')
        entry.textContent = `滚动技能 ${index}-${item}`
        list.append(entry)
      }
      group.append(heading, list)
      element.append(group)
    }
  })

  const noNestedScroll = await page
    .locator(
      '.about-page__rail, .about-page__skills, .about-page__skill-groups',
    )
    .evaluateAll((elements) =>
      elements.every((element) => {
        const overflowY = getComputedStyle(element).overflowY
        return overflowY !== 'auto' && overflowY !== 'scroll'
      }),
    )
  expect(noNestedScroll).toBe(true)

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
  })
  await page.mouse.move(1000, 500)
  await page.mouse.wheel(0, 500)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)

  const scrollAfterWheel = await page.evaluate(() => window.scrollY)
  const profileAfterWheel = await readDocumentPosition(identity)
  const skillsAfterWheel = await readDocumentPosition(skills)
  expect(profileAfterWheel.position).toBe('static')
  expect(profileAfterWheel.documentTop).toBeCloseTo(
    profileAtStart.documentTop,
    0,
  )
  expect(skillsAfterWheel.documentTop).toBeCloseTo(skillsAtStart.documentTop, 0)
  expect(profileAfterWheel.viewportTop).toBeCloseTo(
    profileAtStart.viewportTop - scrollAfterWheel,
    0,
  )
  expect(skillsAfterWheel.viewportTop).toBeCloseTo(
    skillsAtStart.viewportTop - scrollAfterWheel,
    0,
  )

  const scrollBeforePageEnd = scrollAfterWheel
  await page.mouse.wheel(0, 10_000)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(scrollBeforePageEnd)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight,
      ),
    )
    .toBe(true)
  await expect(page.getByText('滚动技能 18-5', { exact: true })).toBeVisible()

  const profileAtPageEnd = await readDocumentPosition(identity)
  const skillsAtPageEnd = await readDocumentPosition(skills)
  const scrollAtPageEnd = await page.evaluate(() => window.scrollY)
  expect(profileAtPageEnd.position).toBe('static')
  expect(profileAtPageEnd.documentTop).toBeCloseTo(
    profileAtStart.documentTop,
    0,
  )
  expect(skillsAtPageEnd.documentTop).toBeCloseTo(skillsAtStart.documentTop, 0)
  expect(profileAtPageEnd.viewportTop).toBeCloseTo(
    profileAtStart.documentTop - scrollAtPageEnd,
    0,
  )
  expect(skillsAtPageEnd.documentTop).toBeGreaterThan(
    profileAtPageEnd.documentBottom,
  )

  await page.goto('/about#about-contact-title', { waitUntil: 'networkidle' })
  await expect(page.locator('#about-contact-title')).toBeVisible()
  expect((await readDocumentPosition(identity)).position).toBe('static')

  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/about?variant=a', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-about-page]')).toBeVisible()
  await expect(identity).toHaveCSS('position', 'static')
  expect(
    await layout.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
    ),
  ).toBe(1)

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  await page.locator('#about-contact-title').scrollIntoViewIfNeeded()
  await expect(page.locator('#about-contact-title')).toBeVisible()

  const musicPlayer = page.locator('[data-testid="music-player"]')
  if (await musicPlayer.count()) {
    await expect(musicPlayer).toHaveCSS('position', 'relative')
    const aboutBounds = await page.locator('[data-about-page]').boundingBox()
    const playerBounds = await musicPlayer.boundingBox()
    expect(aboutBounds).not.toBeNull()
    expect(playerBounds).not.toBeNull()
    expect(playerBounds!.y).toBeGreaterThanOrEqual(
      aboutBounds!.y + aboutBounds!.height,
    )
  }
})

test('About falls back to a legible monogram when its avatar fails', async ({
  page,
}) => {
  await page.goto('/about', { waitUntil: 'networkidle' })

  const siteName = (
    await page.locator('.about-page__identity h2').innerText()
  ).trim()
  const failureUrl = `${new URL(page.url()).origin}/__about-avatar-failure.png`
  await page.route(failureUrl, (route) => route.abort())
  const imageFailure = page.waitForEvent(
    'requestfailed',
    (request) => request.url() === failureUrl,
  )
  await page.locator('.about-page__portrait img').evaluate((image, url) => {
    ;(image as HTMLImageElement).src = url as string
  }, failureUrl)
  await imageFailure

  await expect(
    page.getByRole('img', { name: `${siteName}：头像暂不可用` }),
  ).toBeVisible()
  await expect(page.locator('.about-page__portrait img')).toHaveCount(0)
  await expect(page.locator('.about-page__portrait')).toContainText(
    siteName[0]!,
  )
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
