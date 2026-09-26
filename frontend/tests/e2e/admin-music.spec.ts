import { expect, test, type Page } from '@playwright/test'

const control = 'http://127.0.0.1:8787/__control'

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('administrator imports songs by ID and curates the playlist', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/music')

  await expect(page.getByRole('heading', { name: '音乐管理' })).toBeVisible()
  await expect(page.getByText('共 3 首')).toBeVisible()
  await expect(page.getByText('公开播放列表：2 首已启用')).toBeVisible()
  const firstRow = rowFor(page, '月光落在窗边')
  await expect(firstRow.getByText('已启用', { exact: true })).toBeVisible()
  await expect(firstRow.getByText('网易云 ID 32001')).toBeVisible()

  const disabledRow = rowFor(page, '远岸星云')
  await expect(disabledRow.getByText('已停用', { exact: true })).toBeVisible()

  await expect(page.locator('[data-testid="music-track-row"]')).toHaveCount(3)
  expect(await rowTitles(page)).toEqual([
    '月光落在窗边',
    '雨落在玻璃上',
    '远岸星云',
  ])

  await page.getByRole('button', { name: '上移 雨落在玻璃上' }).click()
  await expect
    .poll(() => rowTitles(page))
    .toEqual(['雨落在玻璃上', '月光落在窗边', '远岸星云'])

  await page.reload()
  await expect(page.locator('[data-testid="music-track-row"]')).toHaveCount(3)
  expect(await rowTitles(page)).toEqual([
    '雨落在玻璃上',
    '月光落在窗边',
    '远岸星云',
  ])

  const reorderedRow = rowFor(page, '雨落在玻璃上')
  await reorderedRow.getByRole('button', { name: '停用' }).click()
  await expect(reorderedRow.getByText('已停用', { exact: true })).toBeVisible()
  await expect(page.getByText('公开播放列表：1 首已启用')).toBeVisible()

  await reorderedRow.getByRole('button', { name: '启用' }).click()
  await expect(reorderedRow.getByText('已启用', { exact: true })).toBeVisible()
  await expect(page.getByText('公开播放列表：2 首已启用')).toBeVisible()

  await page.getByRole('link', { name: '新建音乐' }).click()
  await page.getByLabel('网易云歌曲 ID').fill('445566')
  await page.getByRole('button', { name: '预览歌曲' }).click()
  await expect(
    page.getByLabel('网易云歌曲预览').getByText('歌曲 445566'),
  ).toBeVisible()
  await page.getByLabel('展示顺序').fill('5')
  await page.getByRole('button', { name: '导入到播放列表' }).click()

  await expect(page).toHaveURL(/\/admin\/music\/\d+\/edit$/)
  await expect(page.getByRole('heading', { name: '歌曲 445566' })).toBeVisible()
  await page.getByRole('link', { name: '返回音乐管理' }).click()
  await expect(page.getByText('共 4 首')).toBeVisible()
  expect(await rowTitles(page)).toEqual([
    '雨落在玻璃上',
    '月光落在窗边',
    '远岸星云',
    '歌曲 445566',
  ])

  await rowFor(page, '歌曲 445566').getByRole('link', { name: '编辑' }).click()
  await page.getByLabel('展示顺序').fill('6')
  await page.getByRole('button', { name: '保存列表设置' }).click()
  await expect(page.getByText('已保存', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '歌曲 445566' })).toBeVisible()

  await page.getByRole('link', { name: '返回音乐管理' }).click()
  await rowFor(page, '歌曲 445566')
    .getByRole('button', { name: '删除 歌曲 445566' })
    .click()
  await expect(
    page.getByRole('dialog', { name: '确认删除这首音乐？' }),
  ).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '取消' }).click()
  await expect(rowFor(page, '歌曲 445566')).toBeVisible()

  await rowFor(page, '歌曲 445566')
    .getByRole('button', { name: '删除 歌曲 445566' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page.getByText('共 3 首')).toBeVisible()
  await expect(page.getByText('歌曲 445566')).toHaveCount(0)
})

test('music management is discoverable from site settings', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: '网站设置' })).toBeVisible()
  await expect(page.getByText('播放列表本身在')).toBeVisible()
  await page.getByRole('link', { name: '音乐管理' }).click()
  await expect(page).toHaveURL(/\/admin\/music$/)
  await expect(page.getByRole('heading', { name: '音乐管理' })).toBeVisible()
})

test('music editor validates IDs, previews metadata and detects duplicates', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/music/new')

  const songId = page.getByLabel('网易云歌曲 ID')
  await songId.fill('12abc')
  await expect(page.getByRole('button', { name: '预览歌曲' })).toBeDisabled()
  await songId.fill('32001')
  await page.getByRole('button', { name: '预览歌曲' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '已经在播放列表中',
  )
  await expect(
    page.getByRole('button', { name: '导入到播放列表' }),
  ).toBeDisabled()

  await songId.fill('445577')
  await page.getByRole('button', { name: '预览歌曲' }).click()
  await expect(
    page.getByLabel('网易云歌曲预览').getByText('歌曲 445577'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '导入到播放列表' }),
  ).toBeEnabled()
  await expect(page.getByRole('combobox', { name: '来源策略' })).toHaveCount(0)

  const forbiddenWorkflows = await page
    .locator('button, a, input[type="search"]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.textContent?.trim() ?? '')
        .filter((text) =>
          /抓取|搜索音乐|音乐搜索|代理|镜像|目录同步/.test(text),
        ),
    )
  expect(forbiddenWorkflows).toEqual([])
})

