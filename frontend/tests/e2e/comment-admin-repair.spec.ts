import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import os from 'node:os'

const html =
  '<h1>一级标题</h1><h2>二级标题</h2><ul><li>列表项</li></ul><blockquote><p>引用</p></blockquote><pre><code>' +
  'long_code_'.repeat(100) +
  '</code></pre>'
const item = (id: number, parentId: number | null = null) => ({
  id,
  parent_id: parentId,
  parent: parentId
    ? {
        id: parentId,
        author_name: '原作者',
        body_excerpt: '原评论内容与上下文',
        state: 'visible',
      }
    : null,
  author_name: id === 1 ? '原作者' : `reader-${id}`,
  author_avatar_url: null,
  author_profile_url: null,
  body_html: html,
  body_markdown: '# 一级标题',
  created_at: '2026-10-01T08:00:00Z',
  edited_at: null,
  github_user_id: String(id),
  commenter_is_banned: false,
  is_administrator: false,
  reply_count: id === 1 ? 20 : 0,
  resource_key: 'post:1',
  resource_label: 'Fixture Post',
  resource_path: '/posts/markdown-first',
  state: 'visible',
  thread_is_open: true,
})

async function fixture(
  page: Page,
  options: {
    failRead?: boolean
    failDiscussion?: boolean
    arrival?: boolean
  } = {},
) {
  const rows = Array.from({ length: 21 }, (_, index) =>
    item(index + 1, index ? 1 : null),
  )
  const read = new Set<number>()
  const acknowledgements: number[][] = []
  const replyTargets: number[] = []
  let failRead = Boolean(options.failRead)
  let failDiscussion = Boolean(options.failDiscussion)
  let listFailed = false
  let arrival = Boolean(options.arrival)
  await page.route(/\/api\/v1\/admin\/comments(?:[/?]|$)/, async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/unread-count')) {
      await route.fulfill({
        json: { data: { count: rows.filter((r) => !read.has(r.id)).length } },
      })
    } else if (url.pathname.endsWith('/read')) {
      if (arrival) {
        arrival = false
        rows.push(item(22))
      }
      if (failRead) {
        await route.fulfill({
          status: 500,
          json: { error: { code: 'fixture_failure', message: 'read failed' } },
        })
        return
      }
      const ids = route.request().postDataJSON().comment_ids as number[]
      acknowledgements.push(ids)
      ids.forEach((id) => read.add(id))
      await route.fulfill({
        json: { data: { count: rows.filter((r) => !read.has(r.id)).length } },
      })
    } else if (url.pathname.endsWith('/discussion')) {
      if (failDiscussion) {
        await route.fulfill({
          status: 500,
          json: {
            error: { code: 'fixture_failure', message: 'discussion failed' },
          },
        })
      } else {
        await route.fulfill({
          json: {
            data: {
              root: rows[0],
              replies: rows.filter((r) => r.parent_id === 1),
            },
          },
        })
      }
    } else if (url.pathname.endsWith('/reply')) {
      replyTargets.push(Number(url.pathname.split('/').at(-2)))
      await route.fulfill({
        status: 201,
        json: {
          data: {
            id: 100,
            author: {
              name: '博主',
              kind: 'administrator',
              avatar_url: null,
              profile_url: null,
            },
            body_html: '<p>Owner reply</p>',
            body_markdown: 'Owner reply',
            state: 'visible',
            created_at: '2026-10-01T08:00:00Z',
            edited_at: null,
            can_edit: false,
            like_count: 0,
            liked_by_me: false,
            replies: [],
          },
        },
      })
    } else if (url.pathname.endsWith('/comments')) {
      if (listFailed) {
        await route.fulfill({
          status: 500,
          json: { error: { code: 'fixture_failure', message: 'list failed' } },
        })
        return
      }
      const current = Number(url.searchParams.get('page') || 1)
      const sorted = [...rows].reverse()
      await route.fulfill({
        json: {
          data: sorted.slice((current - 1) * 20, current * 20),
          pagination: {
            page: current,
            page_size: 20,
            total: rows.length,
            total_pages: 2,
          },
        },
      })
    } else await route.continue()
  })
  await page.route('**/api/v1/admin/comment-threads', (route) =>
    route.fulfill({ json: { data: [] } }),
  )
  return {
    read,
    acknowledgements,
    replyTargets,
    allowRead: () => {
      failRead = false
    },
    allowDiscussion: () => {
      failDiscussion = false
    },
    failList: () => {
      listFailed = true
    },
    allowList: () => {
      listFailed = false
    },
  }
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

async function expectCount(page: Page, count: number) {
  if (count)
    await expect(page.locator('.admin-shell__nav-badge').first()).toHaveText(
      String(count),
    )
  else await expect(page.locator('.admin-shell__nav-badge')).toHaveCount(0)
}

test('only the loaded page is read; a concurrent arrival stays unread across navigation and reload', async ({
  page,
}) => {
  const state = await fixture(page, { arrival: true })
  await login(page)
  await page.goto('/admin/comments')
  await expect(page.locator('.admin-comment-card')).toHaveCount(20)
  await expectCount(page, 2)
  expect(state.acknowledgements[0]).toHaveLength(20)
  expect(state.read.has(1)).toBe(false)
  expect(state.read.has(22)).toBe(false)
  await page.getByRole('button', { name: '下一页' }).click()
  await expectCount(page, 1)
  await page.getByRole('button', { name: '上一页' }).click()
  await expectCount(page, 0)
  await page.goto('/admin')
  await expectCount(page, 0)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  await expectCount(page, 0)
})

