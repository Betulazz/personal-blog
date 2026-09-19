import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/__acceptance/interaction-primitives')
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible()
})

test('form controls expose labels, values and keyboard selection', async ({
  page,
}) => {
  await expect(page).toHaveTitle('Interaction primitives acceptance')
  await page.getByLabel('显示名称').fill('星野')
  await expect(page.getByLabel('显示名称')).toHaveValue('星野')

  await page.getByLabel('默认分类').press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('默认分类')).toContainText('前端开发')

  const loadingButton = page.getByRole('button', { name: '正在保存' })
  await expect(loadingButton).toBeDisabled()
  await expect(loadingButton).toHaveAttribute('aria-busy', 'true')
})

test('dialog traps focus, closes with Escape and restores the trigger', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: '打开对话框' })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: '发布确认' })).toBeVisible()
  await expect(page.getByRole('button', { name: '关闭发布确认' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '发布确认' })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('sheet and dropdown remain usable at a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: '打开侧边栏' }).click()
  const sheet = page.getByRole('dialog', { name: '移动端目录' })
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('第一章 · 设计基础')
  await page.getByRole('button', { name: '关闭移动端目录' }).click()

  await page.getByRole('button', { name: '更多操作' }).click()
  await page.getByRole('menuitem', { name: '归档文章' }).click()
  await expect(page.getByText('archive')).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})

test('tooltip is available from keyboard focus', async ({ page }) => {
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(page.getByRole('button', { name: '悬停提示' })).toBeFocused()
  await expect(
    page
      .getByText('保存前会检查必填字段', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible()
})

test('shared motion tokens collapse for reduced-motion users', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const duration = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--motion-duration-normal')
      .trim(),
  )
  expect(duration).toBe('0.01ms')
})
