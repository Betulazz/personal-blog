import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page, type TestInfo } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

const apiBase = 'http://127.0.0.1:8787/api/v1'
const control = 'http://127.0.0.1:8787/__control'
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
  await mockFixtureMedia(page)
})

test('administrator manages the About banner and its Media Asset reference', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  const viewport =
    testInfo.project.name === 'mobile-chromium'
      ? { width: 430, height: 932 }
      : { width: 1440, height: 900 }
  await page.setViewportSize(viewport)
  await login(page)
  await page.goto('/admin/about')

  await expect(page.getByRole('heading', { name: '页面横幅' })).toBeVisible()
  await expect(page.locator('#about-banner-focal-x')).toHaveValue('50')
  await expect(page.locator('#about-banner-focal-y')).toHaveValue('50')
  await page.getByRole('button', { name: '从媒体库选择图片' }).click()
  const reusableAsset = page.getByTestId('media-picker-asset').first()
  await expect(reusableAsset).toBeVisible()
  await reusableAsset.click()
  await page.getByRole('button', { name: '插入选中图片' }).click()
  await expect(page.locator('.admin-about-banner-reference')).toContainText(
    '/uploads/images/',
  )
  for (const previewName of [
    'about-banner-preview-desktop',
    'about-banner-preview-mobile',
  ]) {
    const preview = page.getByTestId(previewName)
    await expect(preview).toHaveCSS('background-image', 'none')
    await expect(
      preview.locator('.admin-about-banner-preview__overlay'),
    ).toHaveCount(0)
  }

  await page.getByRole('button', { name: '替换横幅图片' }).click()
  await page.getByLabel('选择要上传的图片').setInputFiles({
    buffer: Buffer.from('not an image'),
    mimeType: 'text/plain',
    name: 'unsupported.txt',
  })
  await expect(
    page.locator('.media-picker__upload-status[role="alert"]'),
  ).toContainText('不支持 text/plain')

  let failUploadOnce = true
  await page.route('**/api/v1/admin/media', async (route) => {
    if (route.request().method() === 'POST' && failUploadOnce) {
      failUploadOnce = false
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'temporary_failure', message: 'mock upload failure' },
        }),
      })
      return
    }
    await route.continue()
  })
  await page.getByLabel('选择要上传的图片').setInputFiles({
    buffer: pngBuffer,
    mimeType: 'image/png',
    name: 'about-banner-fixture.png',
  })
  await expect(
    page.locator('.media-picker__upload-status[role="alert"]'),
  ).toContainText('文件仍保留在当前页面，可以重试')
  await page.getByRole('button', { name: '重试上传' }).click()
  await expect(
    page.getByText('上传成功：about-banner-fixture.png'),
  ).toBeVisible()
  await page.unroute('**/api/v1/admin/media')
  await page.getByRole('button', { name: '插入选中图片' }).click()

  await page.locator('#about-banner-focal-x').evaluate((node) => {
    const input = node as HTMLInputElement
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, '32')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.locator('#about-banner-focal-y').evaluate((node) => {
    const input = node as HTMLInputElement
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, '68')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.locator('#about-banner-focal-x')).toHaveValue('32')
  await expect(page.locator('#about-banner-focal-y')).toHaveValue('68')
  await expect(
    page.locator('[data-testid="about-banner-preview-desktop"] img'),
  ).toHaveCSS('object-position', '32% 68%')
  await expect(
    page.locator('[data-testid="about-banner-preview-mobile"] img'),
  ).toHaveCSS('object-position', '32% 68%')

  let failSettingsSaveOnce = true
  await page.route('**/api/v1/admin/settings', async (route) => {
    if (route.request().method() === 'PATCH' && failSettingsSaveOnce) {
      failSettingsSaveOnce = false
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'temporary_failure', message: 'mock save failure' },
        }),
      })
      return
    }
    await route.continue()
  })
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--error')).toContainText(
    '后台服务暂时无法响应，请稍后重试；当前输入仍然保留。',
  )
  await expect(page.locator('#about-banner-focal-x')).toHaveValue('32')
  await expect(page.locator('#about-banner-focal-y')).toHaveValue('68')
  await expect(page.locator('.admin-about-banner-reference')).toContainText(
    '/uploads/images/',
  )
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--success')).toContainText(
    '关于页面内容已保存',
  )
  await page.unroute('**/api/v1/admin/settings')
  await page.reload()
  await expect(page.locator('#about-banner-focal-x')).toHaveValue('32')
  await expect(page.locator('#about-banner-focal-y')).toHaveValue('68')
  await expect(page.locator('.admin-about-banner-reference')).toContainText(
    '/uploads/images/',
  )
  await expect(page.getByRole('textbox', { name: '故事段落 1' })).toHaveValue(
    '这段内容来自可配置的 About Site Identity。',
  )
  await screenshot(page, testInfo, 'admin-selected')

  const collection = await page.request.get(
    `${apiBase}/admin/media?kind=image&page=1&page_size=8`,
  )
  expect(collection.ok()).toBeTruthy()
  const assets = (await collection.json()).data as Array<{
    id: number
    original_filename: string
    url: string
  }>
  const uploaded = assets.find(
    (asset) => asset.original_filename === 'about-banner-fixture.png',
  )
  expect(uploaded).toBeTruthy()

  await page.goto('/admin/media')
  const mediaCard = page.locator(
    '[data-testid="media-asset-card"][data-media-filename="about-banner-fixture.png"]',
  )
  await mediaCard
    .getByRole('button', { name: '删除 about-banner-fixture.png' })
    .click()
  const deleteDialog = page.getByRole('dialog', {
    name: '删除这个媒体资源？',
  })
  await expect(
    deleteDialog.getByText('网站设置 #1 · 关于页面横幅'),
  ).toBeVisible()
  await expect(
    deleteDialog.getByRole('button', { name: '确认删除' }),
  ).toBeDisabled()
  await screenshot(page, testInfo, 'media-reference-blocked')
  await deleteDialog.getByRole('button', { name: '取消' }).click()

  await page.goto('/about')
  const cover = page.locator('.about-page__cover')
  const bannerImage = cover.locator('.about-page__cover-image')
  await expect(bannerImage).toBeVisible()
  await expect(cover).toHaveCSS('background-image', 'none')
  expect(
    await cover.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    ),
  ).toBe('none')
  await expect(bannerImage).toHaveCSS('object-position', '32% 68%')
  await expect
    .poll(() =>
      bannerImage.evaluate((image: HTMLImageElement) => image.naturalWidth > 0),
    )
    .toBe(true)
  await screenshot(page, testInfo, 'public-selected')

  const failedMediaPattern = '**/uploads/**'
  await page.route(failedMediaPattern, (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  await page.reload()
  await expect(cover.locator('.about-page__cover-image')).toHaveCount(0)
  await expect(cover).toHaveCSS('background-image', /radial-gradient/)
  await screenshot(page, testInfo, 'public-load-fallback')
  await page.unroute(failedMediaPattern)

  await page.goto('/admin/about')
  await page.getByRole('button', { name: '清除横幅图片' }).click()
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--success')).toContainText(
    '关于页面内容已保存',
  )
  await page.reload()
  await expect(
    page.getByRole('button', { name: '清除横幅图片' }),
  ).toBeDisabled()

  await page.goto('/admin/media')
  await mediaCard
    .getByRole('button', { name: '删除 about-banner-fixture.png' })
    .click()
  await expect(
    deleteDialog.getByText('未发现站点内容引用这个资源，可以安全删除。'),
  ).toBeVisible()
  await deleteDialog.getByRole('button', { name: '确认删除' }).click()
  await expect(deleteDialog).toBeHidden()
  await expect(mediaCard).toHaveCount(0)

  await page.goto('/about')
  await expect(page.locator('.about-page__cover-image')).toHaveCount(0)
  await expect(page.locator('.about-page__cover')).toHaveCSS(
    'background-image',
    /radial-gradient/,
  )
})

async function screenshot(page: Page, testInfo: TestInfo, state: string) {
  const evidenceDir = process.env.ABOUT_BANNER_EVIDENCE_DIR
  if (!evidenceDir) {
    throw new Error(
      'ABOUT_BANNER_EVIDENCE_DIR must point outside the repository',
    )
  }
  await mkdir(evidenceDir, { recursive: true })
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Playwright page has no viewport')
  await page.screenshot({
    path: join(
      evidenceDir,
      `mock-${testInfo.project.name}-${state}-${viewport.width}x${viewport.height}.png`,
    ),
    fullPage: false,
    scale: 'css',
  })
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
