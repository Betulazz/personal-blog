import { expect, test, type Page, type TestInfo } from '@playwright/test'

const backendOrigin = 'http://127.0.0.1:8000'
const apiBase = `${backendOrigin}/api/v1`

const seededMissingMediaPaths = [
  '/uploads/live-acceptance/missing-markdown.webp',
  '/uploads/live-acceptance/missing-moment.webp',
  '/uploads/live-acceptance/missing-audio.mp3',
  '/uploads/live-acceptance/missing-audio-2.mp3',
]

const login = async (page: Page) => {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

const csrfToken = async (page: Page) => {
  const response = await page.request.get(`${apiBase}/auth/csrf`)
  expect(response.status()).toBe(200)
  return (await response.json()).data.token as string
}

type AdminPostApiPayload = {
  body: string
  category_id: number
  slug: string
  summary: string
  title: string
}

const createPostThroughApi = async (page: Page, input: AdminPostApiPayload) => {
  const token = await csrfToken(page)
  const response = await page.request.post(`${apiBase}/admin/posts`, {
    data: input,
    headers: { 'X-CSRF-Token': token },
  })
  expect(response.status()).toBe(201)
  return (await response.json()).data as { id: number; slug: string }
}

const collectBrowserProblems = (page: Page) => {
  const problems: Array<{ message: string; url: string }> = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push({
        message: `${message.type()}: ${message.text()}`,
        url: message.location().url,
      })
    }
  })
  page.on('pageerror', (error) => {
    problems.push({ message: `pageerror: ${error.message}`, url: '' })
  })
  page.on('requestfailed', (request) => {
    problems.push({
      message: `requestfailed: ${request.failure()?.errorText ?? 'unknown'}`,
      url: request.url(),
    })
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push({
        message: `response: ${response.status()} ${response.statusText()}`,
        url: response.url(),
      })
    }
  })
  return problems
}

// Seeded live content intentionally points at removed media; those recoverable
// 404s are part of the modelled experience rather than acceptance failures.
// Nuxt dev-mode diagnostics are also filtered so real application problems stay visible.
const unexpectedProblems = (
  problems: Array<{ message: string; url: string }>,
) =>
  problems.filter(({ message, url }) => {
    if (seededMissingMediaPaths.some((path) => url.endsWith(path))) {
      return false
    }
    return !(
      message.includes('[NUXT_E4011]') ||
      message.includes('[nostics]') ||
      message.includes('import.meta.hot.send()')
    )
  })

