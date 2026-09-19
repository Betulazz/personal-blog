import { expect, test } from '@playwright/test'

test('renders the visual foundation as meaningful SSR content', async ({
  page,
}) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  await page.goto('/')

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '在夜色里，写下仍然发光的事',
  )
  await expect(page.getByRole('link', { name: '开始阅读' })).toBeVisible()
  expect(consoleProblems).toEqual([])
})

test('mobile navigation exposes a clear open and close state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/')

  const menuButton = page.getByRole('button', { name: '打开主导航' })
  await expect(menuButton).toBeEnabled({ timeout: 15_000 })
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  await menuButton.click()

  await expect(
    page.getByRole('navigation', { name: '移动端主导航' }),
  ).toBeVisible()
  const closeButton = page.getByRole('button', { name: '关闭主导航' })
  await expect(closeButton).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('navigation', { name: '移动端主导航' }),
  ).toBeHidden()
  await expect(menuButton).toBeFocused()
})

test('small screens select an optimized background instead of the full source', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  const background = page.locator('.ambient-background__media img')
  await expect(background).toHaveJSProperty('complete', true)
  await expect
    .poll(() =>
      background.evaluate((image: HTMLImageElement) => image.currentSrc),
    )
    .toMatch(/ambient-(640|1280)\.avif$/)

  const loadedImages = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((url) => /\.(?:avif|webp|jpe?g)$/.test(url)),
  )
  expect(loadedImages.some((url) => url.includes('ambient-1920'))).toBe(false)
  expect(loadedImages.some((url) => url.includes('/bg.jpeg'))).toBe(false)
})

test('homepage motion is finite and respects reduced-motion preferences', async ({
  page,
}) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    if (reducedMotion === 'reduce') {
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document
                .getAnimations()
                .filter((animation) => animation.playState === 'running')
                .length,
          ),
        )
        .toBe(0)
    }
    await page.waitForTimeout(700)

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.playState === 'running').length,
        ),
      )
      .toBe(0)
  }
})

test('desktop homepage sections reveal after entering the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const firstSection = page.locator('[data-homepage-section]').first()
  await expect(firstSection).not.toHaveAttribute('data-revealed', 'true')
  await firstSection.scrollIntoViewIfNeeded()
  await expect(firstSection).toHaveAttribute('data-revealed', 'true')

  await page.waitForTimeout(700)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === 'running').length,
      ),
    )
    .toBe(0)
})

test('mobile removes nonessential ambient motion and protects the footer from the player', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/')

  const checks = await page.evaluate(() => {
    const player = document.querySelector('[data-testid="music-player"]')
    const footer = document.querySelector('footer')
    const section = document.querySelector('[data-homepage-section]')
    const playerRect = player?.getBoundingClientRect()
    const footerRect = footer?.getBoundingClientRect()

    return {
      ambientGlows: [
        ...document.querySelectorAll('.ambient-background__glow'),
      ].map((element) => getComputedStyle(element).display),
      homepageSectionAnimation: section
        ? getComputedStyle(section).animationName
        : 'missing',
      playerControls: [
        ...document.querySelectorAll(
          '[data-testid="music-player"] button, [data-testid="music-player"] input',
        ),
      ].map((element) => {
        const rect = element.getBoundingClientRect()
        return { height: rect.height, width: rect.width }
      }),
      playerFooterGap:
        playerRect && footerRect
          ? Math.max(0, playerRect.top - footerRect.bottom)
          : -1,
    }
  })

  expect(checks.ambientGlows).toEqual(['none', 'none'])
  expect(checks.homepageSectionAnimation).toBe('none')
  expect(checks.playerControls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        height: expect.any(Number),
        width: expect.any(Number),
      }),
    ]),
  )
  expect(
    checks.playerControls.every(
      ({ height, width }) => height >= 44 && width >= 44,
    ),
  ).toBe(true)

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  )
  await expect
    .poll(() =>
      page.evaluate(() => {
        const player = document
          .querySelector('[data-testid="music-player"]')
          ?.getBoundingClientRect()
        const footer = document.querySelector('footer')?.getBoundingClientRect()
        return player && footer ? footer.bottom <= player.top : false
      }),
    )
    .toBe(true)
})

test('required visual widths do not overflow horizontally', async ({
  page,
}) => {
  const viewports = [
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.scrollWidth,
      `${viewport.width}px viewport`,
    ).toBeLessThanOrEqual(dimensions.clientWidth)
  }
})
