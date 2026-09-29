import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { mockFixtureMedia } from './support/fixture-media'

const viewports = [
  { name: '375x812', width: 375, height: 812 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
]

async function setProgress(page: Page, seconds: number) {
  const range = page
    .getByTestId('home-music-card')
    .getByRole('slider', { name: '播放进度' })
  await range.evaluate((input, value) => {
    const slider = input as HTMLInputElement
    slider.value = String(value)
    slider.dispatchEvent(new Event('input', { bubbles: true }))
  }, seconds)
}

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
  await page.route('**/music-tracks/*/lyrics', async (route) => {
    const trackId = Number(
      new URL(route.request().url()).pathname.match(
        /music-tracks\/(\d+)\/lyrics/,
      )?.[1],
    )
    await route.fulfill({
      json: {
        data: {
          track_id: trackId,
          status: trackId === 2 ? 'missing' : 'available',
          lines:
            trackId === 2
              ? []
              : [
                  { time_ms: 0, text: '月光落在窗边', translation: null },
                  {
                    time_ms: 24_000,
                    text: '星河落入远方',
                    translation: 'The stars drift away',
                  },
                ],
        },
      },
    })
  })
  await page.route('**/song/media/outer/url**', (route) =>
    route.fulfill({
      body: Buffer.from([0x49, 0x44, 0x33]),
      contentType: 'audio/mpeg',
      status: 200,
    }),
  )
  await page.addInitScript(() => {
    const mediaPrototype = HTMLMediaElement.prototype
    const currentTimes = new WeakMap<HTMLMediaElement, number>()

    mediaPrototype.load = () => undefined
    mediaPrototype.play = function play(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    }
    mediaPrototype.pause = function pause(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'))
    }

    Object.defineProperty(mediaPrototype, 'currentTime', {
      configurable: true,
      get() {
        return currentTimes.get(this as HTMLMediaElement) ?? 0
      },
      set(value: number) {
        currentTimes.set(this as HTMLMediaElement, Number(value))
      },
    })
    Object.defineProperty(mediaPrototype, 'duration', {
      configurable: true,
      get: () => 180,
    })
  })
})