const assertNoHorizontalOverflow = async (page: Page, route: string) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(
    dimensions.scrollWidth,
    `${route}: ${dimensions.scrollWidth}px exceeds ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth)
}

const capture = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
  width: number,
) => {
  const prefix = `test-results/live-admin-workflow-acceptance/${testInfo.project.name}-${name}-${width}`
  await page.screenshot({ path: `${prefix}-viewport.png`, scale: 'css' })
  await page.screenshot({
    path: `${prefix}-full-page.png`,
    fullPage: true,
    scale: 'css',
  })
}

test('administrator session survives an invalid access credential and ends at logout', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000)
  await login(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  const cookies = await context.cookies()
  const accessCookie = cookies.find((cookie) => cookie.name === 'access_token')
  const refreshCookie = cookies.find(
    (cookie) => cookie.name === 'refresh_token',
  )
  const csrfCookie = cookies.find((cookie) => cookie.name === 'csrf_token')
  expect(accessCookie?.httpOnly).toBe(true)
  expect(refreshCookie?.httpOnly).toBe(true)
  expect(csrfCookie?.httpOnly).toBe(false)

  const webStorage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  )
  expect(webStorage).not.toMatch(/access_token|refresh_token|Bearer/)

  // Break the access credential but keep the rotated refresh credential usable.
  await context.addCookies([
    {
      domain: accessCookie!.domain,
      httpOnly: accessCookie!.httpOnly,
      name: accessCookie!.name,
      path: accessCookie!.path,
      sameSite: accessCookie!.sameSite,
      secure: accessCookie!.secure,
      value: 'live-acceptance-invalid-access-token',
    },
  ])
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'access_token')
      ?.value,
  ).toBe('live-acceptance-invalid-access-token')

  await page.goto('/admin/posts')
  await expect(page.getByRole('heading', { name: '文章管理' })).toBeVisible()
  // Recovery is only possible if the refresh endpoint issued a new access cookie.
  await expect
    .poll(
      async () =>
        (await context.cookies()).find(
          (cookie) => cookie.name === 'access_token',
        )?.value,
    )
    .not.toBe('live-acceptance-invalid-access-token')

  await page.getByRole('button', { name: '退出后台' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect
    .poll(async () =>
      (await context.cookies()).some(
        (cookie) => cookie.name === 'access_token',
      ),
    )
    .toBe(false)
  expect(
    (await context.cookies()).some((cookie) => cookie.name === 'refresh_token'),
  ).toBe(false)

  // An expired session is redirected to login with the destination preserved.
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login\?redirect=/)
  await expect(page.getByRole('heading', { name: '进入后台' })).toBeVisible()
  await expect(page.getByLabel('用户名或邮箱')).toBeVisible()

  const unauthorized = await page.request.get(`${apiBase}/admin/dashboard`)
  expect(unauthorized.status()).toBe(401)
  expect((await unauthorized.json()).error.code).toBe('authentication_required')
})

test('Post creation, editing, and publishing reach public readers with recoverable conflicts', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const token = `live-workflow-${Date.now()}`
  const title = `现场工作流验收文章 ${token}`
  const body = `现场工作流验收正文 ${token}。`

  await login(page)

  await page.goto('/admin/posts/new')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByText('请输入文章标题。')).toBeVisible()
  await expect(page.getByText('请输入公开 slug。')).toBeVisible()
  await page.getByLabel('标题', { exact: true }).fill(title)
  await page.getByLabel('Slug').fill('Bad Slug')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(
    page.getByText('slug 只能使用小写字母、数字和连字符。'),
  ).toBeVisible()
  await page.getByLabel('Slug').fill('live-acceptance-begins-with-content')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(
    page.getByText('这个 slug 已经被其他文章使用，请换一个。'),
  ).toBeVisible()

  await page.getByLabel('Slug').fill(token)
  await page.getByLabel('摘要', { exact: true }).fill('现场工作流验收摘要。')
  await page.getByLabel('Markdown 正文').fill(body)
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
  const editorUrl = new URL(page.url()).pathname

  await page.getByRole('button', { name: '发布' }).click()
  await page
    .getByRole('dialog', { name: '确认发布这篇文章？' })
    .getByRole('button', { name: '确认发布', exact: true })
    .click()
  await expect(page.getByText('发布前请先选择一个分类。')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Markdown 正文')).toContainText(body)

  const categorySelect = page.getByRole('combobox', { name: '分类' })
  await categorySelect.click()
  await page.getByRole('option', { name: '现场验收' }).press('Enter')
  await expect(categorySelect).toContainText('现场验收')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeEnabled()

  await page.getByRole('button', { name: '发布' }).click()
  await page
    .getByRole('dialog', { name: '确认发布这篇文章？' })
    .getByRole('button', { name: '确认发布', exact: true })
    .click()
  await expect(page.getByRole('button', { name: '撤回' })).toBeVisible()

  const publicPost = await page.goto(`/posts/${token}`)
  expect(publicPost?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.locator('article').getByText(body)).toBeVisible()

  await page.goto('/posts')
  await expect(
    page.locator('.post-card').filter({ hasText: title }),
  ).toBeVisible()

  await page.goto(editorUrl)
  await page.getByRole('button', { name: '撤回' }).click()
  await page
    .getByRole('dialog', { name: '确认撤回这篇文章？' })
    .getByRole('button', { name: '确认撤回', exact: true })
    .click()
  await expect(page.getByRole('button', { name: '发布' })).toBeVisible()

  await page.goto(`/posts/${token}`)
  await expect(page.getByText('没有找到这篇文章')).toBeVisible()
  await page.goto('/posts')
  await expect(
    page.locator('.post-card').filter({ hasText: title }),
  ).toHaveCount(0)

  await page.goto(editorUrl)
  await page.getByRole('button', { name: '删除' }).click()
  await page
    .getByRole('dialog', { name: '确认删除这篇文章？' })
    .getByRole('button', { name: '删除文章', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
  await expect(
    page.locator('.admin-post-row').filter({ hasText: title }),
  ).toHaveCount(0)

  await page.goto('/admin/posts/999999999/edit')
  await expect(page.getByText('没有找到这篇文章')).toBeVisible()
})

test('an expired session keeps unsaved Post work recoverable after re-login', async ({
  page,
  context,
}) => {
  test.setTimeout(180_000)
  const title = `现场工作流验收草稿 ${Date.now()}`
  const slug = `live-workflow-draft-${Date.now()}`

  await login(page)
  await page.goto('/admin/posts/new')
  await page.getByLabel('标题', { exact: true }).fill(title)
  await page.getByLabel('Slug').fill(slug)
  await expect(page.getByText('有未保存的更改')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(window.sessionStorage).some((key) =>
          key.startsWith('admin-post-draft:'),
        ),
      ),
    )
    .toBe(true)

  // Lose both credentials; saving must redirect to login without losing the draft.
  await context.clearCookies()
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByRole('heading', { name: '进入后台' })).toBeVisible()

  await login(page)
  await page.goto('/admin/posts/new')
  const recovery = page.getByRole('dialog', { name: '发现未保存的草稿' })
  await expect(recovery).toBeVisible()
  await recovery.getByRole('button', { name: '恢复草稿' }).click()
  await expect(page.getByLabel('标题', { exact: true })).toHaveValue(title)

  // Discard the recovered draft so no unfinished work remains.
  await page.getByRole('link', { name: /返回文章管理/ }).click()
  await page
    .getByRole('dialog', { name: '离开编辑器？' })
    .getByRole('button', { name: '放弃更改并离开' })
    .click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
})

test('Markdown loaded into the editor survives a save and reaches public rendering', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const token = `live-workflow-md-${Date.now()}`
  const title = `现场工作流验收 Markdown ${token}`
  const markdown = [
    '## 现场正文',
    '',
    '来自真实 Nuxt、FastAPI 与 MySQL 的编辑链路。霓虹 🚀',
    '',
    '> 引用块验证段落。',
    '',
    '```ts',
    'const answer = 42',
    '```',
    '',
    '| 能力 | 结果 |',
    '| --- | --- |',
    '| 表格 | 保留 |',
    '',
    '行内数学 $x^2$ 保持在段落中。',
  ].join('\n')

  await login(page)

  const categoriesResponse = await page.request.get(
    `${apiBase}/admin/categories`,
  )
  expect(categoriesResponse.status()).toBe(200)
  const categories = (await categoriesResponse.json()).data as Array<{
    id: number
    slug: string
  }>
  const categoryId = categories.find(
    (category) => category.slug === 'live-acceptance',
  )!.id

  const created = await createPostThroughApi(page, {
    body: markdown,
    category_id: categoryId,
    slug: token,
    summary: '现场工作流验收 Markdown 保留。',
    title,
  })

  await page.goto(`/admin/posts/${created.id}/edit`)
  const editor = page.getByLabel('Markdown 正文')
  await expect(editor).toContainText('现场正文')
  await expect(editor).toContainText('const answer = 42')
  await expect(editor).toContainText('表格')
  await expect(editor).toContainText('霓虹 🚀')
  await expect(editor).toContainText('行内数学 $x^2$')

  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeEnabled()

  const storedResponse = await page.request.get(
    `${apiBase}/admin/posts/${created.id}`,
  )
  expect(storedResponse.status()).toBe(200)
  const storedBody = (await storedResponse.json()).data.body as string
  expect(storedBody).toContain('## 现场正文')
  expect(storedBody).toContain('```ts')
  expect(storedBody).toContain('const answer = 42')
  expect(storedBody).toContain('> 引用块验证段落。')
  expect(storedBody).toMatch(/\| 能力\s+\| 结果\s+\|/)
  expect(storedBody).toMatch(/\| 表格\s+\| 保留\s+\|/)
  expect(storedBody).toContain('霓虹 🚀')
  expect(storedBody).toContain('$x^2$')

  await page.getByRole('button', { name: '发布' }).click()
  await page
    .getByRole('dialog', { name: '确认发布这篇文章？' })
    .getByRole('button', { name: '确认发布', exact: true })
    .click()
  await expect(page.getByRole('button', { name: '撤回' })).toBeVisible()

  await page.goto(`/posts/${token}`)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('heading', { name: '现场正文' })).toBeVisible()
  await expect(
    page.locator('pre').filter({ hasText: 'const answer = 42' }),
  ).toBeVisible()
  await expect(page.locator('blockquote')).toContainText('引用块验证段落。')
  await expect(page.locator('table')).toContainText('保留')
  await expect(page.locator('article').getByText(/霓虹/).first()).toBeVisible()
  await expect(
    page
      .locator('article')
      .getByText(/行内数学/)
      .first(),
  ).toBeVisible()
  await expect(page.locator('.katex').first()).toBeVisible()

  await page.goto(`/admin/posts/${created.id}/edit`)
  await page.getByRole('button', { name: '删除' }).click()
  await page
    .getByRole('dialog', { name: '确认删除这篇文章？' })
    .getByRole('button', { name: '删除文章', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
})