test('cross-page reply context and full discussion render; Escape restores focus and reply targets the root', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const state = await fixture(page)
  await login(page)
  await page.goto('/admin/comments')
  const card = page.locator('.admin-comment-card').first()
  await expect(card.getByText('回复原评论 · @原作者')).toBeVisible()
  await expect(card.getByText('原评论内容与上下文')).toBeVisible()
  const resourceLink = await card
    .locator('.admin-comment-card__resource a')
    .evaluate((e) => ({
      height: e.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(e).lineHeight),
    }))
  expect(resourceLink.height).toBeLessThanOrEqual(resourceLink.lineHeight + 1)
  await expectCount(page, 1)
  await card.screenshot({
    path: path.join(
      os.tmpdir(),
      `blog-comment-reply-${testInfo.project.name}.png`,
    ),
    caret: 'initial',
  })
  const opener = card.getByRole('button', { name: '查看完整讨论' })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: '完整讨论' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.admin-comment-card')).toHaveCount(21)
  await expectCount(page, 0)
  const heading = dialog.locator('.comment-markdown h1').first()
  expect(
    await heading.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThan(16)
  expect(
    await dialog
      .locator('.comment-markdown ul')
      .first()
      .evaluate((e) => getComputedStyle(e).listStyleType),
  ).toBe('disc')
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  )
  await dialog.screenshot({
    path: path.join(
      os.tmpdir(),
      `blog-comment-discussion-${testInfo.project.name}.png`,
    ),
    caret: 'initial',
  })
  await dialog.locator('.admin-comment-card').nth(1).scrollIntoViewIfNeeded()
  await expect(
    dialog.getByRole('button', { name: '关闭完整讨论' }),
  ).toBeVisible()
  await dialog.screenshot({
    path: path.join(
      os.tmpdir(),
      `blog-comment-discussion-reply-${testInfo.project.name}.png`,
    ),
    caret: 'initial',
  })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await card.getByRole('textbox').fill('Owner reply')
  await card.getByRole('button', { name: '发布回复' }).click()
  await expect(page.locator('.admin-comments-page__notice')).toContainText(
    '已使用“博主”身份回复',
  )
  expect(state.replyTargets).toEqual([1])
  expect(errors).toEqual([])
})

test('read and discussion failures keep the list and unread reminder and offer retries', async ({
  page,
}) => {
  const state = await fixture(page, { failRead: true, failDiscussion: true })
  await login(page)
  await page.goto('/admin/comments')
  await expect(page.getByRole('alert')).toContainText('已读状态保存失败')
  await expectCount(page, 21)
  state.allowRead()
  await page.getByRole('button', { name: '重试保存已读状态' }).click()
  await expectCount(page, 1)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page
    .locator('.admin-comment-card')
    .first()
    .getByRole('button', { name: '查看完整讨论' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('alert')).toContainText('完整讨论暂时无法加载')
  await expectCount(page, 1)
  state.allowDiscussion()
  await dialog.getByRole('button', { name: '重试加载讨论' }).click()
  await expect(dialog.locator('.admin-comment-card')).toHaveCount(21)
  await expectCount(page, 0)
})

test('a failed list request never acknowledges the page', async ({ page }) => {
  const state = await fixture(page)
  state.failList()
  await login(page)
  await page.goto('/admin/comments')
  await expect(page.getByRole('alert')).toContainText('暂时无法加载')
  await expectCount(page, 21)
  expect(state.acknowledgements).toEqual([])
  state.allowList()
  await page.getByRole('button', { name: '重新加载评论' }).click()
  await expect(page.locator('.admin-comment-card')).toHaveCount(20)
  await expectCount(page, 1)
})

test('public body and preview share Markdown hierarchy and code remains within the viewport', async ({
  page,
}) => {
  await page.route('**/api/v1/comments/session', (route) =>
    route.fulfill({
      json: {
        data: {
          github_login_enabled: true,
          commenter: {
            github_user_id: '1',
            login: 'reader',
            avatar_url: null,
            profile_url: 'https://github.com/reader',
            is_banned: false,
          },
        },
      },
    }),
  )
  await page.route('**/api/v1/comments/posts/**', (route) =>
    route.fulfill({
      json: {
        data: {
          resource_key: 'post:1',
          is_open: true,
          comment_count: 1,
          has_more: false,
          next_cursor: null,
          comments: [
            {
              id: 1,
              author: {
                kind: 'commenter',
                name: 'reader',
                avatar_url: null,
                profile_url: null,
              },
              body_html: html,
              body_markdown: '# 一级标题',
              state: 'visible',
              created_at: '2026-10-01T08:00:00Z',
              edited_at: null,
              can_edit: false,
              like_count: 0,
              liked_by_me: false,
              replies: [],
            },
          ],
        },
      },
    }),
  )
  await page.route('**/api/v1/comments/preview', (route) =>
    route.fulfill({ json: { data: { html } } }),
  )
  await page.goto('/posts/markdown-first')
  const section = page.locator('.comment-section')
  await expect(section.locator('.comment-item__body h1')).toBeVisible()
  expect(
    await section
      .locator('.comment-item__body h1')
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThan(16)
  await section.getByRole('textbox', { name: '评论内容' }).fill('# 一级标题')
  await section.getByRole('button', { name: '预览', exact: true }).click()
  await expect(section.locator('.comment-composer__preview h1')).toBeVisible()
  expect(
    await section
      .locator('.comment-composer__preview h1')
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThan(16)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
