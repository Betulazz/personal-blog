import { expect, test, type Page } from '@playwright/test'

const mockControl = 'http://127.0.0.1:8787/__control'

type MockAdminPost = {
  body: string
  id: number
  published_at: string | null
  slug: string
  status: string
  summary: string
  tag_ids: number[]
  title: string
}

test.beforeEach(async ({ page }) => {
  await page.request.get(`${mockControl}/reset`)
})

test('administrator can create, edit, preview, publish, and unpublish a Post', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/posts')

  await expect(page.getByRole('heading', { name: '文章管理' })).toBeVisible()
  await expect(page.getByText('把复杂的东西，留在安静的地方')).toBeVisible()
  await page.getByRole('link', { name: '新建文章' }).click()

  await page.getByLabel('标题', { exact: true }).fill('一篇新的夜间记录')
  await page.getByLabel('Slug').fill('a-new-night-note')
  await page
    .getByLabel('摘要', { exact: true })
    .fill('一篇经过后台编辑的测试文章。')
  await page
    .getByLabel('Markdown 正文')
    .fill('# 新的正文\n\n这里保留 **Markdown**。')
  await expect(page.getByRole('combobox', { name: '分类' })).toHaveCount(0)
  await expect(page.getByLabel('SEO 标题', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('SEO 描述', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Canonical URL', { exact: true })).toHaveCount(0)
  await expect(
    page.getByLabel('Open Graph 图片 URL', { exact: true }),
  ).toHaveCount(0)

  await page.getByRole('button', { name: '预览' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Markdown 预览' }),
  ).toContainText('新的正文')
  await page.getByRole('button', { name: '关闭Markdown 预览' }).click()

  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
  await expect(
    page.getByRole('heading', { name: '一篇新的夜间记录' }),
  ).toBeVisible()

  await page.getByLabel('标题', { exact: true }).fill('一篇被编辑过的夜间记录')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(
    page.getByRole('heading', { name: '一篇被编辑过的夜间记录' }),
  ).toBeVisible()

  await page.getByRole('button', { name: '发布' }).click()
  await expect(
    page.getByRole('dialog', { name: '确认发布这篇文章？' }),
  ).toBeVisible()
  await page
    .getByRole('dialog', { name: '确认发布这篇文章？' })
    .getByRole('button', { name: '确认发布', exact: true })
    .click()
  await expect(page.getByText('已发布').first()).toBeVisible()

  await page.getByRole('button', { name: '撤回' }).click()
  await page
    .getByRole('dialog', { name: '确认撤回这篇文章？' })
    .getByRole('button', { name: '确认撤回', exact: true })
    .click()
  await expect(page.getByText('草稿').first()).toBeVisible()
})

test('taxonomy management explains references and preserves responsive keyboard paths', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/tags')

  await expect(page.getByRole('heading', { name: '标签管理' })).toBeVisible()
  await expect(page.getByText(/当前有 2 篇内容引用/).first()).toBeVisible()
  const referencedDelete = page.getByRole('button', { name: '删除' }).first()
  await expect(referencedDelete).toBeEnabled()

  await page.getByLabel('标签名称').fill('夜间记录')
  await page.getByLabel('Slug').fill('night-notes')
  await page.getByRole('button', { name: '创建标签' }).click()
  await expect(page.getByText('夜间记录')).toBeVisible()

  await page.setViewportSize({ width: 430, height: 932 })
  const menuButton = page.getByRole('button', { name: '打开后台导航' })
  await menuButton.click()
  await expect(
    page.getByRole('navigation', { name: '移动端后台导航' }),
  ).toBeVisible()
  await page.getByRole('link', { name: '标签' }).click()
  await expect(page).toHaveURL(/\/admin\/tags$/)
  await expect(page.getByRole('heading', { name: '标签管理' })).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})

test('admin resource states preserve input and expose safe recovery paths', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/posts?q=does-not-exist')
  await expect(page.getByText('没有符合筛选条件的文章')).toBeVisible()

  await page.goto('/admin/posts/new')
  await page.getByLabel('标题', { exact: true }).fill('仍然保留的标题')
  await page.getByLabel('Slug').fill('Invalid Slug')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(
    page.getByText('slug 只能使用小写字母、数字和连字符。'),
  ).toBeVisible()
  await expect(page.getByLabel('标题', { exact: true })).toHaveValue(
    '仍然保留的标题',
  )

  await page.getByLabel('Slug').fill('preserved-after-error')
  await page.getByLabel('Markdown 正文').fill('网络失败后仍应保留的正文。')
  await page.request.get(`${mockControl}/failure?resource=admin`)
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.locator('.admin-post-form__error')).toContainText(
    '操作结果暂时无法确认',
  )
  await expect(page.getByTestId('post-write-unknown')).toBeVisible()
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeDisabled()
  await expect(page.getByLabel('标题', { exact: true })).toHaveValue(
    '仍然保留的标题',
  )

  await page.request.get(`${mockControl}/reset`)
  await login(page)
  await page.goto('/admin/posts/999/edit')
  await expect(page.getByRole('alert')).toContainText('已经不存在')
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible()
})

