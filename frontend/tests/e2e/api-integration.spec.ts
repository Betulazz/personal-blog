import { expect, test, type Page } from '@playwright/test'

const apiStub = 'http://127.0.0.1:8787'

const setApiFailure = async (page: Page, resource: string) => {
  await page.request.get(`${apiStub}/__control/reset`)
  await page.request.get(`${apiStub}/__control/failure?resource=${resource}`)
}

test.afterEach(async ({ page }) => {
  await page.request.get(`${apiStub}/__control/reset`)
})

test('SSR sends meaningful homepage content without a duplicate browser read', async ({
  page,
}) => {
  const browserApiRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) {
      browserApiRequests.push(request.url())
    }
  })

  await page.goto('/')
  await expect(
    page.getByRole('article').filter({ hasText: '把复杂的东西' }),
  ).toBeVisible()
  await expect(
    page.getByRole('article').filter({ hasText: 'Lumen Notes' }),
  ).toBeVisible()
  await page.waitForTimeout(500)

  expect(browserApiRequests).toEqual([])
})

test('homepage keeps successful sections visible when one live API fails', async ({
  page,
}) => {
  await setApiFailure(page, 'projects')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '最新文章' })).toBeVisible()
  await expect(
    page.getByRole('article').filter({ hasText: '把复杂的东西' }),
  ).toBeVisible()
  await expect(
    page.getByRole('alert').filter({ hasText: '精选项目' }),
  ).toBeVisible()
  await page.request.get(`${apiStub}/__control/reset`)
})

test('post discovery exposes a safe full error state for a failed live read', async ({
  page,
}) => {
  await setApiFailure(page, 'posts')
  await page.goto('/search?q=Markdown')

  await expect(page.getByRole('alert')).toContainText('暂时无法加载搜索结果')
  await expect(page.getByRole('alert')).not.toContainText(
    'upstream_unavailable',
  )
  await expect(page.getByRole('alert')).not.toContainText('SQL')
  await page.request.get(`${apiStub}/__control/reset`)
})

test('site settings and music failures expose safe recovery states', async ({
  page,
}) => {
  await setApiFailure(page, 'settings')
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText(
    '站点设置暂时无法加载，当前显示基础信息。',
  )
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible()

  await page.request.get(`${apiStub}/__control/reset`)
  await setApiFailure(page, 'music-tracks')
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('音乐暂时无法加载')
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible()
})
