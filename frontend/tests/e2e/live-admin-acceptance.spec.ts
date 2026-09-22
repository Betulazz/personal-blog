import { expect, test, type Page } from '@playwright/test'

const login = async (page: Page) => {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test('native administration crosses Nuxt, FastAPI, and MySQL for Post CRUD', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const slug = `live-admin-${Date.now()}`

  await login(page)
  await page.goto('/admin/posts')
  await expect(page.getByText('公开验收从真实内容开始')).toBeVisible()
  await page.getByRole('link', { name: '新建文章' }).click()

  await page.getByLabel('标题', { exact: true }).fill('现场管理端验收文章')
  await page.getByLabel('Slug').fill(slug)
  await page
    .getByLabel('摘要', { exact: true })
    .fill('真实 API 与 MySQL 的 CRUD 验收。')
  await page
    .getByLabel('Markdown 正文')
    .fill('# 真实正文\n\n来自真实 FastAPI 与 MySQL。')

  const categorySelect = page.getByRole('combobox', { name: '分类' })
  await categorySelect.click()
  await page.getByRole('option', { name: '工程实践' }).press('Enter')
  await expect(categorySelect).toContainText('工程实践')

  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
  await expect(
    page.getByRole('heading', { name: '现场管理端验收文章' }),
  ).toBeVisible()

  await page
    .getByLabel('标题', { exact: true })
    .fill('现场管理端验收文章（已编辑）')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(
    page.getByRole('heading', { name: '现场管理端验收文章（已编辑）' }),
  ).toBeVisible()

  await page.getByRole('button', { name: '删除' }).click()
  await page
    .getByRole('dialog', { name: '确认删除这篇文章？' })
    .getByRole('button', { name: '删除文章' })
    .click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
  await expect(page.getByText('现场管理端验收文章（已编辑）')).toHaveCount(0)
})

test('native administration uploads, delivers, and deletes a Media Asset', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const filename = `live-media-${Date.now()}.png`
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )

  await login(page)
  await page.goto('/admin/media')
  await expect(page.getByRole('heading', { name: '媒体管理' })).toBeVisible()
  await expect(page.getByText('单个文件不超过')).toBeVisible()

  await page.getByLabel('选择要上传的媒体文件').setInputFiles({
    buffer: png,
    mimeType: 'image/png',
    name: filename,
  })
  await expect(page.getByTestId('media-upload-status')).toContainText(
    `上传成功：${filename}`,
  )

  const card = page.locator(
    `[data-testid="media-asset-card"][data-media-filename="${filename}"]`,
  )
  await expect(card).toBeVisible()
  await expect(card.getByText('图片', { exact: true })).toBeVisible()
  await expect(card.getByText('image/png')).toBeVisible()

  const reference = await card.locator('code').innerText()
  expect(reference).toMatch(
    /^\/uploads\/images\/\d{4}\/\d{2}\/[0-9a-f]{32}\.png$/,
  )
  const deliveryUrl = `http://127.0.0.1:8000${reference}`
  const delivery = await page.request.get(deliveryUrl)
  expect(delivery.status()).toBe(200)
  expect(delivery.headers()['content-type']).toBe('image/png')

  await card.getByRole('button', { name: `删除 ${filename}` }).click()
  const dialog = page.getByRole('dialog', { name: '删除这个媒体资源？' })
  await expect(
    dialog.getByText('未发现站点内容引用这个资源，可以安全删除。'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: '确认删除' }).click()
  await expect(dialog).toBeHidden()
  await expect(card).toHaveCount(0)
  expect((await page.request.get(deliveryUrl)).status()).toBe(404)
})