test('admin Post collection stays keyboard reachable across fixed viewports', async ({
  page,
}, testInfo) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    const knownNuxtDevWarning =
      text.includes('[NUXT_E4011]') || text.includes('[nostics]')
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !knownNuxtDevWarning
    ) {
      consoleProblems.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (error) =>
    consoleProblems.push(`pageerror: ${error.message}`),
  )

  await login(page)
  for (const viewport of [
    { height: 812, width: 375 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
  ]) {
    await page.setViewportSize(viewport)
    for (const route of ['/admin/posts', '/admin/posts/new', '/admin/tags']) {
      await page.goto(route)
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(
        dimensions.scrollWidth,
        `${route} at ${viewport.width}px admin viewport`,
      ).toBeLessThanOrEqual(dimensions.clientWidth)

      if (route === '/admin/posts') {
        await page.getByLabel('搜索文章').focus()
        await expect(page.getByLabel('搜索文章')).toBeFocused()
        await page.screenshot({
          path: `test-results/admin-post-taxonomy/${testInfo.project.name}-${viewport.width}-viewport.png`,
          fullPage: false,
          scale: 'css',
        })
        await page.screenshot({
          path: `test-results/admin-post-taxonomy/${testInfo.project.name}-${viewport.width}-full-page.png`,
          fullPage: true,
          scale: 'css',
        })
      } else if (route === '/admin/posts/new') {
        await expect(page.getByLabel('Markdown 正文')).toBeVisible()
      } else {
        await expect(
          page.getByRole('heading', { name: '标签管理' }),
        ).toBeVisible()
      }
    }
  }
  expect(consoleProblems).toEqual([])
})

test('an unused Tag is named in confirmation and disappears after deletion', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/tags')
  await page.getByLabel('标签名称').fill('未使用标签')
  await page.getByLabel('Slug').fill('unused-tag')
  await page.getByRole('button', { name: '创建标签' }).click()

  const row = page.getByRole('listitem').filter({ hasText: '未使用标签' })
  await row.getByRole('button', { name: '删除' }).click()
  const dialog = page.getByRole('dialog', { name: '确认删除这个标签？' })
  await expect(dialog).toContainText('未使用标签')
  await expect(dialog).toContainText('0')
  await dialog.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.locator('.admin-taxonomy-row').filter({ hasText: '未使用标签' }),
  ).toHaveCount(0)

  const adminTags = await page.request.get(
    'http://127.0.0.1:8787/api/v1/admin/tags',
  )
  const publicTags = await page.request.get('http://127.0.0.1:8787/api/v1/tags')
  expect((await adminTags.json()).data).not.toContainEqual(
    expect.objectContaining({ slug: 'unused-tag' }),
  )
  expect((await publicTags.json()).data).not.toContainEqual(
    expect.objectContaining({ slug: 'unused-tag' }),
  )
})

