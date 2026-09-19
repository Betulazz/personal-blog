import { expect, test } from '@playwright/test'

test('renders a complete public shell with semantic landmarks and identity', async ({
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

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.locator('main#main-content')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(
    page.getByRole('banner').getByRole('link', { name: '夜航手记首页' }),
  ).toBeVisible()
  await expect(page.getByText('一个安静的个人出版空间。')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '跳到主要内容' }),
  ).toHaveAttribute('href', '#main-content')
  await expect(
    page.locator('nav[aria-label="主导航"] a[href="/"]'),
  ).toHaveAttribute('aria-current', 'page')

  const externalLink = page.getByRole('link', { name: 'GitHub' })
  await expect(externalLink).toHaveAttribute('target', '_blank')
  await expect(externalLink).toHaveAttribute('rel', /noopener(?:\s|$)/)
  await expect(externalLink).toHaveAttribute('rel', /noreferrer(?:\s|$)/)

  expect(consoleProblems).toEqual([])
})

test('skip navigation moves keyboard focus to the public main boundary', async ({
  page,
}) => {
  await page.goto('/')

  const skipLink = page.getByRole('link', { name: '跳到主要内容' })
  await skipLink.focus()
  await expect(skipLink).toBeFocused()
  await skipLink.press('Enter')
  await expect(page.locator('main#main-content')).toBeFocused()
})

test('public navigation keeps mobile controls touch-friendly and restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/')

  const menuButton = page.getByRole('button', { name: '打开主导航' })
  await expect(menuButton).toBeEnabled({ timeout: 15_000 })
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false')

  const menuSize = await menuButton.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { height: rect.height, width: rect.width }
  })
  expect(menuSize.height).toBeGreaterThanOrEqual(44)
  expect(menuSize.width).toBeGreaterThanOrEqual(44)

  await menuButton.click()
  await expect(
    page.getByRole('navigation', { name: '移动端主导航' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '关闭主导航' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('navigation', { name: '移动端主导航' }),
  ).toBeHidden()
  await expect(menuButton).toBeFocused()
})
