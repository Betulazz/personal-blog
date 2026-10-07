import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { mockFixtureMedia } from './support/fixture-media'

const root = (id = 1, overrides: Record<string, unknown> = {}) => ({
  id,
  author: {
    kind: 'commenter',
    name: 'reader',
    avatar_url: null,
    profile_url: null,
  },
  body_html: '<p>Root body</p>',
  body_markdown: 'Root body',
  can_edit: true,
  created_at: '2026-10-01T08:00:00Z',
  edited_at: null,
  like_count: 2,
  liked_by_me: true,
  state: 'visible',
  replies: [],
  ...overrides,
})
const thread = (
  comments = [root()],
  overrides: Record<string, unknown> = {},
) => ({
  resource_key: 'post:2',
  is_open: true,
  comments,
  comment_count: comments.length,
  has_more: false,
  next_cursor: null,
  ...overrides,
})

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
  await page.route('**/api/v1/comments/session', (route) =>
    route.fulfill({
      json: {
        data: {
          github_login_enabled: true,
          commenter: {
            github_user_id: '1',
            login: 'reader',
            avatar_url: null,
            profile_url: null,
            is_banned: false,
          },
        },
      },
    }),
  )
  await page.route('**/api/v1/comments/posts/**', (route) =>
    route.fulfill({ json: { data: thread() } }),
  )
  await page.route('**/api/v1/comments/about', (route) =>
    route.fulfill({ json: { data: thread([], { resource_key: 'about' }) } }),
  )
})

test('locks only the composer during publication and lets navigation preserve another thread draft', async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let writes = 0
  await page.route('**/api/v1/comments/1/like', (route) =>
    route.fulfill({ json: { data: { liked: false } } }),
  )
  await page.route('**/api/v1/comments/posts/**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ json: { data: thread() } })
      return
    }
    writes++
    await held
    await route.fulfill({
      json: {
        data: root(2, {
          body_markdown: 'Sent reply',
          body_html: '<p>Sent reply</p>',
        }),
      },
    })
  })
  await page.goto('/posts/markdown-first')
  const section = page.locator('.comment-section')
  await section.getByRole('button', { name: '回复', exact: true }).click()
  const composer = section.getByRole('textbox', { name: '评论内容' })
  await composer.fill('Sent reply')
  await section.getByRole('button', { name: '发布评论', exact: true }).click()
  await expect.poll(() => writes).toBe(1)
  await expect(composer).toBeDisabled()
  await expect(
    section.getByRole('button', { name: '取消', exact: true }),
  ).toBeDisabled()
  await expect(
    section.getByRole('button', { name: '回复', exact: true }),
  ).toBeDisabled()
  await expect(
    section.getByRole('button', { name: '编辑', exact: true }),
  ).toBeDisabled()
  await expect(
    section.getByRole('button', { name: '退出', exact: true }),
  ).toBeDisabled()
  await expect(
    section.getByRole('button', { name: '删除', exact: true }),
  ).toBeEnabled()
  const like = section.getByRole('button', { name: '取消喜欢', exact: true })
  await expect(like).toBeEnabled()
  await like.click()
  await expect(
    section.getByRole('button', { name: '喜欢评论', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
  await section.locator('.comment-composer').screenshot({
    path: join(tmpdir(), `comment-thread-locked-${testInfo.project.name}.png`),
  })
  const draftKey = await page.evaluate(() =>
    Object.keys(localStorage).find((key) =>
      key.startsWith('comment-draft:post:'),
    ),
  )
  expect(draftKey).toBeTruthy()
  await page.evaluate(() => window.scrollTo(0, 0))
  const desktopAbout = page.locator('nav[aria-label="主导航"] a[href="/about"]')
  if (await desktopAbout.isVisible()) await desktopAbout.click()
  else {
    await page.getByRole('button', { name: '打开主导航' }).click()
    await page
      .getByRole('navigation', { name: '移动端主导航' })
      .getByRole('link', { name: '关于', exact: true })
      .click()
  }
  await expect(page).toHaveURL(/\/about$/)
  const about = page.locator('.comment-section')
  await about
    .getByRole('textbox', { name: '评论内容' })
    .fill('Another thread draft')
  release()
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key!), draftKey))
    .toBeNull()
  await expect(about.getByRole('textbox', { name: '评论内容' })).toHaveValue(
    'Another thread draft',
  )
  await expect(about.getByText('评论已发布。', { exact: true })).toHaveCount(0)
  expect(writes).toBe(1)
  expect(pageErrors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('an editing response does not erase replies or likes already displayed', async ({
  page,
}) => {
  await page.route('**/api/v1/comments/posts/**', (route) =>
    route.fulfill({
      json: {
        data: thread([
          root(1, {
            replies: [
              root(2, {
                body_html: '<p>Existing reply</p>',
                body_markdown: 'Existing reply',
                can_edit: false,
              }),
            ],
          }),
        ]),
      },
    }),
  )
  await page.route('**/api/v1/comments/1', (route) =>
    route.fulfill({
      json: {
        data: root(1, {
          body_html: '<p>Edited body</p>',
          body_markdown: 'Edited body',
          edited_at: '2026-10-07T08:00:00Z',
          like_count: 0,
          liked_by_me: false,
          replies: [],
        }),
      },
    }),
  )
  await page.goto('/posts/markdown-first')
  const section = page.locator('.comment-section')
  await section.getByRole('button', { name: '编辑', exact: true }).click()
  await section.getByRole('textbox', { name: '评论内容' }).fill('Edited body')
  await section.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(section.getByText('评论已更新。', { exact: true })).toBeVisible()
  await expect(
    section.getByText('Existing reply', { exact: true }),
  ).toBeVisible()
  await expect(section.getByText('Edited body', { exact: true })).toBeVisible()
  const like = section
    .locator('.comment-item__actions')
    .first()
    .getByRole('button', { name: '取消喜欢' })
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  await expect(like).toContainText('2')
})

test('an off-page draft retains its target until loading more restores it', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'comment-draft:post:2',
      JSON.stringify({
        body: 'Restored reply text',
        parentId: '20',
        editingId: null,
      }),
    ),
  )
  await page.route('**/api/v1/comments/posts/**', (route) => {
    const hasCursor = new URL(route.request().url()).searchParams.has('cursor')
    return route.fulfill({
      json: {
        data: hasCursor
          ? thread([root(20)], { comment_count: 2 })
          : thread([root()], {
              has_more: true,
              next_cursor: 1,
              comment_count: 2,
            }),
      },
    })
  })
  await page.goto('/posts/markdown-first')
  const section = page.locator('.comment-section')
  const composer = section.getByRole('textbox', { name: '评论内容' })
  await expect(composer).toHaveValue('Restored reply text')
  await expect(section.getByText(/原评论尚未加载/)).toBeVisible()
  await expect(
    section.getByRole('button', { name: '发布评论', exact: true }),
  ).toBeDisabled()
  await section
    .getByRole('button', { name: '加载更多评论', exact: true })
    .click()
  await expect(section.getByText('回复 reader', { exact: true })).toBeVisible()
  await expect(composer).toHaveValue('Restored reply text')
  await expect(
    section.getByRole('button', { name: '发布评论', exact: true }),
  ).toBeEnabled()
  await section.locator('.comment-composer').screenshot({
    path: join(
      tmpdir(),
      `comment-thread-restored-${testInfo.project.name}.png`,
    ),
  })
})

