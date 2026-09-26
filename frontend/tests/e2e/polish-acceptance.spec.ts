import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { expect, test, type Page } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

const publicPages = [
  { name: 'home', path: '/' },
  { name: 'posts', path: '/posts' },
  { name: 'timeline', path: '/moments' },
  { name: 'chatter', path: '/chatter' },
  { name: 'music', path: '/music' },
  { name: 'projects', path: '/projects' },
  { name: 'friends', path: '/friends' },
  { name: 'about', path: '/about' },
] as const

const adminPages = [
  { name: 'post-editor', path: '/admin/posts/new' },
  { name: 'tag-manager', path: '/admin/tags' },
  { name: 'project-editor', path: '/admin/projects/new' },
  { name: 'chatter-editor', path: '/admin/chatter/new' },
  { name: 'friend-link-editor', path: '/admin/friends/new' },
  { name: 'site-identity', path: '/admin/settings' },
] as const

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

const evidenceDirectory = resolve(
  process.env.POLISH_ACCEPTANCE_EVIDENCE ??
    join(tmpdir(), `personal-blog-v2-polish-${process.pid}`),
)

test('public and administrator polish surfaces fit the six-viewport screenshot matrix', async ({
  page,
}, testInfo) => {
  test.setTimeout(900_000)
  test.skip(
    testInfo.project.name !== 'chromium-production',
    'the explicit six-viewport matrix is captured once in desktop Chromium',
  )

  const browserProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserProblems.push(`console: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    browserProblems.push(`pageerror: ${error.message}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 500) {
      browserProblems.push(`response: ${response.status()} ${response.url()}`)
    }
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockFixtureMedia(page)
  await mkdir(evidenceDirectory, { recursive: true })

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const target of publicPages) {
      const response = await page.goto(target.path, {
        waitUntil: 'networkidle',
      })
      expect(response?.status(), target.path).toBe(200)
      await expect(page.locator('main h1').first(), target.path).toBeVisible()
      await expect(page.locator('[data-error-page]'), target.path).toHaveCount(
        0,
      )
      await assertNoHorizontalOverflow(page, target.path)
      await capturePair(page, 'public', target.name, viewport)
    }
  }

  await page.request.get('http://127.0.0.1:8787/__control/reset')
  await login(page)
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const target of adminPages) {
      const response = await page.goto(target.path, {
        waitUntil: 'networkidle',
      })
      expect(response?.status(), target.path).toBe(200)
      await expect(page.locator('#admin-main'), target.path).toBeVisible()
      await expect(page.locator('[data-error-page]'), target.path).toHaveCount(
        0,
      )
      await assertNoHorizontalOverflow(page, target.path)
      await capturePair(page, 'admin', target.name, viewport)
    }
  }

  expect(browserProblems).toEqual([])
})

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(
    dimensions.scrollWidth,
    `${route}: ${dimensions.scrollWidth}px exceeds ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth)
}

async function capturePair(
  page: Page,
  surface: 'public' | 'admin',
  name: string,
  viewport: { width: number; height: number },
) {
  const stem = `${surface}-${name}-${viewport.width}x${viewport.height}`
  await page.screenshot({
    path: join(evidenceDirectory, `${stem}-viewport.png`),
    scale: 'css',
  })
  await page.screenshot({
    fullPage: true,
    path: join(evidenceDirectory, `${stem}-full.png`),
    scale: 'css',
  })
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
