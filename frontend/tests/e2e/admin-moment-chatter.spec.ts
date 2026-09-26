import { expect, test, type Page } from '@playwright/test'

const control = 'http://127.0.0.1:8787/__control'

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('retired authoring redirects and body-only Chatter supports ordered images', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/moments/new')
  await expect(page).toHaveURL('/admin/chatter')
  await page.goto('/admin/chatter/new')
  await expect(page.getByLabel('引言')).toHaveCount(0)
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByLabel('正文', { exact: true }).fill('只有正文也能发布')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/chatter\/\d+\/edit$/)
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await page.getByRole('button', { name: '确认发布', exact: true }).click()
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()
  for (const name of ['first', 'second']) {
    await page.getByRole('button', { name: '添加图片' }).click()
    await page
      .getByLabel('图片地址', { exact: true })
      .last()
      .fill(`/uploads/${name}.webp`)
    await page.getByLabel('图片说明', { exact: true }).last().fill(name)
  }
  await page.getByRole('button', { name: '上移图片 2' }).click()
  await expect(
    page.getByLabel('图片地址', { exact: true }).first(),
  ).toHaveValue('/uploads/second.webp')
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/admin/chatter/'),
  )
  await page.getByRole('button', { name: '保存修改' }).click()
  const response = await saved
  expect(response.request().postDataJSON()).toMatchObject({
    title: null,
    images: [{ src: '/uploads/second.webp' }, { src: '/uploads/first.webp' }],
  })
  expect(response.request().postDataJSON()).not.toHaveProperty('tag_ids')
  expect(response.request().postDataJSON()).not.toHaveProperty('lead')
  await page.reload()
  await expect(
    page.getByLabel('图片地址', { exact: true }).first(),
  ).toHaveValue('/uploads/second.webp')
  await page.getByRole('button', { name: '移除图片 2' }).click()
  await expect(page.getByLabel('图片地址', { exact: true })).toHaveCount(1)
  await page.goto('/admin/categories')
  await expect(page).toHaveURL('/admin/posts')
})
