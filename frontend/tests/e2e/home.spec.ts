import { expect, test } from '@playwright/test'

test('renders the architecture baseline', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Personal Blog',
  )
})
