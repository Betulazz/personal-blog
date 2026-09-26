import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

const evidenceDirectory = resolve(
  process.env.DESIGN_SYSTEM_EVIDENCE_DIR ?? 'test-results/design-system',
)

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
})

test('design system gallery presents the token atlas and primitive states', async ({
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

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/design-system')
  await expect(page.locator('[data-hydrated="true"]')).toHaveCount(1)

  await expect(page).toHaveTitle('Design System · 夜航手记')
  await expect(
    page.getByRole('heading', { name: 'Design System gallery' }),
  ).toBeVisible()
  await expect(page.getByTestId('token-family-color')).toBeVisible()
  await expect(page.getByTestId('token-family-motion')).toBeVisible()
  await expect(page.getByText('中文与 English 共存的排版样本')).toBeVisible()
  await expect(page.getByText('这里暂时没有内容')).toBeVisible()
  await expect(
    page.getByRole('img', { name: '媒体内容暂不可用' }),
  ).toBeVisible()

  const defaultButton = page.getByTestId('button-default')
  const defaultBorder = await defaultButton.evaluate(
    (element) => getComputedStyle(element).borderColor,
  )
  await defaultButton.hover()
  const supportsHover = await page.evaluate(
    () => window.matchMedia('(hover: hover)').matches,
  )
  if (supportsHover) {
    await expect(defaultButton).not.toHaveCSS('border-color', defaultBorder)
  }

  await page.getByTestId('open-dialog').click()
  await expect(
    page.getByRole('dialog', { name: 'Dialog open state' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Dialog open state' }),
  ).toBeHidden()
  await expect(page.getByTestId('open-dialog')).toBeFocused()

  await page.getByTestId('open-sheet').click()
  await expect(
    page.getByRole('dialog', { name: 'Sheet open state' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '关闭Sheet open state' }).click()

  await page.getByRole('combobox', { name: '选择分类' }).click()
  await page.getByRole('option', { name: 'Design tokens' }).click()
  await expect(page.getByRole('combobox', { name: '选择分类' })).toContainText(
    'Design tokens',
  )

  await page.getByRole('button', { name: '更多状态' }).click()
  await page.getByRole('menuitem', { name: '查看规范' }).click()
  await expect(page.getByTestId('dropdown-result')).toHaveText('查看规范')

  const focusTarget = page.getByTestId('focus-target')
  await page.getByTestId('button-default').focus()
  await page.keyboard.press('Tab')
  await expect(focusTarget).toBeFocused()
  await expect(focusTarget).toHaveCSS('outline-style', 'solid')

  const headingPresentation = await page
    .getByRole('heading', { name: 'Design System gallery' })
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return { color: style.color, opacity: style.opacity }
    })
  expect(headingPresentation.color).toBe('rgb(242, 245, 255)')
  expect(headingPresentation.opacity).toBe('1')

  const contrastRatio = await page
    .getByRole('heading', { name: 'Design System gallery' })
    .evaluate((element) => {
      const parse = (color: string) =>
        color
          .match(/\d+(?:\.\d+)?/g)
          ?.slice(0, 3)
          .map(Number) ?? [0, 0, 0]
      const toLinear = (channel: number) => {
        const normalized = channel / 255
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4
      }
      const luminance = (color: string) => {
        const [red, green, blue] = parse(color).map(toLinear)
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue
      }
      const foreground = luminance(getComputedStyle(element).color)
      const background = luminance(
        getComputedStyle(document.documentElement).backgroundColor,
      )
      const lighter = Math.max(foreground, background)
      const darker = Math.min(foreground, background)
      return (lighter + 0.05) / (darker + 0.05)
    })
  expect(contrastRatio).toBeGreaterThan(4.5)
  expect(consoleProblems).toEqual([])
})

test('design system gallery stays inside every required CSS viewport', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await mkdir(evidenceDirectory, { recursive: true })
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
    await page.goto('/design-system', { waitUntil: 'domcontentloaded' })

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.scrollWidth,
      `${viewport.width}x${viewport.height} viewport`,
    ).toBeLessThanOrEqual(dimensions.clientWidth)
    await expect(
      page.getByRole('heading', { name: 'Design System gallery' }),
    ).toBeVisible()

    await page.screenshot({
      path: resolve(evidenceDirectory, `viewport-${viewport.width}.png`),
      fullPage: false,
      scale: 'css',
    })
  }

  await page.screenshot({
    path: resolve(evidenceDirectory, 'full-page.png'),
    fullPage: true,
    scale: 'css',
  })
  expect(consoleProblems).toEqual([])
})

test('design system gallery honors reduced motion and touch target sizing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/design-system')

  const motionOrb = page.getByTestId('motion-orb')
  const animationDuration = await motionOrb.evaluate(
    (element) => getComputedStyle(element).animationDuration,
  )
  const animationName = await motionOrb.evaluate(
    (element) => getComputedStyle(element).animationName,
  )
  const animationSeconds = animationDuration.endsWith('ms')
    ? Number.parseFloat(animationDuration) / 1000
    : Number.parseFloat(animationDuration)
  expect(animationSeconds).toBeLessThanOrEqual(0.00001)
  expect(animationName).toBe('none')

  const nestedBlur = await page
    .locator('.gallery-section .glass-card, .gallery-section .glass-panel')
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).backdropFilter),
    )
  expect(nestedBlur.every((filter) => filter === 'none')).toBe(true)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/design-system')
  await expect(page.getByTestId('motion-orb')).toHaveCSS(
    'animation-name',
    'none',
  )

  const interactiveSizes = await page
    .locator('button, input, textarea, [role="combobox"]')
    .evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect()
        return { height: rect.height, width: rect.width }
      }),
    )
  for (const size of interactiveSizes) {
    expect(size.height).toBeGreaterThanOrEqual(44)
    expect(size.width).toBeGreaterThanOrEqual(44)
  }
})
