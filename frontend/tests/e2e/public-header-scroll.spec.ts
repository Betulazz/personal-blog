import { expect, type Page, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile-430', width: 430, height: 932 },
] as const

const publicRoutes = ['/', '/posts', '/about'] as const

const evidenceDirectory =
  process.env.BLOG_HEADER_SCREENSHOT_DIR ??
  join(tmpdir(), 'blog-scroll-responsive-public-header')

const collectBrowserErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  return errors
}

const assertNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
}

const scrollTo = async (page: Page, top: number) => {
  await page.evaluate((scrollTop) => {
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, scrollTop)
    window.dispatchEvent(new Event('scroll'))
  }, top)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(top)
}

test('public header follows scroll direction across desktop and mobile routes', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  await mkdir(evidenceDirectory, { recursive: true })
  const browserErrors = collectBrowserErrors(page)

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)

    for (const route of publicRoutes) {
      await page.goto(route)
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      })
      await expect(page.locator('.menu-button')).toBeEnabled()
      const header = page.locator('.site-header')
      await expect(header).toBeVisible()
      await expect(header).not.toHaveClass(/site-header--hidden/)
      await expect
        .poll(() =>
          header.evaluate(
            (element) => getComputedStyle(element).transitionDuration,
          ),
        )
        .toBe('0.5s, 0.5s')
      await expect(page.locator('main#main-content')).toBeVisible()
      await expect(page).toHaveTitle(/.+/)
      await expect(page.locator('[data-error-page]')).toHaveCount(0)
      await expect(page.locator('main#main-content')).not.toBeEmpty()
      await assertNoHorizontalOverflow(page)

      if (route === '/') {
        await page.screenshot({
          path: join(evidenceDirectory, `${viewport.name}-header-visible.png`),
          fullPage: false,
          scale: 'css',
        })
      }

      await scrollTo(page, 80)
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await scrollTo(page, 84)
        await expect(header).not.toHaveClass(/site-header--hidden/)
        await scrollTo(page, 80)
        await expect(header).not.toHaveClass(/site-header--hidden/)
      }

      await scrollTo(page, 320)
      await expect(header).toHaveClass(/site-header--hidden/)
      await expect
        .poll(() =>
          header.evaluate((element) => getComputedStyle(element).pointerEvents),
        )
        .toBe('none')
      await expect
        .poll(() =>
          header.evaluate((element) => element.getBoundingClientRect().bottom),
        )
        .toBeLessThan(0)

      if (route === '/') {
        await page.screenshot({
          path: join(evidenceDirectory, `${viewport.name}-header-hidden.png`),
          fullPage: false,
          scale: 'css',
        })
      }

      await scrollTo(page, 180)
      await expect(header).not.toHaveClass(/site-header--hidden/)

      await scrollTo(page, 0)
      await expect(header).not.toHaveClass(/site-header--hidden/)
      await assertNoHorizontalOverflow(page)
    }
  }

  expect(browserErrors).toEqual([])
  testInfo.annotations.push({
    type: 'evidence-directory',
    description: evidenceDirectory,
  })
})

test('header hides after pointer navigation even when the link retains focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const browserErrors = collectBrowserErrors(page)
  await page.goto('/')
  await expect(page.locator('.menu-button')).toBeEnabled()

  const header = page.locator('.site-header')
  const projectsLink = page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '项目', exact: true })
  await projectsLink.click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(header).not.toHaveClass(/site-header--hidden/)

  await page.waitForTimeout(100)
  const pointerFocusState = await page.evaluate(() => ({
    activeElementInHeader: Boolean(
      document.activeElement?.closest('.site-header'),
    ),
    activeElementMatchesFocusVisible:
      document.activeElement instanceof HTMLElement &&
      document.activeElement.matches(':focus-visible'),
  }))
  expect(pointerFocusState).toEqual({
    activeElementInHeader: true,
    activeElementMatchesFocusVisible: false,
  })

  await scrollTo(page, 0)
  await scrollTo(page, 320)
  await expect(header).toHaveClass(/site-header--hidden/, { timeout: 2_000 })
  expect(browserErrors).toEqual([])
})

test('keyboard focus, mobile menu, route changes, and reduced motion preserve access', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const browserErrors = collectBrowserErrors(page)

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })
  await expect(page.locator('.menu-button')).toBeEnabled()
  const desktopHeader = page.locator('.site-header')
  await scrollTo(page, 320)
  await expect(desktopHeader).toHaveClass(/site-header--hidden/)

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(desktopHeader).not.toHaveClass(/site-header--hidden/)
  await expect(page.locator('.site-brand')).toBeFocused()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.activeElement instanceof HTMLElement &&
          document.activeElement.matches(':focus-visible'),
      ),
    )
    .toBe(true)
  await page.locator('.site-brand').evaluate((element) => {
    ;(element as HTMLElement).blur()
  })

  await scrollTo(page, 0)
  await scrollTo(page, 320)
  await expect(desktopHeader).toHaveClass(/site-header--hidden/)
  await page
    .locator('main a[href="/projects"]')
    .first()
    .evaluate((element) => {
      ;(element as HTMLAnchorElement).click()
    })
  await expect(page).toHaveURL(/\/projects$/)
  await expect(desktopHeader).not.toHaveClass(/site-header--hidden/)

  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/')
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })
  const mobileHeader = page.locator('.site-header')
  const menuTrigger = page.getByRole('button', { name: '打开主导航' })
  await expect(menuTrigger).toBeVisible()
  await expect(menuTrigger).toBeEnabled()
  await scrollTo(page, 320)
  await expect(mobileHeader).toHaveClass(/site-header--hidden/)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.locator('.site-brand')).toBeFocused()
  await expect(mobileHeader).not.toHaveClass(/site-header--hidden/)
  await page.keyboard.press('Tab')
  await expect(menuTrigger).toBeFocused()
  await menuTrigger.click()
  const mobileNavigation = page.getByRole('navigation', {
    name: '移动端主导航',
  })
  await expect(mobileNavigation).toBeVisible()
  await expect(mobileHeader).not.toHaveClass(/site-header--hidden/)
  await page.getByRole('button', { name: '关闭主导航' }).click()
  await menuTrigger.evaluate((element) => {
    ;(element as HTMLElement).blur()
  })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await scrollTo(page, 0)
  await scrollTo(page, 320)
  await expect(mobileHeader).toHaveClass(/site-header--hidden/)
  const reducedMotionStyles = await mobileHeader.evaluate((element) => ({
    opacity: getComputedStyle(element).opacity,
    transitionProperty: getComputedStyle(element).transitionProperty,
    transform: getComputedStyle(element).transform,
  }))
  expect(reducedMotionStyles.opacity).toBe('0')
  expect(reducedMotionStyles.transform).toBe('none')
  expect(reducedMotionStyles.transitionProperty).toBe('none')

  await scrollTo(page, 180)
  await expect(mobileHeader).not.toHaveClass(/site-header--hidden/)
  const reducedMotionVisibleStyles = await mobileHeader.evaluate((element) => ({
    opacity: getComputedStyle(element).opacity,
    transform: getComputedStyle(element).transform,
  }))
  expect(reducedMotionVisibleStyles.opacity).toBe('1')
  expect(reducedMotionVisibleStyles.transform).toBe('none')

  expect(browserErrors).toEqual([])
})
