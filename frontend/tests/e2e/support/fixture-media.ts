import { resolve } from 'node:path'

import type { Page } from '@playwright/test'

const exampleMediaFixture = resolve(
  process.cwd(),
  'public/images/portfolio/project-quiet.svg',
)

export async function mockFixtureMedia(page: Page) {
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.resourceType() !== 'image') {
      await route.continue()
      return
    }

    const url = new URL(request.url())
    const isLoopback =
      url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    if (isLoopback && !url.pathname.startsWith('/uploads/')) {
      await route.continue()
      return
    }

    await route.fulfill({ path: exampleMediaFixture })
  })
}
