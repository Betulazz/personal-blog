import { expect, test } from '@playwright/test'

test('migrated Chatter images retain accessible fallback', async ({ page }) => {
  await page.goto('/chatter?entry=102')
  await page.waitForLoadState('networkidle')
  const image = page.getByRole('img', { name: '窗边摊开的书' })
  await expect(image).toBeVisible()
  await image.evaluate((element) => element.dispatchEvent(new Event('error')))
  await expect(page.getByRole('img', { name: /媒体暂不可用/ })).toBeVisible()
  await expect(page.getByText('把一段很久没有读完的书重新翻开。')).toBeVisible()
})

test('feed empty and stale pages recover to the collection', async ({
  page,
}) => {
  for (const route of ['/moments', '/chatter']) {
    await page.goto(`${route}?q=definitely-no-match`)
    await expect(page.getByRole('article')).toHaveCount(0)
    await expect(page.getByText(/还没有找到/)).toBeVisible()
    await page.goto(`${route}?page=999`)
    await expect(page.getByText('这一页暂不存在')).toBeVisible()
  }
})