test('public playlist follows administrator changes predictably', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/music')
  await page.getByRole('button', { name: '上移 雨落在玻璃上' }).click()
  await expect
    .poll(() => rowTitles(page))
    .toEqual(['雨落在玻璃上', '月光落在窗边', '远岸星云'])

  await page.goto('/')
  const player = page.getByRole('region', { name: '音乐播放器' })
  await expect(player).toHaveAttribute('data-player-ready', 'true')
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()
  await player.getByRole('button', { name: '下一首' }).click()
  await expect(player.getByText('月光落在窗边')).toBeVisible()

  await page.goto('/admin/music')
  await rowFor(page, '雨落在玻璃上')
    .getByRole('button', { name: '停用' })
    .click()
  await expect(page.getByText('公开播放列表：1 首已启用')).toBeVisible()

  await page.goto('/')
  await expect(player.getByText('月光落在窗边')).toBeVisible()

  await page.goto('/admin/music')
  await rowFor(page, '月光落在窗边')
    .getByRole('button', { name: '删除 月光落在窗边' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page.getByText('公开播放列表：0 首已启用')).toBeVisible()

  await page.goto('/')
  await expect(player).toContainText('暂时没有可播放的音乐。')

  await page.goto('/admin/music')
  await rowFor(page, '雨落在玻璃上')
    .getByRole('button', { name: '启用' })
    .click()
  await expect(page.getByText('公开播放列表：1 首已启用')).toBeVisible()

  await page.goto('/')
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()
})

test('music administration preserves input on failure and refreshes sessions', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/music/new')
  await page.getByLabel('网易云歌曲 ID').fill('445588')
  await page.getByRole('button', { name: '预览歌曲' }).click()
  await expect(
    page.getByLabel('网易云歌曲预览').getByText('歌曲 445588'),
  ).toBeVisible()
  await page.request.get(`${control}/failure?resource=admin`)
  await page.getByRole('button', { name: '导入到播放列表' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '后台服务暂时无法响应',
  )
  await expect(page.getByLabel('网易云歌曲 ID')).toHaveValue('445588')

  await page.request.get(`${control}/reset`)
  await login(page)
  await page.goto('/admin/music')
  await expect(page.locator('[data-testid="music-track-row"]')).toHaveCount(3)
  const before = await rowTitles(page)
  await page.request.get(`${control}/failure?resource=admin`)
  await page.getByRole('button', { name: `上移 ${before[1]}` }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '后台服务暂时无法响应',
  )
  expect(await rowTitles(page)).toEqual(before)

  await page.request.get(`${control}/reset`)
  await login(page)
  await page.request.get(`${control}/expire-access`)
  await page.goto('/admin/music')
  await expect(page.getByRole('heading', { name: '音乐管理' })).toBeVisible()
  await expect(page.locator('[data-testid="music-track-row"]')).toHaveCount(3)
})

test('mobile music administration stays touch-friendly and keyboard usable', async ({
  page,
}) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    const knownNuxtDevWarning =
      text.includes('[NUXT_E4011]') || text.includes('[nostics]')
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !knownNuxtDevWarning &&
      !text.includes('503 (Service Unavailable)')
    ) {
      consoleProblems.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (failure) =>
    consoleProblems.push(`pageerror: ${failure.message}`),
  )

  await page.setViewportSize({ width: 430, height: 932 })
  await login(page)
  await page.goto('/admin/music')
  await expect(page.getByRole('heading', { name: '音乐管理' })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)

  const moveUp = page.getByRole('button', { name: '上移 雨落在玻璃上' })
  await moveUp.focus()
  await expect(moveUp).toBeFocused()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => rowTitles(page))
    .toEqual(['雨落在玻璃上', '月光落在窗边', '远岸星云'])

  const moveDown = page.getByRole('button', { name: '下移 雨落在玻璃上' })
  await moveDown.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => rowTitles(page))
    .toEqual(['月光落在窗边', '雨落在玻璃上', '远岸星云'])

  expect(consoleProblems).toEqual([])
})

test('music administration fits the declared viewport matrix', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'The desktop project owns the fixed CSS viewport matrix.',
  )
  await login(page)
  const viewports = [
    { height: 812, width: 375 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
  ]
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const route of ['/admin/music', '/admin/music/1/edit']) {
      await page.goto(route)
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(
        dimensions.scrollWidth,
        `${route} at ${viewport.width}px admin viewport`,
      ).toBeLessThanOrEqual(dimensions.clientWidth)
      await expect(page.locator('main')).toBeVisible()
    }
    if (viewport.width === 430) {
      await page.goto('/admin/music')
      await page.screenshot({
        path: `test-results/admin-music/${testInfo.project.name}-430-viewport.png`,
        fullPage: false,
        scale: 'css',
      })
    }
    if (viewport.width === 1440) {
      await page.goto('/admin/music')
      await page.screenshot({
        path: `test-results/admin-music/${testInfo.project.name}-1440-viewport.png`,
        fullPage: false,
        scale: 'css',
      })
    }
  }
})

function rowFor(page: Page, title: string) {
  return page.locator(
    `[data-testid="music-track-row"][data-track-title="${title}"]`,
  )
}

async function rowTitles(page: Page) {
  return page
    .locator('[data-testid="music-track-row"]')
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('data-track-title') ?? ''),
    )
}

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