test('Moment and Chatter publishing reach their public feeds independently', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const problems = collectBrowserProblems(page)
  const token = `${Date.now()}`
  const momentBody = `现场工作流验收 Moment ${token}：真实数据抵达公开动态流。`
  const chatterTitle = `现场工作流验收 Chatter ${token}`
  const chatterBody = `现场工作流验收 Chatter 正文 ${token}：短篇记录也能被公开浏览。`

  await login(page)

  await page.goto('/admin/moments/new')
  await page.getByLabel('正文').fill(momentBody)
  await page.getByRole('button', { name: '添加图片' }).click()
  await page.getByLabel('图片地址').fill('not-a-valid-image-source')
  await page.getByLabel('图片说明').fill('验收图片')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(
    page.getByText('请填写有效的图片地址、说明及 1–10000 的整数尺寸。'),
  ).toBeVisible()
  await page.getByRole('button', { name: '移除图片 1' }).click()
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/moments\/\d+\/edit$/)
  const momentUrl = new URL(page.url()).pathname

  await page.goto('/moments')
  await expect(page.getByText(momentBody)).toHaveCount(0)
  await page.goto(momentUrl)
  await page.getByRole('button', { name: '发布' }).click()
  await page
    .getByRole('dialog', { name: '确认发布 Moment？' })
    .getByRole('button', { name: '确认发布', exact: true })
    .click()
  await expect(page.getByRole('button', { name: '撤回' })).toBeVisible()

  await page.goto('/moments')
  await expect(page.getByText(momentBody)).toBeVisible()

  await page.goto(momentUrl)
  await page.getByRole('button', { name: '删除' }).click()
  await page
    .getByRole('dialog', { name: '确认删除 Moment？' })
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/moments$/)
  await page.goto('/moments')
  await expect(page.getByText(momentBody)).toHaveCount(0)

  await page.goto('/admin/chatter/new')
  await page.getByLabel('标题', { exact: true }).fill(chatterTitle)
  await page.getByLabel('正文').fill(chatterBody)
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/chatter\/\d+\/edit$/)
  const chatterUrl = new URL(page.url()).pathname

  await page.goto('/chatter')
  await expect(page.getByText(chatterTitle)).toHaveCount(0)
  await page.goto(chatterUrl)
  await page.getByRole('button', { name: '发布' }).click()
  await page
    .getByRole('dialog', { name: '确认发布 Chatter？' })
    .getByRole('button', { name: '确认发布', exact: true })
    .click()
  await expect(page.getByRole('button', { name: '撤回' })).toBeVisible()

  await page.goto('/chatter')
  await expect(page.getByText(chatterTitle)).toBeVisible()

  await page.goto(chatterUrl)
  await page.getByRole('button', { name: '删除' }).click()
  await page
    .getByRole('dialog', { name: '确认删除 Chatter？' })
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/chatter$/)
  await page.goto('/chatter')
  await expect(page.getByText(chatterTitle)).toHaveCount(0)

  expect(unexpectedProblems(problems)).toEqual([])
})