test('renders the profile, music and lyrics at every established viewport', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    consoleProblems.push(`pageerror: ${error.message}`)
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await expect(page).toHaveURL(/\/$/)
  await expect(page).toHaveTitle('夜航手记')
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /这一页.*留给今天/,
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: '开始阅读' })).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: '主导航' })
      .getByRole('link', { name: '关于' }),
  ).toBeVisible()

  const profile = page.locator('[data-homepage-profile]')
  const musicCard = page.getByTestId('home-music-card')
  const lyricStrip = page.getByTestId('home-lyric-strip')
  await expect(profile).toHaveCount(1)
  await expect(profile.getByRole('heading', { name: '夜航手记' })).toBeVisible()
  await expect(profile).toContainText('关于技术、生活与缓慢生长的个人记录。')
  await expect(profile.locator('img')).toHaveAttribute('alt', '夜航手记头像')
  await expect(profile.getByText('公开文章')).toBeVisible()
  await expect(profile.getByText('公开杂谈')).toBeVisible()
  await expect(profile.getByText('精选项目')).toBeVisible()
  await expect(
    profile.getByRole('link', { name: 'GitHub（外部链接）' }),
  ).toBeVisible()
  await expect(
    profile.getByRole('link', { name: 'Mastodon（外部链接）' }),
  ).toBeVisible()

  await expect(musicCard).toBeVisible()
  await expect(
    musicCard.getByRole('heading', { name: '月光落在窗边' }),
  ).toBeVisible()
  await expect(musicCard.getByText('本地示例音源')).toBeVisible()
  await expect(
    musicCard.getByRole('slider', { name: '播放进度' }),
  ).toBeDisabled()
  await expect(musicCard.getByText('03:34')).toBeVisible()
  await expect(
    musicCard.getByRole('link', { name: '完整音乐页' }),
  ).toHaveAttribute('href', '/music')
  await expect(musicCard.getByRole('button', { name: '上一首' })).toBeVisible()
  await expect(musicCard.getByRole('button', { name: '播放' })).toBeVisible()
  await expect(musicCard.getByRole('button', { name: '下一首' })).toBeVisible()
  await expect(musicCard.locator('img')).toHaveAttribute(
    'alt',
    '月光落在窗边的示例封面',
  )
  await expect(lyricStrip).toBeVisible()
  await expect(lyricStrip.locator('.home-lyrics__line')).toHaveText(
    '播放或定位后显示同步歌词',
  )

  await expect(page.locator('[data-testid="music-player"]')).toHaveCount(0)
  await expect(page.locator('.hero__window')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '最新文章' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '最近杂谈' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '精选项目' })).toBeVisible()
  await expect(
    page.locator('.nuxt-error, nextjs-portal, [data-vite-error-overlay]'),
  ).toHaveCount(0)

  const evidenceDirectory =
    process.env.BLOG_HOME_SCREENSHOT_DIR ??
    join(tmpdir(), 'blog-home-profile-music')
  await mkdir(evidenceDirectory, { recursive: true })

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    const layout = await page.evaluate(() => {
      const profileElement = document.querySelector('[data-homepage-profile]')!
      const headline = document.querySelector('#hero-title')!
      const action = document.querySelector('.hero__read')!
      const hero = document.querySelector('.hero')!
      return {
        actionBottom: action.getBoundingClientRect().bottom,
        clientWidth: document.documentElement.clientWidth,
        headlineBottom: headline.getBoundingClientRect().bottom,
        heroBottom: hero.getBoundingClientRect().bottom,
        profileTop: profileElement.getBoundingClientRect().top,
        scrollWidth: document.documentElement.scrollWidth,
      }
    })

    expect(
      layout.scrollWidth,
      `${viewport.name} should not overflow horizontally`,
    ).toBeLessThanOrEqual(layout.clientWidth)

    if (viewport.width === 430) {
      expect(layout.actionBottom).toBeLessThanOrEqual(viewport.height)
      expect(layout.headlineBottom).toBeLessThanOrEqual(viewport.height)
      expect(layout.profileTop).toBeGreaterThanOrEqual(layout.heroBottom)
    }

    const viewportPath = join(
      evidenceDirectory,
      `home-${viewport.name}-viewport.png`,
    )
    const fullPagePath = join(
      evidenceDirectory,
      `home-${viewport.name}-full-page.png`,
    )
    await mkdir(dirname(viewportPath), { recursive: true })
    await page.screenshot({ path: viewportPath, fullPage: false, scale: 'css' })
    await page.screenshot({ path: fullPagePath, fullPage: true, scale: 'css' })
  }

  expect(consoleProblems).toEqual([])
})

