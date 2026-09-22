import { expect, test, type Page } from '@playwright/test'

const control = 'http://127.0.0.1:8787/__control'

const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('administrator uploads, browses, and reuses media assets', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await login(page)
  await page.goto('/admin/media')

  await expect(page.getByRole('heading', { name: '媒体管理' })).toBeVisible()
  await expect(page.getByText('单个文件不超过 256 KB')).toBeVisible()
  await expect(
    page.getByText('image/png', { exact: false }).first(),
  ).toBeVisible()
  await expect(page.getByText('共 17 个资源 · 第 1 / 2 页')).toBeVisible()

  const coverCard = cardFor(page, 'night-sky.webp')
  await expect(coverCard.getByText('图片', { exact: true })).toBeVisible()
  await expect(coverCard.getByText('image/webp')).toBeVisible()
  await expect(coverCard.getByText('180 KB')).toBeVisible()
  await expect(coverCard.getByText('1280 × 720')).toBeVisible()
  await expect(coverCard.locator('img')).toBeVisible()
  await expect(
    coverCard.getByText(
      '/uploads/images/2026/09/11111111111111111111111111111111.webp',
    ),
  ).toBeVisible()

  const audioCard = cardFor(page, 'ambient-loop.wav')
  await expect(audioCard.getByText('音频', { exact: true })).toBeVisible()
  await expect(audioCard.locator('audio')).toBeVisible()
  await expect(audioCard.getByText('344 KB')).toBeVisible()

  const missingCard = cardFor(page, 'missing-bytes.webp')
  await expect(
    missingCard.getByText('预览不可用：存储中的文件可能已缺失。'),
  ).toBeVisible()

  await coverCard
    .getByRole('button', { name: '复制引用路径 night-sky.webp' })
    .click()
  await expect(page.getByText('已复制引用路径。')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '/uploads/images/2026/09/11111111111111111111111111111111.webp',
  )

  await coverCard
    .getByRole('button', { name: '复制 URL night-sky.webp' })
    .click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:8787/uploads/images/2026/09/11111111111111111111111111111111.webp',
  )

  await page.getByLabel('选择要上传的媒体文件').setInputFiles({
    buffer: pngBuffer,
    mimeType: 'image/png',
    name: 'new-cover.png',
  })
  await expect(page.getByTestId('media-upload-status')).toContainText(
    '上传成功：new-cover.png 已加入媒体库。',
  )
  const uploadedCard = cardFor(page, 'new-cover.png')
  await expect(uploadedCard).toBeVisible()
  await expect(uploadedCard.getByText('图片', { exact: true })).toBeVisible()
  await expect(page.getByText('共 18 个资源 · 第 1 / 2 页')).toBeVisible()

  await page.getByRole('button', { name: '图片', exact: true }).click()
  await expect(page.getByTestId('media-asset-card')).toHaveCount(5)
  await expect(page.getByText('共 5 个资源 · 第 1 / 1 页')).toBeVisible()
  await page.getByRole('button', { name: '音频', exact: true }).click()
  await expect(page.getByTestId('media-asset-card')).toHaveCount(12)
  await expect(page.getByText('共 13 个资源 · 第 1 / 2 页')).toBeVisible()

  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page.getByTestId('media-asset-card')).toHaveCount(1)
  await expect(page.getByText('第 2 / 2 页', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '上一页' }).click()
  await expect(page.getByText('第 1 / 2 页', { exact: true })).toBeVisible()
})

test('media library shows honest empty states', async ({ page }) => {
  await login(page)
  await page.request.get(`${control}/clear-media`)
  await page.goto('/admin/media')

  await expect(page.getByText('媒体库还是空的')).toBeVisible()
  await expect(page.getByTestId('media-asset-card')).toHaveCount(0)

  await page.getByRole('button', { name: '图片', exact: true }).click()
  await expect(page.getByText('没有图片资源')).toBeVisible()
})