test('a referenced Tag can be cancelled or atomically detached and deleted', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/tags')
  const postsBeforeResponse = await page.request.get(
    'http://127.0.0.1:8787/api/v1/admin/posts?page_size=100',
  )
  expect(postsBeforeResponse.status()).toBe(200)
  const postsBefore = (await postsBeforeResponse.json()).data
  const tagsResponse = await page.request.get(
    'http://127.0.0.1:8787/api/v1/admin/tags',
  )
  const tag = (await tagsResponse.json()).data.find(
    (item: { slug: string }) => item.slug === 'nuxt',
  )
  if (!tag) throw new Error('The Nuxt Tag fixture is missing')
  expect(tag.post_count).toBe(2)

  const row = page.getByRole('listitem').filter({ hasText: 'Nuxt' })
  let deleteRequests = 0
  page.on('request', (request) => {
    if (
      request.method() === 'DELETE' &&
      request.url().includes(`/admin/tags/${tag.id}`)
    ) {
      deleteRequests += 1
    }
  })
  await row.getByRole('button', { name: '删除' }).click()
  const dialog = page.getByRole('dialog', { name: '确认删除这个标签？' })
  await expect(dialog).toContainText('Nuxt')
  await expect(dialog).toContainText('2 篇 Post')
  await expect(dialog).toContainText('发布状态')
  const evidenceDirectory = process.env.TAG_DELETE_EVIDENCE_DIR
  if (evidenceDirectory) {
    await page.screenshot({
      path: `${evidenceDirectory}/referenced-tag-confirmation.png`,
      fullPage: false,
    })
  }
  await dialog.getByRole('button', { name: '取消' }).click()
  await expect(dialog).toBeHidden()
  await expect(row).toBeVisible()
  expect(deleteRequests).toBe(0)

  await row.getByRole('button', { name: '删除' }).click()
  const confirm = page.getByRole('dialog', { name: '确认删除这个标签？' })
  const deletion = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      response.url().includes(`/admin/tags/${tag.id}`),
  )
  await confirm.getByRole('button', { name: '确认删除', exact: true }).click()
  expect((await deletion).status()).toBe(200)
  await expect(confirm).toBeHidden()
  await expect(
    page.locator('.admin-taxonomy-row').filter({ hasText: 'Nuxt' }),
  ).toHaveCount(0)

  const postsAfterResponse = await page.request.get(
    'http://127.0.0.1:8787/api/v1/admin/posts?page_size=100',
  )
  const postsAfter = (await postsAfterResponse.json()).data
  expect(postsAfter).toHaveLength(postsBefore.length)
  const preservedPostData = (post: MockAdminPost) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    body: post.body,
    status: post.status,
    published_at: post.published_at,
    tag_ids: post.tag_ids.filter((id) => id !== tag.id),
  })
  expect(postsAfter.map(preservedPostData)).toEqual(
    postsBefore.map(preservedPostData),
  )
  expect(
    postsAfter.every(
      (post: { tag_ids: number[] }) => !post.tag_ids.includes(tag.id),
    ),
  ).toBe(true)
})

test('a failed Tag deletion keeps its confirmation open and offers retry', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/tags')
  const tagsResponse = await page.request.get(
    'http://127.0.0.1:8787/api/v1/admin/tags',
  )
  const tag = (await tagsResponse.json()).data.find(
    (item: { slug: string }) => item.slug === 'nuxt',
  )
  if (!tag) throw new Error('The Nuxt Tag fixture is missing')
  const row = page.getByRole('listitem').filter({ hasText: 'Nuxt' })
  await row.getByRole('button', { name: '删除' }).click()
  const dialog = page.getByRole('dialog', { name: '确认删除这个标签？' })
  await expect(dialog).toContainText('2 篇 Post')
  await page.request.get(`${mockControl}/failure?resource=admin`)
  await dialog.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toContainText('重试')

  await page.request.get(`${mockControl}/clear-failures`)
  const retainedTags = await page.request.get(
    'http://127.0.0.1:8787/api/v1/admin/tags',
  )
  expect((await retainedTags.json()).data).toContainEqual(
    expect.objectContaining({ id: tag.id, slug: 'nuxt' }),
  )
  const retainedPosts = await page.request.get(
    'http://127.0.0.1:8787/api/v1/admin/posts?page_size=100',
  )
  expect(
    (await retainedPosts.json()).data.filter((post: MockAdminPost) =>
      post.tag_ids.includes(tag.id),
    ),
  ).toHaveLength(2)
  await dialog.getByRole('button', { name: '重试删除' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.locator('.admin-taxonomy-row').filter({ hasText: 'Nuxt' }),
  ).toHaveCount(0)
})

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
