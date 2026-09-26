import { expect, test, type Locator, type Page } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

const control = 'http://127.0.0.1:8787/__control'
const selectFlows = [
  {
    label: '状态',
    keyboardChoice: '已发布',
    optionCount: 3,
    pointerChoice: '草稿',
    route: '/admin/posts',
  },
  {
    label: '状态',
    keyboardChoice: '进行中',
    optionCount: 3,
    pointerChoice: '开发中',
    route: '/admin/projects/new',
  },
  {
    label: '状态',
    keyboardChoice: '已发布',
    optionCount: 3,
    pointerChoice: '草稿',
    route: '/admin/chatter',
  },
  {
    label: '筛选状态',
    keyboardChoice: '已隐藏',
    optionCount: 3,
    pointerChoice: '公开展示',
    route: '/admin/friends',
  },
  {
    label: '社交链接类型 1',
    keyboardChoice: 'Code',
    optionCount: 2,
    pointerChoice: 'Social',
    route: '/admin/settings',
  },
]

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
  await page.request.get(`${control}/reset`)
})

test('shared administrator selects stay styled, clickable, and keyboard accessible on every owner route', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const hydrationWarnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
    if (/hydration/i.test(message.text()))
      hydrationWarnings.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await login(page)

  for (const viewport of [
    { height: 900, width: 1440 },
    { height: 812, width: 375 },
  ]) {
    await page.setViewportSize(viewport)

    for (const flow of selectFlows) {
      await page.goto(flow.route)
      const trigger = page.getByRole('combobox', { name: flow.label })
      await expect(trigger).toBeVisible()
      const triggerId = await trigger.getAttribute('id')
      expect(triggerId).toBeTruthy()
      const triggerElement = page.locator(`[id="${triggerId}"]`)
      const triggerWidth = await trigger.evaluate(
        (element) => element.getBoundingClientRect().width,
      )

      await trigger.click()
      await expect(triggerElement).toHaveAttribute('aria-expanded', 'true')
      const pointerOption = page.getByRole('option', {
        exact: true,
        name: flow.pointerChoice,
      })
      await expect(pointerOption).toBeVisible()
      await expect(page.getByRole('option')).toHaveCount(flow.optionCount)
      for (const option of await page.getByRole('option').all()) {
        await expect(option).toBeVisible()
      }
      await expectStyledOverlay(pointerOption, triggerWidth)

      if (flow.route === '/admin/posts' && viewport.width === 1440) {
        await captureEvidence(page, 'post-select-menu-desktop.png')
      }
      if (flow.route === '/admin/settings' && viewport.width === 375) {
        await captureEvidence(page, 'site-identity-select-menu-mobile.png')
      }

      await pointerSelect(pointerOption)
      await expect(trigger).toContainText(flow.pointerChoice)
      await expect(triggerElement).toHaveAttribute('aria-expanded', 'false')
      await expect(pointerOption).toBeHidden()

      await trigger.focus()
      await expect(trigger).toBeFocused()
      await trigger.press('Enter')
      await expect(triggerElement).toHaveAttribute('aria-expanded', 'true')
      const keyboardOption = page.getByRole('option', {
        exact: true,
        name: flow.keyboardChoice,
      })
      await expect(keyboardOption).toBeVisible()
      await page.keyboard.press('ArrowDown')
      await expect(keyboardOption).toHaveAttribute('data-highlighted', '')
      await page.keyboard.press('Enter')
      await expect(trigger).toContainText(flow.keyboardChoice)
      await expect(triggerElement).toHaveAttribute('aria-expanded', 'false')
      await expect(keyboardOption).toBeHidden()
      await expect(trigger).toBeFocused()

      await trigger.press('Enter')
      await expect(page.getByRole('option').first()).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(triggerElement).toHaveAttribute('aria-expanded', 'false')
      await expect(page.getByRole('option').first()).toBeHidden()
      await expect(trigger).toBeFocused()
    }
  }

  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
  expect(hydrationWarnings).toEqual([])
})

async function expectStyledOverlay(option: Locator, triggerWidth: number) {
  const styles = await option.evaluate((element) => {
    const overlay = element.closest('.select__content')
    if (!overlay) return null
    const computed = getComputedStyle(overlay)
    const box = overlay.getBoundingClientRect()
    return {
      backgroundColor: computed.backgroundColor,
      backdropFilter: computed.backdropFilter,
      height: box.height,
      pointerEvents: computed.pointerEvents,
      width: box.width,
      zIndex: Number(computed.zIndex),
    }
  })
  expect(
    styles,
    'the portaled menu should receive its shared overlay styles',
  ).not.toBeNull()
  expect(styles!.zIndex).toBeGreaterThan(30)
  expect(styles!.pointerEvents).toBe('auto')
  expect(styles!.backdropFilter).not.toBe('none')
  expect(styles!.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(styles!.height).toBeGreaterThan(0)
  expect(styles!.width).toBeGreaterThanOrEqual(triggerWidth - 0.5)
}

async function pointerSelect(option: Locator) {
  await option.scrollIntoViewIfNeeded()
  await option.click()
}

async function captureEvidence(page: Page, filename: string) {
  const directory = process.env.ADMIN_SELECT_EVIDENCE_DIR
  if (directory) await page.screenshot({ path: `${directory}/${filename}` })
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