test('upload surfaces progress and keeps the file across failures', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/media')

  await page.route('**/api/v1/admin/media', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    await route.continue()
  })
  await page.getByLabel('选择要上传的媒体文件').setInputFiles({
    buffer: pngBuffer,
    mimeType: 'image/png',
    name: 'slow-upload.png',
  })
  await expect(page.getByTestId('media-upload-progress')).toBeVisible()
  await expect(page.getByTestId('media-upload-status')).toContainText(
    '上传成功：slow-upload.png',
  )
  await page.unroute('**/api/v1/admin/media')

  const fileInput = page.getByLabel('选择要上传的媒体文件')
  await fileInput.setInputFiles({
    buffer: Buffer.from('not-an-image'),
    mimeType: 'image/png',
    name: 'spoofed.png',
  })
  const status = page.getByTestId('media-upload-status')
  await expect(status).toHaveAttribute('role', 'alert')
  await expect(status).toContainText('无法解析这个图片')
  await expect(page.getByRole('button', { name: '重试上传' })).toBeVisible()

  await fileInput.setInputFiles({
    buffer: Buffer.alloc(300 * 1024, 1),
    mimeType: 'image/png',
    name: 'huge.png',
  })
  await expect(status).toContainText('上传上限')
  await expect(page.getByRole('button', { name: '重试上传' })).toHaveCount(0)

  await fileInput.setInputFiles({
    buffer: Buffer.from('%PDF-1.4'),
    mimeType: 'application/pdf',
    name: 'notes.pdf',
  })
  await expect(status).toContainText('不支持')

  await page.request.get(`${control}/failure?resource=admin`)
  await fileInput.setInputFiles({
    buffer: pngBuffer,
    mimeType: 'image/png',
    name: 'retry.png',
  })
  await expect(status).toContainText('后台服务暂时无法响应')
  await expect(page.getByRole('button', { name: '重试上传' })).toBeVisible()

  await page.request.get(`${control}/clear-failures`)
  await page.getByRole('button', { name: '重试上传' }).click()
  await expect(status).toContainText('上传成功：retry.png')

  await page.request.get(`${control}/expire-access`)
  await fileInput.setInputFiles({
    buffer: pngBuffer,
    mimeType: 'image/png',
    name: 'after-refresh.png',
  })
  await expect(status).toContainText('上传成功：after-refresh.png')
  await expect(cardFor(page, 'after-refresh.png')).toBeVisible()
})

test('media deletion reports references and storage divergence honestly', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/media')
  const dialog = page.getByRole('dialog', { name: '删除这个媒体资源？' })

  await cardFor(page, 'post-cover.webp')
    .getByRole('button', { name: '删除 post-cover.webp' })
    .click()
  await expect(dialog.getByText('文章 #1 · cover_url')).toBeVisible()
  await expect(dialog.getByText('删除已被阻止')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '确认删除' })).toBeDisabled()
  await dialog.getByRole('button', { name: '取消' }).click()
  await expect(cardFor(page, 'post-cover.webp')).toBeVisible()

  await cardFor(page, 'missing-bytes.webp')
    .getByRole('button', { name: '删除 missing-bytes.webp' })
    .click()
  await expect(
    dialog.getByText('未发现站点内容引用这个资源，可以安全删除。'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: '确认删除' }).click()
  await expect(dialog.getByText('文件字节已缺失')).toBeVisible()
  await expect(dialog.getByText('元数据仍保留')).toBeVisible()
  await dialog.getByRole('button', { name: '清理元数据' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByText('已清理 missing-bytes.webp 的元数据；文件字节此前已缺失。'),
  ).toBeVisible()
  await expect(cardFor(page, 'missing-bytes.webp')).toHaveCount(0)

  await cardFor(page, 'stale-metadata.png')
    .getByRole('button', { name: '删除 stale-metadata.png' })
    .click()
  await dialog.getByRole('button', { name: '确认删除' }).click()
  await expect(
    dialog.getByText('文件字节已删除，但元数据清理失败'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: '清理元数据' }).click()
  await expect(dialog).toBeHidden()
  await expect(cardFor(page, 'stale-metadata.png')).toHaveCount(0)

  await cardFor(page, 'night-sky.webp')
    .getByRole('button', { name: '删除 night-sky.webp' })
    .click()
  await dialog.getByRole('button', { name: '确认删除' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByText('已删除 night-sky.webp，文件与元数据一并移除。'),
  ).toBeVisible()
  await expect(cardFor(page, 'night-sky.webp')).toHaveCount(0)
  await expect(page.getByText('共 14 个资源')).toBeVisible()
})