test('shares playback, seeking and lyric state with the Music page', async ({
  page,
}) => {
  const playbackRequests: string[] = []
  page.on('request', (request) => {
    if (/music-tracks\/\d+\/playback/.test(request.url())) {
      playbackRequests.push(request.url())
    }
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const musicCard = page.getByTestId('home-music-card')
  const lyricStrip = page.getByTestId('home-lyric-strip')
  const audio = page.getByTestId('music-engine')
  await expect(
    musicCard.getByRole('heading', { name: '月光落在窗边' }),
  ).toBeVisible()
  await expect(audio).toHaveCount(1)
  await expect(lyricStrip).toContainText('播放或定位后显示同步歌词')
  expect(playbackRequests).toHaveLength(0)

  const playButton = musicCard.getByRole('button', { name: '播放' })
  await playButton.focus()
  await expect(playButton).toBeFocused()
  await page.keyboard.press('Space')
  await expect
    .poll(() =>
      playButton.evaluate((button) => getComputedStyle(button).outlineStyle),
    )
    .toBe('solid')
  await expect(musicCard.getByRole('button', { name: '暂停' })).toBeVisible()
  expect(playbackRequests).toHaveLength(1)

  await audio.evaluate((element) =>
    element.dispatchEvent(new Event('loadedmetadata')),
  )
  const progress = musicCard.getByRole('slider', { name: '播放进度' })
  await expect(progress).toBeEnabled()
  await setProgress(page, 24)
  await expect(lyricStrip).toContainText('星河落入远方')
  await musicCard.getByRole('button', { name: '暂停' }).click()
  await expect(musicCard.getByRole('button', { name: '播放' })).toBeVisible()
  await expect(lyricStrip).toContainText('星河落入远方')

  await musicCard.getByRole('button', { name: '下一首' }).click()
  await expect(
    musicCard.getByRole('heading', { name: '雨落在玻璃上' }),
  ).toBeVisible()
  await expect(lyricStrip).toContainText('暂无同步歌词')
  await expect(lyricStrip).not.toContainText('星河落入远方')
  await expect(
    musicCard.getByRole('img', { name: '雨落在玻璃上 的封面暂不可用' }),
  ).toBeVisible()
  await expect(audio).toHaveCount(1)

  await musicCard.getByRole('button', { name: '上一首' }).click()
  await expect(
    musicCard.getByRole('heading', { name: '月光落在窗边' }),
  ).toBeVisible()
  await musicCard.getByRole('button', { name: '下一首' }).click()
  await expect(
    musicCard.getByRole('heading', { name: '雨落在玻璃上' }),
  ).toBeVisible()

  const requestsBeforeNavigation = playbackRequests.length
  await musicCard.getByRole('link', { name: '完整音乐页' }).click()
  await expect(page).toHaveURL(/\/music$/)
  await expect(page.locator('.music-page__track-info h2')).toHaveText(
    '雨落在玻璃上',
  )
  await expect(audio).toHaveCount(1)
  expect(playbackRequests).toHaveLength(requestsBeforeNavigation)

  const navigation = page.getByRole('navigation', { name: '主导航' })
  await navigation.getByRole('link', { name: '项目' }).click()
  await expect(page).toHaveURL(/\/projects(?:\?.*)?$/)
  const compactPlayer = page.getByTestId('music-player')
  await expect(compactPlayer).toBeVisible()
  await expect(compactPlayer).toContainText('雨落在玻璃上')
  await expect(
    compactPlayer.getByRole('button', { name: '暂停' }),
  ).toBeVisible()
  await expect(audio).toHaveCount(1)
  expect(playbackRequests).toHaveLength(requestsBeforeNavigation)

  await compactPlayer.getByRole('button', { name: '暂停' }).click()
  await navigation.getByRole('link', { name: '首页' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByTestId('home-music-card').getByRole('heading', {
      name: '雨落在玻璃上',
    }),
  ).toBeVisible()
  await expect(
    page.getByTestId('home-music-card').getByRole('button', { name: '播放' }),
  ).toBeVisible()
  await expect(audio).toHaveCount(1)
  expect(playbackRequests).toHaveLength(requestsBeforeNavigation)
})

test('does not activate lyrics that have no usable timestamp', async ({
  page,
}) => {
  await page.route('**/music-tracks/*/lyrics', async (route) => {
    const trackId = Number(
      new URL(route.request().url()).pathname.match(
        /music-tracks\/(\d+)\/lyrics/,
      )?.[1],
    )
    await route.fulfill({
      json: {
        data: {
          track_id: trackId,
          status: 'available',
          lines: [
            { time_ms: null, text: '没有时间戳的歌词', translation: null },
            { time_ms: Number.NaN, text: '無效時間', translation: null },
          ],
        },
      },
    })
  })

  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/')

  const musicCard = page.getByTestId('home-music-card')
  const lyricStrip = page.getByTestId('home-lyric-strip')
  await musicCard.getByRole('button', { name: '播放' }).click()
  await page
    .getByTestId('music-engine')
    .evaluate((element) => element.dispatchEvent(new Event('loadedmetadata')))
  await setProgress(page, 45)

  await expect(lyricStrip).toContainText('暂无同步歌词')
  await expect(lyricStrip).not.toContainText('没有时间戳的歌词')
  await expect(lyricStrip).not.toContainText('無效時間')
})

test('falls back to the site monogram when the configured avatar fails', async ({
  page,
}) => {
  const avatarFailure = page.waitForEvent('requestfailed', (request) =>
    request.url().includes('site-avatar.webp'),
  )
  await page.route('**/*site-avatar.webp*', (route) => route.abort())
  await page.goto('/')
  await avatarFailure

  const profile = page.locator('[data-homepage-profile]')
  await expect(profile.locator('img')).toHaveCount(0)
  await expect(profile.getByRole('img', { name: '夜航手记头像' })).toBeVisible()
})

test('honors reduced motion for record rotation and lyric reveal', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const motion = await page.evaluate(() => ({
    recordAnimation: getComputedStyle(
      document.querySelector('.home-music__record')!,
    ).animationName,
    lyricTransition: getComputedStyle(
      document.querySelector('.home-lyrics__line')!,
    ).transitionDuration,
  }))
  expect(motion.recordAnimation).toBe('none')
  expect(Number.parseFloat(motion.lyricTransition)).toBeLessThanOrEqual(0.00001)
})
