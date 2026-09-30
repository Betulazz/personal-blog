import { expect, type Page, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-430', width: 430, height: 932 },
] as const

const evidenceDirectory =
  process.env.BLOG_CLICK_RIPPLE_SCREENSHOT_DIR ??
  join(tmpdir(), 'blog-public-click-ripple')

const collectBrowserErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('requestfailed', (request) => {
    errors.push(
      `requestfailed: ${request.url()} (${request.failure()?.errorText})`,
    )
  })
  return errors
}

const stubPlaceholderMedia = async (page: Page) => {
  // The local API fixture intentionally uses example.com image placeholders.
  // Keep those external requests out of this interaction check's console signal.
  await page.route('https://example.com/media/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />',
    }),
  )
}

test('public pointer ripples preserve route and control interactions', async ({
  page,
}, testInfo) => {
  await mkdir(evidenceDirectory, { recursive: true })
  const browserErrors = collectBrowserErrors(page)
  await stubPlaceholderMedia(page)

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const layer = page.getByTestId('public-click-ripple-layer')
    await expect(layer).toHaveCount(1)
    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('main#main-content')).not.toBeEmpty()
    await expect(page.locator('[data-error-page]')).toHaveCount(0)

    const selectableText = page
      .getByRole('region', { name: '夜航手记' })
      .getByText('关于技术、生活与缓慢生长的个人记录。', { exact: true })
    const textBounds = await selectableText.boundingBox()
    expect(textBounds).not.toBeNull()
    if (!textBounds) throw new Error('Expected public description text')
    const selectionY = textBounds.y + textBounds.height / 2
    await page.mouse.move(textBounds.x + 2, selectionY)
    await page.mouse.down()
    await page.mouse.move(
      textBounds.x + Math.min(textBounds.width - 2, 120),
      selectionY,
      {
        steps: 6,
      },
    )
    await page.mouse.up()
    const selectedText = await page.evaluate(
      () => window.getSelection()?.toString() ?? '',
    )
    expect(selectedText.trim().length).toBeGreaterThan(0)
    await expect(page.getByTestId('public-click-ripple')).toHaveCount(0)
    await page.evaluate(() => window.getSelection()?.removeAllRanges())

    const clickPoint = {
      x: Math.round(viewport.width / 2),
      y: Math.round(viewport.height / 2),
    }
    await page.mouse.click(clickPoint.x, clickPoint.y)
    await expect(page.getByTestId('public-click-ripple')).toHaveCount(1)

    const ripple = page.getByTestId('public-click-ripple').last()
    await expect(ripple).toBeVisible()
    const renderedRipple = await ripple.evaluate((element) => {
      const animation = element.getAnimations()[0]
      animation?.pause()
      if (animation) animation.currentTime = 400

      const bounds = element.getBoundingClientRect()
      return {
        centerX: bounds.left + bounds.width / 2,
        centerY: bounds.top + bounds.height / 2,
        height: getComputedStyle(element).height,
        pointerEvents: getComputedStyle(element).pointerEvents,
        visibleWidth: bounds.width,
        width: getComputedStyle(element).width,
      }
    })
    expect(renderedRipple.centerX).toBeCloseTo(clickPoint.x, 0)
    expect(renderedRipple.centerY).toBeCloseTo(clickPoint.y, 0)
    expect(renderedRipple.width).toBe('120px')
    expect(renderedRipple.height).toBe('120px')
    expect(renderedRipple.visibleWidth).toBeGreaterThan(90)
    await expect(layer).toHaveCSS('pointer-events', 'none')

    await page.waitForTimeout(80)
    await page.screenshot({
      path: join(
        evidenceDirectory,
        `${testInfo.project.name}-${viewport.name}-surface-ripple.png`,
      ),
      fullPage: false,
      scale: 'css',
    })

    await expect(page.getByTestId('public-click-ripple')).toHaveCount(0, {
      timeout: 2_000,
    })
    if (viewport.name === 'mobile-430') {
      const menuButton = page.getByRole('button', { name: '打开主导航' })
      await menuButton.click()
      await expect(
        page.getByRole('navigation', { name: '移动端主导航' }),
      ).toBeVisible()
      await page
        .getByRole('navigation', { name: '移动端主导航' })
        .getByRole('link', { name: '项目', exact: true })
        .click()
    } else {
      await page
        .getByRole('navigation', { name: '主导航' })
        .getByRole('link', { name: '项目', exact: true })
        .click()
    }

    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.locator('main#main-content')).not.toBeEmpty()
    await expect(page.getByTestId('public-click-ripple-layer')).toHaveCount(1)
    await expect(page.getByTestId('public-click-ripple')).toHaveCount(
      viewport.name === 'mobile-430' ? 2 : 1,
    )
    await expect(page.getByTestId('public-click-ripple')).toHaveCount(0, {
      timeout: 2_000,
    })

    await page.mouse.click(8, Math.round(viewport.height / 2))
    await expect(page.getByTestId('public-click-ripple')).toHaveCount(1)
    await expect(page).toHaveURL(/\/projects$/)

    await page.goto('/posts')
    const searchInput = page.getByLabel('搜索文章')
    await searchInput.click()
    await expect(searchInput).toBeFocused()
    await searchInput.fill('ripple interaction')
    await expect(searchInput).toHaveValue('ripple interaction')
    await page.mouse.wheel(0, 400)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0)
  }

  expect(browserErrors).toEqual([])
  testInfo.annotations.push({
    type: 'ripple-screenshot-directory',
    description: evidenceDirectory,
  })
})

test('reduced motion disables the public click effect', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page)
  await stubPlaceholderMedia(page)
  await page.goto('/')

  await expect(page.getByTestId('public-click-ripple-layer')).toHaveCount(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByTestId('public-click-ripple-layer')).toHaveCount(0)
  await page.mouse.click(12, 320)
  await expect(page.getByTestId('public-click-ripple')).toHaveCount(0)

  expect(browserErrors).toEqual([])
})

test('rapid public clicks keep the number of simultaneous ripples bounded', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page)
  await stubPlaceholderMedia(page)
  await page.goto('/')
  await expect(page.getByTestId('public-click-ripple-layer')).toHaveCount(1)

  const ripples = page.getByTestId('public-click-ripple')
  let maxActiveRippleCount = 0
  for (let index = 0; index < 12; index += 1) {
    await page.mouse.click(100, 300)
    const activeCount = await ripples.count()
    maxActiveRippleCount = Math.max(maxActiveRippleCount, activeCount)
    expect(activeCount).toBeLessThanOrEqual(8)
  }

  expect(maxActiveRippleCount).toBeGreaterThan(0)
  expect(browserErrors).toEqual([])
})

test('administrator routes do not mount a public click ripple layer', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page)
  await stubPlaceholderMedia(page)
  await page.goto('/admin/login')

  await expect(page.locator('body')).not.toBeEmpty()
  await expect(page.getByTestId('public-click-ripple-layer')).toHaveCount(0)
  await page.mouse.click(12, 320)
  await expect(page.getByTestId('public-click-ripple')).toHaveCount(0)

  expect(browserErrors).toEqual([])
})
