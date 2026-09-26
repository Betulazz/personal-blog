import { expect, test, type Page } from '@playwright/test'

const mockControl = 'http://127.0.0.1:8787/__control'
const apiBase = 'http://127.0.0.1:8787/api/v1'

const markdownFixture =
  [
    '# Workspace title',
    '',
    '## A second level',
    '',
    '### A third level',
    '',
    '- Bullet parent',
    '  - Nested bullet',
    '',
    '1. Ordered parent',
    '   1. Nested ordered item',
    '',
    '- [ ] Unchecked task',
    '- [x] Checked task',
    '  - [ ] Nested task',
  ].join('\n') + `\n\n${'word '.repeat(401)}`

test.beforeEach(async ({ page }) => {
  await page.request.get(`${mockControl}/reset`)
})

test('Post workspace edits canonical Markdown and delegates reading time to the API', async ({
  page,
}) => {
  const writePayloads: Array<Record<string, unknown>> = []
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
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (
      (request.method() === 'POST' && pathname === '/api/v1/admin/posts') ||
      (request.method() === 'PATCH' &&
        /^\/api\/v1\/admin\/posts\/\d+$/.test(pathname))
    ) {
      writePayloads.push(request.postDataJSON() as Record<string, unknown>)
    }
  })

  await login(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  const csrfResponse = await page.request.get(`${apiBase}/auth/csrf`)
  const csrf = (await csrfResponse.json()).data.token as string
  const createdResponse = await page.request.post(`${apiBase}/admin/posts`, {
    data: {
      body: markdownFixture,
      slug: 'authoring-markdown-round-trip',
      summary: '',
      title: 'Markdown authoring round trip',
    },
    headers: { 'X-CSRF-Token': csrf },
  })
  expect(createdResponse.status()).toBe(201)
  const createdPost = (await createdResponse.json()).data as {
    id: number
    reading_time_minutes: number
  }
  expect(createdPost.reading_time_minutes).toBe(3)
  const postId = String(createdPost.id)
  await page.goto(`/admin/posts/${postId}/edit`)

  const editor = page.getByLabel('Markdown 正文')
  await expect(editor).toBeVisible()
  await expect(page.getByLabel('阅读时长（分钟）')).toHaveCount(0)
  await expect(editor.locator('h1')).toHaveText('Workspace title')
  await editor.locator('h1').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' revised')
  await expect(editor.locator('h1')).toHaveText('Workspace title revised')
  await page.getByRole('button', { name: '撤销' }).click()
  await expect(editor.locator('h1')).toHaveText('Workspace title')
  await page.getByRole('button', { name: '重做' }).click()
  await expect(editor.locator('h1')).toHaveText('Workspace title revised')

  const desktopLayout = await page.evaluate(() => {
    const form = document.querySelector<HTMLElement>('.admin-post-form')!
    const side = document.querySelector<HTMLElement>('.admin-post-form__side')!
    const content = document.querySelector<HTMLElement>(
      '.admin-markdown-editor__content',
    )!
    return {
      columns: getComputedStyle(form).gridTemplateColumns,
      editorHeight: content.getBoundingClientRect().height,
      sideWidth: side.getBoundingClientRect().width,
      viewportHeight: window.innerHeight,
    }
  })
  expect(desktopLayout.sideWidth).toBeGreaterThanOrEqual(350)
  expect(desktopLayout.sideWidth).toBeLessThanOrEqual(370)
  expect(desktopLayout.editorHeight).toBeGreaterThanOrEqual(
    desktopLayout.viewportHeight * 0.64,
  )
  expect(desktopLayout.columns.split(' ').length).toBe(2)

  const headingSizes = await editor
    .locator('h1, h2, h3')
    .evaluateAll((nodes) =>
      nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
    )
  expect(headingSizes[0]).toBeGreaterThan(headingSizes[1]!)
  expect(headingSizes[1]).toBeGreaterThan(headingSizes[2]!)

  const listStyles = await editor.evaluate((root) => {
    const styles = (selector: string) => {
      const list = root.querySelector<HTMLElement>(selector)
      return list ? getComputedStyle(list) : null
    }
    const bullet = styles('ul:not([data-type="taskList"])')
    const nestedBullet = styles('ul:not([data-type="taskList"]) ul')
    const ordered = styles('ol')
    const taskList = styles('ul[data-type="taskList"]')
    const tasks = [
      ...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ]
    return {
      bulletIndent: bullet?.paddingInlineStart,
      bulletMarker: bullet?.listStyleType,
      checkedTasks: tasks.filter((task) => task.checked).length,
      nestedBulletMarker: nestedBullet?.listStyleType,
      orderedIndent: ordered?.paddingInlineStart,
      orderedMarker: ordered?.listStyleType,
      taskListIndent: taskList?.paddingInlineStart,
      taskListMarker: taskList?.listStyleType,
      taskCount: tasks.length,
    }
  })
  expect(listStyles.bulletMarker).toBe('disc')
  expect(listStyles.nestedBulletMarker).toBe('circle')
  expect(listStyles.bulletIndent).not.toBe('0px')
  expect(listStyles.orderedMarker).toBe('decimal')
  expect(listStyles.orderedIndent).not.toBe('0px')
  expect(listStyles.taskListMarker).toBe('none')
  expect(listStyles.taskListIndent).toBe('0px')
  expect(listStyles.taskCount).toBe(3)
  expect(listStyles.checkedTasks).toBe(1)

  await page
    .getByLabel('标题', { exact: true })
    .fill('Edited canonical Markdown Post')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${postId}/edit$`))
  await expect.poll(() => writePayloads.length).toBe(1)
  expect(writePayloads[0]).not.toHaveProperty('reading_time_minutes')

  await page.reload()
  await expect(page.getByLabel('Markdown 正文')).toContainText(
    'Workspace title revised',
  )
  await expect(page.getByLabel('Markdown 正文').locator('h1')).toHaveText(
    'Workspace title revised',
  )
  await expect(page.getByLabel('Markdown 正文').locator('h2')).toHaveText(
    'A second level',
  )
  await expect(page.getByLabel('Markdown 正文').locator('h3')).toHaveText(
    'A third level',
  )
  const restoredStructure = await page
    .getByLabel('Markdown 正文')
    .evaluate((root) => {
      const tasks = [
        ...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
      ]
      return {
        bulletLists: root.querySelectorAll('ul:not([data-type="taskList"])')
          .length,
        checkedTasks: tasks.filter((task) => task.checked).length,
        nestedBulletLists: root.querySelectorAll(
          'ul:not([data-type="taskList"]) ul:not([data-type="taskList"])',
        ).length,
        nestedOrderedLists: root.querySelectorAll('ol ol').length,
        orderedLists: root.querySelectorAll('ol').length,
        taskCount: tasks.length,
      }
    })
  expect(restoredStructure.bulletLists).toBe(2)
  expect(restoredStructure.nestedBulletLists).toBe(1)
  expect(restoredStructure.orderedLists).toBe(2)
  expect(restoredStructure.nestedOrderedLists).toBe(1)
  expect(restoredStructure.taskCount).toBe(3)
  expect(restoredStructure.checkedTasks).toBe(1)

  const storedResponse = await page.request.get(
    `${apiBase}/admin/posts/${postId}`,
  )
  expect(storedResponse.ok()).toBe(true)
  const storedPost = (await storedResponse.json()).data as {
    body: string
    reading_time_minutes: number
  }
  expect(storedPost.body).toBe(writePayloads[0]?.body)
  expect(storedPost.body).toContain('# Workspace title revised')
  expect(storedPost.body).toContain('Nested bullet')
  expect(storedPost.body).toContain('Nested ordered item')
  expect(storedPost.body).toContain('Unchecked task')
  expect(storedPost.body).toContain('Checked task')
  expect(storedPost.body).toContain('Nested task')
  expect(storedPost.body).toContain('word word word')
  expect(storedPost.reading_time_minutes).toBe(3)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload()
  await expect(page.getByLabel('Markdown 正文')).toBeVisible()
  const mobileLayout = await page.evaluate(() => {
    const form = document.querySelector<HTMLElement>('.admin-post-form')!
    const main = document.querySelector<HTMLElement>('.admin-post-form__main')!
    const side = document.querySelector<HTMLElement>('.admin-post-form__side')!
    const toolbar = document.querySelector<HTMLElement>(
      '.admin-markdown-editor__toolbar',
    )!
    return {
      clientWidth: document.documentElement.clientWidth,
      columns: getComputedStyle(form).gridTemplateColumns,
      mainTop: main.getBoundingClientRect().top,
      scrollWidth: document.documentElement.scrollWidth,
      sideTop: side.getBoundingClientRect().top,
      toolbarClientWidth: toolbar.clientWidth,
      toolbarScrollWidth: toolbar.scrollWidth,
    }
  })
  expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(mobileLayout.clientWidth)
  expect(mobileLayout.columns.split(' ').length).toBe(1)
  expect(mobileLayout.sideTop).toBeGreaterThan(mobileLayout.mainTop)
  expect(mobileLayout.toolbarScrollWidth).toBeLessThanOrEqual(
    mobileLayout.toolbarClientWidth,
  )
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeVisible()
  expect(consoleProblems).toEqual([])
})

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
