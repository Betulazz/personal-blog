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
