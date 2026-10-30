import { expect, test, type Page } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

const mockControl = 'http://127.0.0.1:8787/__control'
const apiBase = 'http://127.0.0.1:8787/api/v1'

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
  await page.request.get(`${mockControl}/reset`)
})

const login = async (page: Page) => {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

const editorFor = (page: Page) => page.getByLabel('Markdown 正文')

const collectConsoleProblems = (page: Page) => {
  const problems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    const knownNuxtDevWarning =
      text.includes('[NUXT_E4011]') || text.includes('[nostics]')
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !knownNuxtDevWarning
    ) {
      problems.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  return problems
}

const patchPostBody = async (page: Page, id: string, body: string) => {
  const csrfResponse = await page.request.get(`${apiBase}/auth/csrf`)
  const payload = (await csrfResponse.json()) as { data: { token: string } }
  const response = await page.request.patch(`${apiBase}/admin/posts/${id}`, {
    data: { body },
    headers: { 'X-CSRF-Token': payload.data.token },
  })
  expect(response.ok()).toBe(true)
}

const readPostBody = async (page: Page, id: string) => {
  const response = await page.request.get(`${apiBase}/admin/posts/${id}`)
  expect(response.ok()).toBe(true)
  const payload = (await response.json()) as { data: { body: string } }
  return payload.data.body
}

test('pastes Markdown as formatted content and saves it across reload', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/posts/new')
  await page.getByLabel('标题', { exact: true }).fill('粘贴 Markdown')
  await page.getByLabel('Slug').fill('paste-markdown')
  const editor = editorFor(page)
  await editor.click()
  const source = [
    '## 粘贴的标题',
    '',
    '正文 **粗体** 和 [链接](https://example.com)。',
    '行内代码链接 [`/prototype`](https://example.com/prototype)。',
    '',
    '- 第一项',
    '- 第二项',
    '',
    '```ts',
    'const answer = 42',
    '```',
    '',
    '| 名称 | 值 |',
    '| --- | --- |',
    '| 答案 | 42 |',
  ].join('\n')
  await editor.evaluate((element, text) => {
    const clipboard = new DataTransfer()
    clipboard.setData('text/plain', text)
    // Code editors commonly include HTML alongside the Markdown source.
    clipboard.setData('text/html', `<pre>${text}</pre>`)
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboard,
      }),
    )
  }, source)
  await expect(editor.locator('h2')).toHaveText('粘贴的标题')
  await expect(editor.locator('strong')).toHaveText('粗体')
  await expect(
    editor.getByRole('link', { name: '链接', exact: true }),
  ).toHaveAttribute('href', 'https://example.com')
  await expect(editor.locator('a code')).toHaveText('/prototype')
  await expect(editor.locator('ul li')).toHaveCount(2)
  await expect(editor.locator('pre code')).toContainText('const answer = 42')
  await expect(editor.locator('table')).toContainText('答案')

  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
  const postId = page.url().match(/\/admin\/posts\/(\d+)\/edit$/)?.[1]
  expect(postId).toBeTruthy()
  const stored = await readPostBody(page, postId!)
  expect(stored).toContain('## 粘贴的标题')
  expect(stored).toContain('**粗体**')
  expect(stored).toContain('[`/prototype`](https://example.com/prototype)')
  expect(stored).toContain('```ts')
  await page.reload()
  await expect(editor.locator('h2')).toHaveText('粘贴的标题')
  await expect(editor.locator('a code')).toHaveText('/prototype')
  await expect(editor.locator('table')).toContainText('答案')
})

