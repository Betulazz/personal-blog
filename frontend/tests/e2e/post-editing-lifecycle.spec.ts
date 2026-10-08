import { expect, test, type Page } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { mockFixtureMedia } from './support/fixture-media'

const apiBase = 'http://127.0.0.1:8787/api/v1'
const key = 'admin-post-draft:v1:2'
const title = (page: Page) => page.getByLabel('标题', { exact: true })
const editor = (page: Page) => page.getByLabel('Markdown 正文')
test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
  await page.request.get('http://127.0.0.1:8787/__control/reset')
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  const csrf = await page.request.get(`${apiBase}/auth/csrf`)
  const token = (await csrf.json()).data.token as string
  // The default Post deliberately contains a missing image for reader tests.
  // This editing flow uses a valid body so console failures remain actionable.
  const patched = await page.request.patch(`${apiBase}/admin/posts/2`, {
    data: { body: '# 编辑流程正文' },
    headers: { 'X-CSRF-Token': token },
  })
  expect(patched.ok()).toBe(true)
})
const ready = async (page: Page, path = '/admin/posts/2/edit') => {
  await page.goto(path)
  await expect(
    page.locator('[data-markdown-editor-ready="true"]'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeEnabled()
}
const readPost = async (page: Page) => {
  const response = await page.request.get(`${apiBase}/admin/posts/2`)
  return (await response.json()).data as {
    title: string
    body: string
    status: string
  }
}
const backup = (page: Page) =>
  page.evaluate((draftKey) => sessionStorage.getItem(draftKey), key)

test('saving locks all fields and blocks navigation until the response settles', async ({
  page,
}, testInfo) => {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (
      ['error', 'warning'].includes(message.type()) &&
      !message.text().includes('[NUXT_E4011]') &&
      !message.text().includes('[nostics]')
    )
      problems.push(`${message.text()} (${message.location().url})`)
  })
  await ready(page)
  await expect(page).toHaveTitle('编辑文章 · 后台空间')
  await title(page).fill('等待保存的标题')
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/admin/posts/2', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue()
    await gate
    await route.continue()
  })
  await page.getByRole('button', { name: '保存草稿' }).click()
  for (const label of ['标题', 'Slug', '摘要', '封面 URL', '封面替代文本'])
    await expect(page.getByLabel(label, { exact: true })).toBeDisabled()
  for (const checkbox of await page
    .locator('.admin-post-form input[type="checkbox"]')
    .all())
    await expect(checkbox).toBeDisabled()
  await expect(editor(page)).toHaveAttribute('contenteditable', 'false')
  await expect(
    page.getByRole('button', { name: '预览', exact: true }),
  ).toBeDisabled()
  await page.getByRole('link', { name: '← 返回文章管理' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/2\/edit$/)
  await expect(
    page.getByText('操作正在进行，请等待操作结束后再离开。'),
  ).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: join(tmpdir(), `post-editor-locked-${testInfo.project.name}.png`),
    fullPage: false,
  })
  release()
  await expect(title(page)).toBeEnabled()
  await expect(page.getByText('有未保存的更改')).toHaveCount(0)
  expect((await readPost(page)).title).toBe('等待保存的标题')
  expect(await backup(page)).toBeNull()
  expect(problems).toEqual([])
})

test('unpublish keeps unsaved content, and publish requires saving it first', async ({
  page,
}) => {
  await ready(page)
  await title(page).fill('尚未保存的标题')
  await editor(page).fill('尚未保存的新正文')
  await page.getByRole('button', { name: '撤回', exact: true }).click()
  await page
    .getByRole('dialog', { name: '确认撤回这篇文章？' })
    .getByRole('button', { name: '确认撤回', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '发布', exact: true }),
  ).toBeEnabled()
  await expect(title(page)).toHaveValue('尚未保存的标题')
  await expect(editor(page)).toContainText('尚未保存的新正文')
  await expect(page.getByText('有未保存的更改')).toBeVisible()
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await expect(page.getByText('有未保存的更改，请先保存再发布。')).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: '确认发布这篇文章？' }),
  ).toHaveCount(0)
  expect((await readPost(page)).status).toBe('draft')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByText('有未保存的更改')).toHaveCount(0)
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await page
    .getByRole('dialog', { name: '确认发布这篇文章？' })
    .getByRole('button', { name: '确认发布', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '撤回', exact: true }),
  ).toBeEnabled()
  const saved = await readPost(page)
  expect(saved.title).toBe('尚未保存的标题')
  expect(saved.body).toContain('尚未保存的新正文')
  expect(saved.status).toBe('published')
})