test('Project, Friend Link, and Media Asset changes reach public consumers with reference-aware deletion', async ({
  page,
}) => {
  test.setTimeout(360_000)
  const token = `${Date.now()}`
  const filename = `live-workflow-${token}.png`
  const brokenFilename = `live-workflow-broken-${token}.png`
  const projectName = `现场工作流验收项目 ${token}`
  const friendName = `现场工作流验收友链 ${token}`
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )

  await login(page)

  await page.goto('/admin/media')
  await page.getByLabel('选择要上传的媒体文件').setInputFiles({
    buffer: png,
    mimeType: 'image/png',
    name: filename,
  })
  await expect(page.getByTestId('media-upload-status')).toContainText(
    `上传成功：${filename}`,
  )
  const mediaCard = page.locator(
    `[data-testid="media-asset-card"][data-media-filename="${filename}"]`,
  )
  await expect(mediaCard).toBeVisible()
  const reference = (await mediaCard.locator('code').innerText()).trim()
  expect(reference).toMatch(
    /^\/uploads\/images\/\d{4}\/\d{2}\/[0-9a-f]{32}\.png$/,
  )

  // A spoofed image is rejected by content verification without losing the page.
  await page.getByLabel('选择要上传的媒体文件').setInputFiles({
    buffer: Buffer.from('this is not an image'),
    mimeType: 'image/png',
    name: brokenFilename,
  })
  await expect(page.getByTestId('media-upload-status')).toContainText(
    '无法解析这个图片，文件可能已损坏，未保存。',
  )
  await expect(
    page.locator(
      `[data-testid="media-asset-card"][data-media-filename="${brokenFilename}"]`,
    ),
  ).toHaveCount(0)

  await page.goto('/admin/projects/new')
  await page.getByLabel('项目名称').fill(projectName)
  await page
    .getByLabel('项目描述')
    .fill('现场工作流验收项目，引用真实上传的媒体资源。')
  await page.getByLabel('技术栈').fill('Nuxt, Playwright, MySQL')
  await page.getByLabel('开发时间').fill('2026.09 — 至今')
  const projectStatus = page.getByRole('combobox', { name: '状态' })
  await projectStatus.click()
  await page.getByRole('option', { name: '进行中' }).press('Enter')
  await page.getByLabel('展示顺序').fill('0')
  await page.getByLabel('精选项目').check()
  await page.getByLabel('项目 Logo URL').fill(reference)
  await page.getByLabel('Logo 替代文本').fill(projectName)
  await page.getByRole('button', { name: '保存项目' }).click()
  await expect(page).toHaveURL(/\/admin\/projects\/\d+\/edit$/)
  const projectUrl = new URL(page.url()).pathname

  await page.goto('/projects')
  const projectCard = page
    .locator('[data-project-card]')
    .filter({ hasText: projectName })
  await expect(projectCard).toBeVisible()
  await expect(projectCard.getByText('精选')).toBeVisible()
  const logo = projectCard.locator('img')
  await expect(logo).toBeVisible()
  expect(await logo.getAttribute('src')).toContain('/uploads/images/')
  await expect
    .poll(() =>
      logo.evaluate(
        (element) =>
          (element as HTMLImageElement).complete &&
          (element as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true)

  await page.goto('/')
  await expect(
    page.locator('.home-project-card').filter({ hasText: projectName }),
  ).toBeVisible()

  await page.goto('/admin/friends/new')
  await page.getByLabel('友链名称').fill(friendName)
  await page.getByLabel('友链描述').fill('现场工作流验收友链描述。')
  await page.getByLabel('目标 URL').fill('https://example.com/live-workflow')
  await page.getByRole('button', { name: '保存友链' }).click()
  await expect(page).toHaveURL(/\/admin\/friends\/\d+\/edit$/)
  const friendUrl = new URL(page.url()).pathname

  await page.goto('/friends')
  await expect(
    page.locator('[data-friend-card]').filter({ hasText: friendName }),
  ).toBeVisible()

  await page.goto(friendUrl)
  await page.getByLabel('公开展示').uncheck()
  await page.getByRole('button', { name: '保存友链' }).click()
  await expect(page.getByRole('button', { name: '保存友链' })).toBeEnabled()
  await page.goto('/friends')
  await expect(
    page.locator('[data-friend-card]').filter({ hasText: friendName }),
  ).toHaveCount(0)

  // Media deletion is blocked while the Project logo keeps the reference.
  await page.goto('/admin/media')
  const referencedCard = page.locator(
    `[data-testid="media-asset-card"][data-media-filename="${filename}"]`,
  )
  await referencedCard.getByRole('button', { name: `删除 ${filename}` }).click()
  const mediaDialog = page.getByRole('dialog', { name: '删除这个媒体资源？' })
  await expect(
    mediaDialog.getByText('该资源仍被以下站点内容引用，删除已被阻止：'),
  ).toBeVisible()
  await expect(mediaDialog.getByText(/项目 #\d+ · logo_url/)).toBeVisible()
  await expect(
    mediaDialog.getByRole('button', { name: '确认删除', exact: true }),
  ).toBeDisabled()
  await mediaDialog.getByRole('button', { name: '取消' }).click()

  await page.goto(projectUrl)
  await page.getByRole('button', { name: '删除项目' }).click()
  await page
    .getByRole('dialog', { name: '确认删除这个项目？' })
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/projects$/)
  await page.goto('/projects')
  await expect(
    page.locator('[data-project-card]').filter({ hasText: projectName }),
  ).toHaveCount(0)
  await page.goto('/')
  await expect(
    page.locator('.home-project-card').filter({ hasText: projectName }),
  ).toHaveCount(0)

  await page.goto(friendUrl)
  await page.getByRole('button', { name: '删除友链' }).click()
  await page
    .getByRole('dialog', { name: '确认删除这个友链？' })
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/friends$/)
  await page.goto('/friends')
  await expect(
    page.locator('[data-friend-card]').filter({ hasText: friendName }),
  ).toHaveCount(0)

  // With the last reference removed the same asset becomes safely deletable.
  await page.goto('/admin/media')
  const deletableCard = page.locator(
    `[data-testid="media-asset-card"][data-media-filename="${filename}"]`,
  )
  await deletableCard.getByRole('button', { name: `删除 ${filename}` }).click()
  const deleteDialog = page.getByRole('dialog', { name: '删除这个媒体资源？' })
  await expect(
    deleteDialog.getByText('未发现站点内容引用这个资源，可以安全删除。'),
  ).toBeVisible()
  await deleteDialog
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(deleteDialog).toBeHidden()
  await expect(deletableCard).toHaveCount(0)
  expect(
    (await page.request.get(`${backendOrigin}${reference}`)).status(),
  ).toBe(404)
})

test('Site Identity and Music Track changes reach the public shell and player', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const problems = collectBrowserProblems(page)
  const token = `${Date.now()}`
  const tagline = `现场工作流验收标语 ${token}`
  const trackTitle = `现场工作流验收音轨 ${token}`

  await login(page)

  await page.goto('/admin/settings')
  const taglineField = page.getByLabel('网站标语')
  const originalTagline = await taglineField.inputValue()
  try {
    await taglineField.fill(tagline)
    await page.getByRole('button', { name: '保存网站设置' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: '设置已保存' }),
    ).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tagline)
  } finally {
    await page.goto('/admin/settings')
    await taglineField.fill(originalTagline)
    await page.getByRole('button', { name: '保存网站设置' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: '设置已保存' }),
    ).toBeVisible()
  }

  await page.goto('/admin/music/new')
  await page.getByLabel('音乐标题').fill(trackTitle)
  await page.getByLabel('艺术家').fill('现场工作流验收演奏者')
  const sourceStrategy = page.getByRole('combobox', { name: '来源策略' })
  await sourceStrategy.click()
  await page.getByRole('option', { name: '远程 URL' }).press('Enter')
  await page.getByLabel('音源地址').fill(`https://example.com/${token}.mp3`)
  await expect(page.getByText('当前音源地址符合所选来源策略。')).toBeVisible()
  await page.getByLabel('展示顺序').fill('0')
  await page.getByLabel('启用这首音乐').check()
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page).toHaveURL(/\/admin\/music\/\d+\/edit$/)

  await page.goto('/admin/music')
  const trackRow = page.locator(
    `[data-testid="music-track-row"][data-track-title="${trackTitle}"]`,
  )
  await expect(trackRow).toBeVisible()
  const rowCount = await page.locator('[data-testid="music-track-row"]').count()
  const trackIndex = () =>
    page
      .locator('[data-testid="music-track-row"]')
      .evaluateAll(
        (rows, title) =>
          rows.findIndex(
            (row) => row.getAttribute('data-track-title') === title,
          ),
        trackTitle,
      )
  for (let step = 0; step < rowCount && (await trackIndex()) > 0; step += 1) {
    const previous = await trackIndex()
    await trackRow.getByRole('button', { name: `上移 ${trackTitle}` }).click()
    await expect.poll(trackIndex).toBeLessThan(previous)
  }
  expect(await trackIndex()).toBe(0)
  await expect(
    page.locator('[data-testid="music-track-row"]').first(),
  ).toHaveAttribute('data-track-title', trackTitle)

  await page.goto('/')
  await expect(page.getByTestId('music-player').locator('strong')).toHaveText(
    trackTitle,
  )

  await page.goto('/admin/music')
  await trackRow.getByRole('button', { name: '停用' }).click()
  await page.goto('/')
  await expect(page.getByTestId('music-player').locator('strong')).toHaveText(
    '夜色里的测试音轨',
  )

  await page.goto('/admin/music')
  await trackRow.getByRole('button', { name: `删除 ${trackTitle}` }).click()
  await page
    .getByRole('dialog', { name: '确认删除这首音乐？' })
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(trackRow).toHaveCount(0)

  expect(unexpectedProblems(problems)).toEqual([])
})

