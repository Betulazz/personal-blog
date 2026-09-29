import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

const apiBase = 'http://127.0.0.1:8787/api/v1'
const control = 'http://127.0.0.1:8787/__control'

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
  await page.request.get(`${control}/reset`)
})

test('Site Identity social icons persist, render publicly, and protect custom media', async ({
  page,
}, testInfo) => {
  const viewport =
    testInfo.project.name === 'mobile-chromium'
      ? { width: 430, height: 932 }
      : { width: 1440, height: 900 }
  const viewportName =
    testInfo.project.name === 'mobile-chromium' ? 'mobile' : 'desktop'
  const browserRequests: string[] = []
  page.on('request', (request) => browserRequests.push(request.url()))
  await page.setViewportSize(viewport)
  await login(page)

  await page.goto('/admin/settings')
  await expect(page.getByLabel('社交链接名称 1')).toHaveValue('GitHub')
  await expect(page.getByLabel('社交链接名称 2')).toHaveValue('Mastodon')

  const preset = page.getByRole('combobox', { name: '社交链接图标 1' })
  await preset.click()
  await page.getByRole('option', { name: 'GitHub', exact: true }).click()

  await page.getByRole('button', { name: '选择自定义图标 2' }).click()
  const picker = page.getByRole('dialog', { name: '从媒体库插入图片' })
  await expect(picker.getByTestId('media-picker-asset')).toHaveCount(4)
  await picker
    .getByTestId('media-picker-asset')
    .filter({ hasText: 'night-sky.webp' })
    .click()
  await picker.getByRole('button', { name: '插入选中图片' }).click()

  await page.request.get(`${control}/failure?resource=admin`)
  await page.getByRole('button', { name: '保存网站设置' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: '当前输入仍然保留' }).first(),
  ).toBeVisible()
  await expect(preset).toContainText('GitHub')
  await expect(
    page.locator('.admin-social-icon-picker img.site-social-icon'),
  ).toHaveCount(1)

  await page.request.get(`${control}/clear-failures`)
  await page.getByRole('button', { name: '保存网站设置' }).click()
  await expect(page.getByText('设置已保存')).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('combobox', { name: '社交链接图标 1' }),
  ).toContainText('GitHub')
  await expect(
    page.locator('.admin-social-icon-picker img.site-social-icon'),
  ).toHaveCount(1)

  const settingsResponse = await page.request.get(`${apiBase}/admin/settings`)
  expect(settingsResponse.ok()).toBe(true)
  const settings = (await settingsResponse.json()).data
  expect(settings.social_links[0].href).toBe('https://github.com/')
  expect(settings.social_links[0].label).toBe('GitHub')
  expect(settings.social_links[0].icon).toEqual({
    type: 'preset',
    preset: 'github',
  })
  expect(settings.social_links[1].icon).toEqual({
    type: 'media',
    url: '/uploads/images/2026/09/11111111111111111111111111111111.webp',
  })

  const evidenceDir = process.env.SOCIAL_ICONS_EVIDENCE_DIR
  if (evidenceDir) {
    await mkdir(evidenceDir, { recursive: true })
    await page.screenshot({
      fullPage: true,
      path: join(evidenceDir, `mock-social-icons-${viewportName}-admin.png`),
    })
  }

  await page.goto('/')
  const homeLinks = page.locator('[data-homepage-social-links] a')
  await expect(homeLinks).toHaveCount(2)
  await expect(homeLinks.nth(0)).toHaveAttribute('href', 'https://github.com/')
  await expect(homeLinks.nth(0)).toHaveAttribute(
    'aria-label',
    'GitHub（外部链接）',
  )
  await expect(homeLinks.nth(0).locator('svg.site-social-icon')).toBeVisible()
  await expect(
    homeLinks.nth(1).locator('img.site-social-icon'),
  ).toHaveAttribute('alt', '')
  await expect(
    homeLinks.nth(1).locator('img.site-social-icon'),
  ).toHaveAttribute('aria-hidden', 'true')
  await expect(
    page.locator('.site-footer__social a').filter({ hasText: 'GitHub' }),
  ).toHaveCount(1)
  await expect(
    page
      .locator('.site-footer__social a')
      .filter({ hasText: 'Mastodon' })
      .locator('img.site-social-icon'),
  ).toBeVisible()
  const homeResponse = await page.request.get('http://127.0.0.1:3103/')
  expect(await homeResponse.text()).toContain('site-social-icon')
  expect(
    browserRequests.some((url) => url.includes('127.0.0.1:8000/api/v1')),
  ).toBe(false)
  if (evidenceDir) {
    await page.screenshot({
      fullPage: true,
      path: join(evidenceDir, `mock-social-icons-${viewportName}-home.png`),
    })
  }

  await page.goto('/about')
  const aboutLinks = page.locator('.about-page__socials a[target="_blank"]')
  await expect(aboutLinks).toHaveCount(2)
  await expect(aboutLinks.nth(0)).toHaveAttribute('href', 'https://github.com/')
  await expect(aboutLinks.nth(0).locator('svg.site-social-icon')).toBeVisible()
  await expect(aboutLinks.nth(1).locator('img.site-social-icon')).toBeVisible()
  await expect(
    page.locator('.site-footer__social a').filter({ hasText: 'GitHub' }),
  ).toHaveCount(1)
  const aboutResponse = await page.request.get('http://127.0.0.1:3103/about')
  expect(await aboutResponse.text()).toContain('site-social-icon')
  expect(
    browserRequests.some((url) => url.includes('127.0.0.1:8000/api/v1')),
  ).toBe(false)
  if (evidenceDir) {
    await page.screenshot({
      fullPage: true,
      path: join(evidenceDir, `mock-social-icons-${viewportName}-about.png`),
    })
  }

  await login(page)
  await page.goto('/admin/media')
  const nightSky = page
    .getByTestId('media-asset-card')
    .filter({ hasText: 'night-sky.webp' })
  await nightSky.getByRole('button', { name: '删除 night-sky.webp' }).click()
  const deleteDialog = page.getByRole('dialog', { name: '删除这个媒体资源？' })
  await expect(deleteDialog).toContainText('网站设置 #1 · 社交链接图标')
  await expect(
    deleteDialog.getByRole('button', { name: '确认删除' }),
  ).toBeDisabled()
  await deleteDialog.getByRole('button', { name: '取消' }).click()

  expect(
    browserRequests.some((url) => url.includes('127.0.0.1:8787/api/v1')),
  ).toBe(true)
})

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  if (await page.getByLabel('用户名或邮箱').count()) {
    await page.getByLabel('用户名或邮箱').fill('owner')
    await page.getByLabel('密码').fill('a sufficiently long password')
    await page.getByRole('button', { name: '登录后台' }).click()
  }
  await expect(page).toHaveURL(/\/admin(?:\/login)?$/)
}