test('editor loads canonical Markdown and preserves it across save and reload', async ({
  page,
}) => {
  const source = [
    '## 夜间记录',
    '',
    '> 引用保留。',
    '',
    '```ts',
    'const answer = 42',
    '```',
    '',
    '| 能力 | 结果 |',
    '| --- | --- |',
    '| 表格 | 保留 |',
    '',
    '- [ ] 任务一',
    '',
    '行内数学 $x^2$ 与 Unicode 霓虹 🚀',
    '',
    '![封面](/uploads/images/2026/09/11111111111111111111111111111111.webp)',
  ].join('\n')

  await login(page)
  await patchPostBody(page, '2', source)
  await page.goto('/admin/posts/2/edit')

  const editor = editorFor(page)
  await expect(editor).toContainText('夜间记录')
  await expect(editor.locator('h2')).toHaveText('夜间记录')
  await expect(editor).toContainText('const answer = 42')
  await expect(editor).toContainText('表格')
  await expect(editor).toContainText('霓虹 🚀')
  await expect(editor.locator('input[type="checkbox"]')).toHaveCount(1)

  const saveButton = page.getByRole('button', { name: '保存草稿' })
  await saveButton.click()
  await expect(saveButton).toBeEnabled()
  await expect(page.getByText('有未保存的更改')).toHaveCount(0)
  await page.reload()

  await expect(editor.locator('h2')).toHaveText('夜间记录')
  await expect(editor).toContainText('const answer = 42')
  await expect(editor.locator('img')).toHaveAttribute(
    'src',
    '/uploads/images/2026/09/11111111111111111111111111111111.webp',
  )
  await expect
    .poll(() =>
      editor
        .locator('img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0)

  const stored = await readPostBody(page, '2')
  expect(stored).toContain('```ts')
  expect(stored).toContain('| 能力')
  expect(stored).toContain('- [ ] 任务一')
  expect(stored).toContain(
    '![封面](/uploads/images/2026/09/11111111111111111111111111111111.webp)',
  )
})

test('media library selection inserts a provider-agnostic reference', async ({
  page,
}) => {
  const slug = `media-insert-${Date.now()}`

  await login(page)
  await page.goto('/admin/posts/new')
  await page.getByLabel('标题', { exact: true }).fill('媒体插入验收')
  await page.getByLabel('Slug').fill(slug)

  await page.getByRole('button', { name: '插入图片' }).click()
  const picker = page.getByTestId('media-picker')
  await expect(picker).toBeVisible()
  await expect(
    page
      .getByRole('dialog', { name: '从媒体库插入图片' })
      .getByText('不绑定某一种存储实现'),
  ).toBeVisible()
  await picker
    .getByTestId('media-picker-asset')
    .filter({ hasText: 'night-sky.webp' })
    .click()
  await expect(
    page
      .getByRole('dialog', { name: '从媒体库插入图片' })
      .getByLabel('替代文本'),
  ).toHaveValue('night-sky')
  await page.getByRole('button', { name: '插入选中图片' }).click()
  await expect(picker).toBeHidden()

  await expect(editorFor(page).locator('img')).toHaveAttribute(
    'src',
    '/uploads/images/2026/09/11111111111111111111111111111111.webp',
  )
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)

  await page.reload()
  await expect(editorFor(page).locator('img')).toHaveAttribute(
    'src',
    '/uploads/images/2026/09/11111111111111111111111111111111.webp',
  )
  const postId = page.url().match(/\/admin\/posts\/(\d+)\/edit$/)?.[1]
  expect(postId).toBeTruthy()
  const stored = await readPostBody(page, postId!)
  const mediaResponse = await page.request.get(
    `${apiBase}/admin/media?kind=image&page_size=100`,
  )
  const mediaPayload = (await mediaResponse.json()) as {
    data: Array<{ original_filename: string; url: string }>
  }
  const asset = mediaPayload.data.find(
    (item) => item.original_filename === 'night-sky.webp',
  )
  expect(asset).toBeTruthy()
  expect(stored).toContain(`![night-sky](${asset!.url})`)
})

test('validation, preview, and save failure keep editable state intact', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/posts/new')

  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByText('请输入文章标题。')).toBeVisible()
  await expect(page.getByText('请输入公开 slug。')).toBeVisible()

  await page.getByLabel('标题', { exact: true }).fill('保留状态的草稿')
  await page.getByLabel('Slug').fill(`keep-state-${Date.now()}`)
  const editor = editorFor(page)
  await editor.click()
  await editor.pressSequentially('预览前的正文')
  await page.getByRole('button', { name: '预览' }).click()
  const preview = page.getByRole('dialog', { name: 'Markdown 预览' })
  await expect(preview).toContainText('预览前的正文')
  await page.getByRole('button', { name: '关闭Markdown 预览' }).click()

  await page.request.get(`${mockControl}/failure?resource=admin`)
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.locator('.admin-post-form__error')).toContainText(
    '操作结果暂时无法确认',
  )
  await expect(page.getByTestId('post-write-unknown')).toBeVisible()
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeDisabled()
  await expect(editor).toContainText('预览前的正文')
  await expect(page.getByLabel('标题', { exact: true })).toHaveValue(
    '保留状态的草稿',
  )
  await page.request.get(`${mockControl}/clear-failures`)
})

test('disallowed HTML, unsafe links, and unsupported syntax follow the safe policy', async ({
  page,
}) => {
  const unsafe = [
    '正文 <script>alert(1)</script> 继续',
    '',
    '[危险链接](javascript:alert(1))',
    '',
    '![危险图片](javascript:alert(2))',
    '',
    '脚注引用[^1]',
    '',
    '[^1]: 脚注内容',
  ].join('\n')

  await login(page)
  await patchPostBody(page, '2', unsafe)
  await page.goto('/admin/posts/2/edit')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.admin-post-form')).toHaveAttribute(
    'data-markdown-editor-ready',
    'true',
  )

  const notice = page.getByTestId('markdown-policy-notice')
  await expect(notice).toBeVisible()
  await expect(notice).toContainText('原始 HTML')
  await expect(notice).toContainText('不安全链接')
  await expect(notice).toContainText('不安全的图片地址')

  const editor = editorFor(page)
  await expect(editor).toContainText('<script>alert(1)</script>')
  await expect(editor.locator('script')).toHaveCount(0)
  await expect(editor).toContainText('脚注引用[^1]')

  const saveButton = page.getByRole('button', { name: '保存草稿' })
  await saveButton.click()
  await expect(saveButton).toBeEnabled()
  await expect(page.getByText('有未保存的更改')).toHaveCount(0)

  const stored = await readPostBody(page, '2')
  expect(stored).not.toContain('<script')
  expect(stored).not.toContain('javascript:')
  expect(stored).toContain('alert(1)')
  expect(stored).toContain('脚注内容')
})