test('admin failure recovery, keyboard, dialogs, touch targets, and unsaved-form behavior pass review', async ({
  page,
}, testInfo) => {
  test.setTimeout(360_000)

  await login(page)

  // A failed list request shows the recoverable error state and an explicit retry.
  const postsListRequest = /\/api\/v1\/admin\/posts\?/
  await page.route(postsListRequest, (route) => route.abort('failed'))
  await page.goto('/admin/posts')
  await expect(
    page.getByText('文章工作区暂时无法加载，请稍后重试。'),
  ).toBeVisible()
  await page.unroute(postsListRequest)
  await page.getByRole('button', { name: '重新加载' }).click()
  await expect(page.getByRole('heading', { name: '文章管理' })).toBeVisible()
  await expect(page.getByText(/共 \d+ 篇/)).toBeVisible()

  const problems = collectBrowserProblems(page)

  // Unsaved Post work is protected by a leave dialog with managed focus.
  await page.goto('/admin/posts/new')
  await page.getByLabel('标题', { exact: true }).fill('现场验收未保存标题')
  await expect(page.getByText('有未保存的更改')).toBeVisible()
  const backToPosts = page.getByRole('link', { name: /返回文章管理/ })
  await backToPosts.click()
  const leaveDialog = page.getByRole('dialog', { name: '离开编辑器？' })
  await expect(leaveDialog).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      ),
    )
    .toBe(true)
  await page.keyboard.press('Escape')
  await expect(leaveDialog).toBeHidden()
  await expect(page).toHaveURL(/\/admin\/posts\/new$/)
  await backToPosts.click()
  await leaveDialog.getByRole('button', { name: '放弃更改并离开' }).click()
  await expect(page).toHaveURL(/\/admin\/posts$/)

  // Mobile navigation uses a sheet with focus return and 44px touch targets.
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/admin')
  const menuButton = page.getByRole('button', { name: '打开后台导航' })
  await expect(menuButton).toBeVisible()
  const menuSize = await menuButton.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { height: rect.height, width: rect.width }
  })
  expect(menuSize.height).toBeGreaterThanOrEqual(44)
  expect(menuSize.width).toBeGreaterThanOrEqual(44)
  await menuButton.focus()
  await menuButton.press('Enter')
  await expect(page.getByRole('button', { name: '关闭后台导航' })).toBeFocused()
  const navigationSizes = await page
    .getByRole('navigation', { name: '移动端后台导航' })
    .getByRole('link')
    .evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().height),
    )
  expect(navigationSizes.length).toBeGreaterThan(0)
  expect(navigationSizes.every((height) => height >= 44)).toBe(true)
  await capture(page, testInfo, 'admin-mobile-navigation', 430)
  await page.keyboard.press('Escape')
  await expect(menuButton).toBeFocused()

  // The skip link moves focus to the admin main region.
  const skipLink = page.getByRole('link', { name: '跳到后台主要内容' })
  await skipLink.focus()
  await skipLink.press('Enter')
  await expect(page.locator('#admin-main')).toBeFocused()

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await capture(page, testInfo, 'admin-dashboard', 1440)
  await page.goto('/admin/posts')
  await expect(page.getByRole('heading', { name: '文章管理' })).toBeVisible()
  await capture(page, testInfo, 'admin-posts', 1440)

  const adminViewports = [
    { height: 812, width: 375 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
  ] as const
  for (const viewport of adminViewports) {
    await page.setViewportSize(viewport)
    for (const route of [
      '/admin',
      '/admin/posts',
      '/admin/posts/new',
      '/admin/settings',
    ]) {
      await page.goto(route)
      await expect(page.locator('#admin-main')).toBeVisible()
      await assertNoHorizontalOverflow(page, route)
      if (route === '/admin/posts/new') {
        await expect(page.getByLabel('Markdown 正文')).toBeVisible()
        if (viewport.width <= 430) {
          await capture(page, testInfo, 'admin-post-editor', viewport.width)
          const toolbarSizes = await page
            .getByRole('toolbar', { name: 'Markdown 编辑工具' })
            .getByRole('button')
            .evaluateAll((buttons) =>
              buttons.map((button) => button.getBoundingClientRect().height),
            )
          expect(toolbarSizes.length).toBeGreaterThan(0)
          expect(toolbarSizes.every((height) => height >= 40)).toBe(true)
        }
      }
    }
  }

  expect(unexpectedProblems(problems)).toEqual([])
})