test('leave offers stay, retain and discard, with immediate backup and no resurrection', async ({
  page,
}, testInfo) => {
  await ready(page)
  await title(page).fill('可以恢复的标题')
  await page.getByRole('link', { name: '← 返回文章管理' }).click()
  const leaving = page.getByRole('dialog', { name: '离开编辑器？' })
  await expect(leaving.getByRole('button', { name: '继续编辑' })).toBeVisible()
  await leaving.getByRole('button', { name: '继续编辑' }).click()
  await expect(title(page)).toHaveValue('可以恢复的标题')
  await page.getByRole('link', { name: '← 返回文章管理' }).click()
  await leaving.getByRole('button', { name: '保留备份并离开' }).click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
  expect(await backup(page)).toContain('可以恢复的标题')
  await page.goto('/admin/posts/2/edit')
  const recovery = page.getByRole('dialog', { name: '发现未保存的草稿' })
  await expect(recovery).toBeVisible()
  await page.screenshot({
    path: join(tmpdir(), `post-editor-recovery-${testInfo.project.name}.png`),
    fullPage: false,
  })
  await recovery.getByRole('button', { name: '恢复草稿' }).click()
  await expect(title(page)).toHaveValue('可以恢复的标题')
  await title(page).fill('需要丢弃的最新标题')
  await page.getByRole('link', { name: '← 返回文章管理' }).click()
  await leaving.getByRole('button', { name: '放弃更改并离开' }).click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
  expect(await backup(page)).toBeNull()
  await page.goto('/admin/posts/2/edit')
  await expect(
    page.locator('[data-markdown-editor-ready="true"]'),
  ).toBeVisible()
  await expect(recovery).toHaveCount(0)
  await expect(title(page)).not.toHaveValue('需要丢弃的最新标题')
  expect(await backup(page)).toBeNull()
})

test('lost save response retains uncertainty after editing and reload, then reconciles without retry', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await ready(page)
  let writes = 0
  await page.route('**/api/v1/admin/posts/2', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue()
    writes += 1
    await route.fetch()
    await route.abort('failed')
  })
  await title(page).fill('服务器已保存的标题')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByTestId('post-write-unknown')).toBeVisible()
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeDisabled()
  await title(page).fill('断网后继续编辑的标题')
  await page.reload()
  const recovery = page.getByRole('dialog', { name: '发现未保存的草稿' })
  await recovery.getByRole('button', { name: '恢复草稿' }).click()
  await expect(title(page)).toHaveValue('断网后继续编辑的标题')
  await expect(page.getByTestId('post-write-unknown')).toBeVisible()
  await page
    .getByRole('button', { name: '核对服务器结果', exact: true })
    .click()
  await expect(page.getByTestId('post-write-unknown')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeEnabled()
  await expect(title(page)).toHaveValue('断网后继续编辑的标题')
  await expect(page.getByText('有未保存的更改')).toBeVisible()
  expect(writes).toBe(1)
  expect(pageErrors).toEqual([])
})

test('lost creation response is reconciled to the created Post instead of creating another', async ({
  page,
}) => {
  await ready(page, '/admin/posts/new')
  await title(page).fill('新建结果核对')
  await page.getByLabel('Slug', { exact: true }).fill('creation-reconciliation')
  await editor(page).fill('新建正文')
  let writes = 0
  await page.route('**/api/v1/admin/posts', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    writes += 1
    await route.fetch()
    await route.abort('failed')
  })
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByTestId('post-write-unknown')).toBeVisible()
  await page
    .getByRole('button', { name: '核对服务器结果', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
  await expect(title(page)).toHaveValue('新建结果核对')
  await expect(page.getByTestId('post-write-unknown')).toHaveCount(0)
  expect(writes).toBe(1)
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem('admin-post-draft:v1:new'),
    ),
  ).toBeNull()
})

test('refresh immediately after editing retains the latest input', async ({
  page,
}) => {
  await ready(page)
  await title(page).fill('刷新前的最后一个字符')
  await page.reload()
  await page
    .getByRole('dialog', { name: '发现未保存的草稿' })
    .getByRole('button', { name: '恢复草稿' })
    .click()
  await expect(title(page)).toHaveValue('刷新前的最后一个字符')
  await expect(page.getByText('有未保存的更改')).toBeVisible()
})
