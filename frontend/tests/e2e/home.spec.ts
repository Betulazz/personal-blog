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

test('reduced motion removes ambient animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await expect(page.locator('.ambient-background__glow').first()).toHaveCSS(
    'animation-name',
    'none',
  )
})

test('hidden documents pause ambient animation', async ({ page }) => {
  await page.addInitScript(() => {
    let visibility: DocumentVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
    Object.defineProperty(window, '__setDocumentVisibility', {
      value: (nextVisibility: DocumentVisibilityState) => {
        visibility = nextVisibility
        document.dispatchEvent(new Event('visibilitychange'))
      },
    })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await expect
    .poll(() =>
      page.evaluate(() => {
        const visibilityWindow = window as typeof window & {
          __setDocumentVisibility: (visibility: DocumentVisibilityState) => void
        }
        visibilityWindow.__setDocumentVisibility('hidden')
        return document.querySelector('.ambient-background')?.className
      }),
    )
    .toContain('ambient-background--paused')
  await expect(page.locator('.ambient-background__glow').first()).toHaveCSS(
    'animation-play-state',
    'paused',
  )
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
