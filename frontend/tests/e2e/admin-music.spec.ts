import { expect, test, type Page } from '@playwright/test'

const control = 'http://127.0.0.1:8787/__control'

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('administrator curates ordered legal music tracks', async ({ page }) => {
  await login(page)
  await page.goto('/admin/music')

  await expect(page.getByRole('heading', { name: '音乐管理' })).toBeVisible()
  await expect(page.getByText('共 3 首')).toBeVisible()
  await expect(page.getByText('公开播放列表：2 首已启用')).toBeVisible()
  await expect(page.getByText('需要检查：1 首')).toBeVisible()

  const firstRow = rowFor(page, '月光落在窗边')
  await expect(firstRow.getByText('已启用', { exact: true })).toBeVisible()
  await expect(firstRow.getByText('音源有效', { exact: true })).toBeVisible()
  await expect(firstRow.getByText('远程 URL ·', { exact: false })).toBeVisible()

  const legacyRow = rowFor(page, '旧磁带')
  await expect(legacyRow.getByText('已停用', { exact: true })).toBeVisible()
  await expect(legacyRow.getByText('需要检查', { exact: true })).toBeVisible()
  await expect(
    legacyRow.getByText('本地媒体必须使用 /uploads/ 下已经上传的文件路径。'),
  ).toBeVisible()

  await expect(page.locator('[data-testid="music-track-row"]')).toHaveCount(3)
  expect(await rowTitles(page)).toEqual([
    '月光落在窗边',
    '雨落在玻璃上',
    '旧磁带',
  ])

  await page.getByRole('button', { name: '上移 雨落在玻璃上' }).click()
  await expect
    .poll(() => rowTitles(page))
    .toEqual(['雨落在玻璃上', '月光落在窗边', '旧磁带'])

  await page.reload()
  await expect(page.locator('[data-testid="music-track-row"]')).toHaveCount(3)
  expect(await rowTitles(page)).toEqual([
    '雨落在玻璃上',
    '月光落在窗边',
    '旧磁带',
  ])

  const disabledRow = rowFor(page, '雨落在玻璃上')
  await disabledRow.getByRole('button', { name: '停用' }).click()
  await expect(disabledRow.getByText('已停用', { exact: true })).toBeVisible()
  await expect(page.getByText('公开播放列表：1 首已启用')).toBeVisible()

  await disabledRow.getByRole('button', { name: '启用' }).click()
  await expect(disabledRow.getByText('已启用', { exact: true })).toBeVisible()
  await expect(page.getByText('公开播放列表：2 首已启用')).toBeVisible()

  await page.getByRole('link', { name: '新建音乐' }).click()
  await page.getByLabel('音乐标题').fill('夜潮')
  await page.getByLabel('艺术家').fill('示例音源')
  await page.getByLabel('时长（秒）').fill('180')
  await page.getByLabel('展示顺序').fill('5')
  await page
    .getByLabel('音源地址')
    .fill('https://example.com/audio/night-tide.mp3')
  await page.getByLabel('封面 URL').fill('/uploads/images/night-tide.webp')
  await page.getByLabel('封面替代文本').fill('夜潮封面')
  await page.getByRole('button', { name: '保存音乐' }).click()

  await expect(page).toHaveURL(/\/admin\/music\/\d+\/edit$/)
  await expect(page.getByRole('heading', { name: '夜潮' })).toBeVisible()
  await page.getByRole('link', { name: '返回音乐管理' }).click()
  await expect(page.getByText('共 4 首')).toBeVisible()
  expect(await rowTitles(page)).toEqual([
    '雨落在玻璃上',
    '月光落在窗边',
    '旧磁带',
    '夜潮',
  ])

  await rowFor(page, '夜潮').getByRole('link', { name: '编辑' }).click()
  await page.getByLabel('音乐标题').fill('夜潮 II')
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page.getByText('已保存', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '夜潮 II' })).toBeVisible()

  await page.getByRole('link', { name: '返回音乐管理' }).click()
  await rowFor(page, '夜潮 II')
    .getByRole('button', { name: '删除 夜潮 II' })
    .click()
  await expect(
    page.getByRole('dialog', { name: '确认删除这首音乐？' }),
  ).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '取消' }).click()
  await expect(rowFor(page, '夜潮 II')).toBeVisible()

  await rowFor(page, '夜潮 II')
    .getByRole('button', { name: '删除 夜潮 II' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认删除', exact: true })
    .click()
  await expect(page.getByText('共 3 首')).toBeVisible()
  await expect(page.getByText('夜潮 II')).toHaveCount(0)
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

test('music editor accepts only supported legal source strategies', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/music/new')

  const strategy = page.getByRole('combobox', { name: '来源策略' })
  await expect(strategy).toHaveText(/远程 URL/)
  await strategy.click()
  const options = page.getByRole('option')
  await expect(options).toHaveCount(3)
  await expect(page.getByRole('option', { name: '本地媒体' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'S3 兼容存储' })).toBeVisible()
  await page.getByRole('option', { name: '本地媒体' }).press('Enter')

  await page.getByLabel('音乐标题').fill('策略检查')
  await page.getByLabel('艺术家').fill('示例音源')
  await page
    .getByLabel('音源地址')
    .fill('https://example.com/audio/strategy-check.mp3')
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '本地媒体必须使用 /uploads/ 下已经上传的文件路径。',
  )
  await expect(page.getByLabel('音源地址')).toHaveValue(
    'https://example.com/audio/strategy-check.mp3',
  )

  await strategy.click()
  await page.getByRole('option', { name: '远程 URL' }).press('Enter')
  await page.getByLabel('音源地址').fill('/uploads/audio/strategy-check.mp3')
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '远程音源必须是完整的 http(s) 地址。',
  )

  await page
    .getByLabel('音源地址')
    .fill('https://user:pass@example.com/audio/strategy-check.mp3')
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '不能包含账号或密码',
  )

  await page
    .getByLabel('音源地址')
    .fill('https://example.com/audio/strategy-check.mp3?token=1')
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '不能包含查询参数或片段凭证',
  )

  await page.getByLabel('封面 URL').fill('javascript:alert(1)')
  await page
    .getByLabel('音源地址')
    .fill('https://example.com/audio/strategy-check.mp3')
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '封面必须是完整的 http(s) 地址。',
  )
  await expect(page.getByLabel('封面 URL')).toHaveValue('javascript:alert(1)')

  await page.getByLabel('封面 URL').fill('https://example.com/cover.webp')
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page).toHaveURL(/\/admin\/music\/\d+\/edit$/)

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
    .toEqual(['雨落在玻璃上', '月光落在窗边', '旧磁带'])

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
  await page.getByLabel('音乐标题').fill('仍然保留的音乐')
  await page.getByLabel('艺术家').fill('示例音源')
  await page.getByLabel('音源地址').fill('https://example.com/audio/kept.mp3')
  await page.request.get(`${control}/failure?resource=admin`)
  await page.getByRole('button', { name: '保存音乐' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    '后台服务暂时无法响应',
  )
  await expect(page.getByLabel('音乐标题')).toHaveValue('仍然保留的音乐')

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
    .toEqual(['雨落在玻璃上', '月光落在窗边', '旧磁带'])

  const moveDown = page.getByRole('button', { name: '下移 雨落在玻璃上' })
  await moveDown.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => rowTitles(page))
    .toEqual(['月光落在窗边', '雨落在玻璃上', '旧磁带'])

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
