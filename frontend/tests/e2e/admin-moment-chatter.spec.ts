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

test('Moment has an independent chronological editing and publication workflow', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/moments')
  await expect(page.getByRole('heading', { name: 'Moment 管理' })).toBeVisible()
  await page.getByRole('link', { name: '新建 Moment' }).click()
  await expect(page.getByLabel('标题', { exact: true })).toHaveCount(0)
  await page.getByLabel('正文', { exact: true }).fill('雨停之后的散步')
  await page.getByLabel('地点').fill('江边')
  await page.getByLabel('心情').fill('轻松')
  await page.getByRole('button', { name: '添加图片' }).click()
  await page.getByLabel('图片地址').fill('/uploads/walk.webp')
  await page.getByLabel('图片说明').fill('雨后的江边')
  await page.getByLabel('宽度').fill('800')
  await page.getByLabel('高度').fill('600')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/moments\/\d+\/edit$/)
  await expect(page.getByLabel('地点')).toHaveValue('江边')
  await page
    .getByLabel('正文', { exact: true })
    .fill('雨停之后的散步，晚风很凉')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByText('已保存', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await page.getByRole('button', { name: '确认发布', exact: true }).click()
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '撤回', exact: true }).click()
  await page.getByRole('button', { name: '确认撤回', exact: true }).click()
  await expect(page.getByText('草稿', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue(
    '雨停之后的散步，晚风很凉',
  )
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/moments$/)
  await expect(page.getByText('雨停之后的散步，晚风很凉')).toHaveCount(0)
})

test('Chatter has an independent composed editing workflow', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/chatter')
  await expect(
    page.getByRole('heading', { name: 'Chatter 管理' }),
  ).toBeVisible()
  await page.getByRole('link', { name: '新建 Chatter' }).click()
  await expect(page.getByLabel('地点')).toHaveCount(0)
  await page.getByLabel('标题').fill('一条独立的 Chatter')
  await page.getByLabel('引言').fill('把短记录写得完整。')
  await page
    .getByLabel('正文')
    .fill('Chatter 不应该被当成 Moment 的另一种写法。')
  await page.getByLabel('心情').fill('清醒')
  await page.getByRole('checkbox', { name: 'Accessibility' }).check()
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/chatter\/\d+\/edit$/)
  await expect(
    page.getByRole('heading', { name: '编辑 Chatter' }),
  ).toBeVisible()

  await page.getByLabel('正文').fill('Chatter 保持自己的标题、引言和正文边界。')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByText('已保存', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await page.getByRole('button', { name: '确认发布', exact: true }).click()
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()

  await page.goto('/admin/chatter?q=独立')
  await expect(page.getByText('一条独立的 Chatter')).toBeVisible()
  await page.getByRole('link', { name: /一条独立的 Chatter/ }).click()
  await page.getByRole('button', { name: '撤回', exact: true }).click()
  await page.getByRole('button', { name: '确认撤回', exact: true }).click()
  await expect(page.getByText('草稿', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/chatter$/)
  await expect(page.getByText('一条独立的 Chatter')).toHaveCount(0)
})
