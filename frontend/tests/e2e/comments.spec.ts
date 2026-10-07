import { expect, test } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
})

test('About and Post comments expose the configured guest state', async ({
  page,
}, testInfo) => {
  const failedCommentRequests: string[] = []
  page.on('response', (response) => {
    if (
      response.url().includes('/api/v1/comments/') &&
      response.status() >= 400
    ) {
      failedCommentRequests.push(`${response.status()} ${response.url()}`)
    }
  })

  for (const path of ['/about', '/posts/markdown-first']) {
    await page.goto(path)

    const section = page.locator('.comment-section')
    await expect(section).toBeVisible()
    await expect(
      section.getByRole('heading', { name: '留下评论' }),
    ).toBeVisible()
    await expect(section.getByText('0 条')).toBeVisible()
    await expect(section.getByText('这里还没有评论。')).toBeVisible()
    await expect(
      section.getByRole('button', { name: 'GitHub 登录暂未配置' }),
    ).toBeDisabled()
    await expect(
      section.getByRole('textbox', { name: '评论内容' }),
    ).toBeDisabled()

    if (
      path === '/about' &&
      testInfo.project.name === 'chromium' &&
      process.env.COMMENTS_QA_SCREENSHOT_PATH
    ) {
      await section.screenshot({
        path: process.env.COMMENTS_QA_SCREENSHOT_PATH,
      })
    }
  }

  expect(failedCommentRequests).toEqual([])
})

test('a populated Post thread finishes loading and renders its comment date', async ({
  page,
}) => {
  const createdAt = '2026-09-30T12:00:00+08:00'
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.route('**/api/v1/comments/session', (route) =>
    route.fulfill({
      json: { data: { commenter: null, github_login_enabled: false } },
    }),
  )
  await page.route('**/api/v1/comments/posts/**', (route) =>
    route.fulfill({
      json: {
        data: {
          resource_key: 'post:1',
          is_open: true,
          comment_count: 1,
          comments: [
            {
              id: 99001,
              author: {
                avatar_url: null,
                kind: 'commenter',
                name: 'fixture-reader',
                profile_url: 'https://github.com/fixture-reader',
              },
              body_html: '<p>Fixture comment body</p>',
              body_markdown: 'Fixture comment body',
              can_edit: false,
              created_at: createdAt,
              edited_at: null,
              like_count: 0,
              liked_by_me: false,
              replies: [],
              state: 'visible',
            },
          ],
          next_cursor: null,
          has_more: false,
        },
      },
    }),
  )

  await page.goto('/posts/markdown-first')

  const section = page.locator('.comment-section')
  await expect(section.locator('.comment-section__loading')).toBeHidden({
    timeout: 5000,
  })
  await expect(section.getByText('Fixture comment body')).toBeVisible()
  await expect(section.locator('time')).toHaveAttribute('datetime', createdAt)
  expect(pageErrors).toEqual([])
})

test('admin comment list renders a populated comment date', async ({
  page,
}) => {
  const createdAt = '2026-09-30T12:00:00+08:00'
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.route('**/api/v1/admin/comments/unread-count', (route) =>
    route.fulfill({ json: { data: { count: 1 } } }),
  )
  await page.route(/\/api\/v1\/admin\/comments\?/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 99002,
            author_name: 'fixture-reader',
            author_avatar_url: null,
            author_profile_url: 'https://github.com/fixture-reader',
            body_html: '<p>Fixture admin comment</p>',
            body_markdown: 'Fixture admin comment',
            created_at: createdAt,
            commenter_is_banned: false,
            edited_at: null,
            github_user_id: '900002',
            is_administrator: false,
            parent_id: null,
            reply_count: 0,
            resource_key: 'post:1',
            resource_label: 'Fixture Post',
            resource_path: '/posts/markdown-first',
            state: 'visible',
            thread_is_open: true,
          },
        ],
        pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
      },
    }),
  )
  await page.route('**/api/v1/admin/comment-threads', (route) =>
    route.fulfill({ json: { data: [] } }),
  )

  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/comments')

  const card = page.locator('.admin-comment-card')
  await expect(card).toBeVisible({ timeout: 5000 })
  await expect(card.getByText('Fixture admin comment')).toBeVisible()
  await expect(card.locator('time')).toHaveAttribute('datetime', createdAt)
  expect(pageErrors).toEqual([])
})