test('dirty state protects unsaved edits before navigating away', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/posts/2/edit')

  const editor = editorFor(page)
  await editor.click()
  await editor.pressSequentially('未保存的追加内容')
  await expect(page.getByText('有未保存的更改')).toBeVisible()

  await page.getByRole('link', { name: '返回文章管理' }).click()
  const leaveDialog = page.getByRole('dialog', { name: '离开编辑器？' })
  await expect(leaveDialog).toBeVisible()
  await leaveDialog.getByRole('button', { name: '继续编辑' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/2\/edit$/)
  await expect(editor).toContainText('未保存的追加内容')

  await page.getByRole('link', { name: '返回文章管理' }).click()
  await expect(leaveDialog).toBeVisible()
  await leaveDialog.getByRole('button', { name: '放弃更改并离开' }).click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
})

test('session expiry keeps an unsaved draft recoverable after re-login', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/posts/2/edit')

  const editor = editorFor(page)
  await editor.click()
  await editor.pressSequentially('会话过期前的未保存正文')
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

  await page.request.get(`${mockControl}/expire-session`)
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)

  await login(page)
  await page.goto('/admin/posts/2/edit')
  const recovery = page.getByRole('dialog', { name: '发现未保存的草稿' })
  await expect(recovery).toBeVisible()
  await recovery.getByRole('button', { name: '恢复草稿' }).click()
  await expect(editorFor(page)).toContainText('会话过期前的未保存正文')
})

test('editor and media picker hold fixed-viewport evidence without overflow', async ({
  page,
}, testInfo) => {
  const consoleProblems = collectConsoleProblems(page)

  await login(page)
  await patchPostBody(
    page,
    '2',
    [
      '## 夜间记录',
      '',
      '正文 <script>alert(1)</script> 与 [危险链接](javascript:alert(1))。',
      '',
      '| 能力 | 结果 |',
      '| --- | --- |',
      '| 表格 | 保留 |',
    ].join('\n'),
  )

  for (const viewport of [
    { height: 812, width: 375 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/admin/posts/2/edit')
    await expect(page.getByTestId('markdown-policy-notice')).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.scrollWidth,
      `editor at ${viewport.width}px`,
    ).toBeLessThanOrEqual(dimensions.clientWidth)

    await page.screenshot({
      path: `test-results/admin-markdown-editor/${testInfo.project.name}-${viewport.width}-viewport.png`,
      fullPage: false,
      scale: 'css',
    })
    await page.screenshot({
      path: `test-results/admin-markdown-editor/${testInfo.project.name}-${viewport.width}-full-page.png`,
      fullPage: true,
      scale: 'css',
    })

    if (viewport.width === 1440 || viewport.width === 430) {
      await page.getByRole('button', { name: '插入图片' }).click()
      await expect(page.getByTestId('media-picker')).toBeVisible()
      const pickerDimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(pickerDimensions.scrollWidth).toBeLessThanOrEqual(
        pickerDimensions.clientWidth,
      )
      await page.screenshot({
        path: `test-results/admin-markdown-editor/${testInfo.project.name}-${viewport.width}-media-picker.png`,
        fullPage: false,
        scale: 'css',
      })
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('media-picker')).toBeHidden()
    }
  }

  expect(consoleProblems).toEqual([])
})

test('editor shows a loading state and stays keyboard usable on narrow screens', async ({
  page,
}) => {
  const consoleProblems = collectConsoleProblems(page)

  await login(page)
  await patchPostBody(page, '2', '## 键盘验收\n\n用键盘继续写作。')
  await page.route('**/admin/posts/2', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.continue()
  })

  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/admin/posts/2/edit')
  await expect(page.getByTestId('admin-post-loading')).toBeVisible()

  const editor = editorFor(page)
  await expect(editor).toBeVisible()
  const toolbarButtons = page.locator('.admin-markdown-editor__toolbar button')
  const buttonCount = await toolbarButtons.count()
  expect(buttonCount).toBeGreaterThan(10)
  for (let index = 0; index < buttonCount; index += 1) {
    const box = await toolbarButtons.nth(index).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)
  }

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)

  await editor.click()
  await editor.pressSequentially('键盘输入')
  await expect(editor).toContainText('键盘输入')
  await expect(consoleProblems).toEqual([])
})