test('media library recovers from loading and reference-check failures', async ({
  page,
}) => {
  await login(page)

  await page.route('**/api/v1/admin/media*', async (route) => {
    if (route.request().method() === 'GET') {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
    await route.continue()
  })
  await page.goto('/admin/media')
  await expect(page.getByText('正在读取媒体库…')).toBeVisible()
  await expect(page.getByTestId('media-library')).toBeVisible()
  await page.unroute('**/api/v1/admin/media*')

  await page.request.get(`${control}/failure?resource=admin`)
  await cardFor(page, 'night-sky.webp')
    .getByRole('button', { name: '删除 night-sky.webp' })
    .click()
  const dialog = page.getByRole('dialog', { name: '删除这个媒体资源？' })
  await expect(dialog.getByText('无法检查站点引用，删除已暂停')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '确认删除' })).toBeDisabled()
  await page.request.get(`${control}/clear-failures`)
  await dialog.getByRole('button', { name: '重试检查' }).click()
  await expect(
    dialog.getByText('未发现站点内容引用这个资源，可以安全删除。'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: '取消' }).click()

  await page.request.get(`${control}/failure?resource=admin`)
  await page.goto('/admin/media')
  await expect(
    page.getByText('无法读取上传规则，上传已暂停，媒体库没有变化。'),
  ).toBeVisible()
  await expect(page.getByLabel('选择要上传的媒体文件')).toBeDisabled()
  await expect(
    page.getByText('后台服务暂时无法响应，媒体库没有变化，请稍后重试。'),
  ).toBeVisible()

  await page.request.get(`${control}/clear-failures`)
  await page.getByRole('button', { name: '重新读取上传规则' }).click()
  await expect(page.getByText('单个文件不超过 256 KB')).toBeVisible()
  await expect(page.getByLabel('选择要上传的媒体文件')).toBeEnabled()
  await page.getByRole('button', { name: '重新加载' }).click()
  await expect(page.getByTestId('media-library')).toBeVisible()
})

test('media management is discoverable from site settings', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: '网站设置' })).toBeVisible()
  await page.getByRole('link', { name: '媒体管理' }).click()
  await expect(page).toHaveURL(/\/admin\/media$/)
  await expect(page.getByRole('heading', { name: '媒体管理' })).toBeVisible()
})

test('mobile media administration stays touch-friendly and keyboard usable', async ({
  page,
}) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    const knownNuxtDevWarning =
      text.includes('[NUXT_E4011]') || text.includes('[nostics]')
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !knownNuxtDevWarning &&
      !text.includes('503 (Service Unavailable)')
    ) {
      consoleProblems.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (failure) =>
    consoleProblems.push(`pageerror: ${failure.message}`),
  )

  await page.setViewportSize({ width: 430, height: 932 })
  await login(page)
  await page.goto('/admin/media')
  await expect(page.getByRole('heading', { name: '媒体管理' })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)

  const fileInput = page.getByLabel('选择要上传的媒体文件')
  await fileInput.focus()
  await expect(fileInput).toBeFocused()

  const deleteButton = cardFor(page, 'night-sky.webp').getByRole('button', {
    name: '删除 night-sky.webp',
  })
  await deleteButton.focus()
  await expect(deleteButton).toBeFocused()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: '删除这个媒体资源？' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  expect(consoleProblems).toEqual([])
})

test('media administration fits the declared viewport matrix', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'The desktop project owns the fixed CSS viewport matrix.',
  )
  await login(page)
  const viewports = [
    { height: 812, width: 375 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
  ]
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/admin/media')
    await expect(page.getByRole('heading', { name: '媒体管理' })).toBeVisible()
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.scrollWidth,
      `/admin/media at ${viewport.width}px admin viewport`,
    ).toBeLessThanOrEqual(dimensions.clientWidth)
    if (viewport.width === 430) {
      await page.screenshot({
        path: `test-results/admin-media/${testInfo.project.name}-430-viewport.png`,
        fullPage: false,
        scale: 'css',
      })
    }
    if (viewport.width === 1440) {
      await page.screenshot({
        path: `test-results/admin-media/${testInfo.project.name}-1440-viewport.png`,
        fullPage: false,
        scale: 'css',
      })
    }
  }
})

function cardFor(page: Page, filename: string) {
  return page.locator(
    `[data-testid="media-asset-card"][data-media-filename="${filename}"]`,
  )
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