test('a rejected submission unlocks the editor and retains its words', async ({
  page,
}) => {
  await page.route('**/api/v1/comments/posts/**', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 422,
          json: {
            error: { code: 'comment_body_too_long', message: 'too long' },
          },
        })
      : route.fulfill({ json: { data: thread() } }),
  )
  await page.goto('/posts/markdown-first')
  const section = page.locator('.comment-section')
  const composer = section.getByRole('textbox', { name: '评论内容' })
  await composer.fill('Keep this after failure')
  await section.getByRole('button', { name: '发布评论', exact: true }).click()
  await expect(section.getByRole('alert')).toContainText('3000')
  await expect(composer).toBeEnabled()
  await expect(composer).toHaveValue('Keep this after failure')
})

test('an uncertain publication stays blocked after editing and reloading until checked', async ({
  page,
}) => {
  await page.route('**/api/v1/comments/posts/**', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 500,
          json: { error: { code: 'internal_error', message: 'uncertain' } },
        })
      : route.fulfill({ json: { data: thread() } }),
  )
  await page.goto('/posts/markdown-first')
  const section = page.locator('.comment-section')
  const composer = section.getByRole('textbox', { name: '评论内容' })
  await composer.fill('Possibly published')
  await section.getByRole('button', { name: '发布评论', exact: true }).click()
  await expect(section.getByText(/上次发布结果尚未确认/)).toBeVisible()
  await composer.fill('Edited uncertain draft')
  await page.reload()
  await expect(composer).toHaveValue('Edited uncertain draft')
  await expect(section.getByText(/上次发布结果尚未确认/)).toBeVisible()
  await expect(
    section.getByRole('button', { name: '发布评论', exact: true }),
  ).toBeDisabled()
  await section.getByRole('button', { name: '已核对，继续编辑' }).click()
  await expect(
    section.getByRole('button', { name: '发布评论', exact: true }),
  ).toBeEnabled()
})
