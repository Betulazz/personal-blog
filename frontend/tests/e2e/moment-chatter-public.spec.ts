import { expect, test } from '@playwright/test'

test('Chatter reader images retain accessible fallback', async ({ page }) => {
  await page.goto('/chatter/102')
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

test('opens Chatter in a focused reader at the top of the page', async ({
  page,
}, testInfo) => {
  await page.goto('/chatter')
  const entry = page.getByRole('article').first()
  await entry.getByRole('link', { name: /查看这条记录/ }).click()

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(40)
  await expect(page).toHaveURL(/\/chatter\/\d+$/)
  await expect(page.locator('.site-header')).toHaveCount(0)
  await expect(page.locator('[data-chatter-reader]')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(
    page.getByRole('progressbar', { name: '杂谈阅读进度' }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('chatter-reader.png'),
    fullPage: false,
    scale: 'css',
  })
})
