import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { mockFixtureMedia } from './support/fixture-media'

async function openMusicPage(page: Page) {
  await page.goto('/music')
  await expect(page.locator('.music-page')).toHaveAttribute(
    'data-music-ready',
    'true',
  )
}

async function navigateTo(page: Page, href: string, label: string) {
  const desktopLink = page.locator(`nav[aria-label="主导航"] a[href="${href}"]`)
  if (await desktopLink.isVisible()) {
    await desktopLink.click()
  } else {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('button', { name: '打开主导航' }).click()
    await page
      .getByRole('navigation', { name: '移动端主导航' })
      .getByRole('link', { name: label })
      .click()
  }
  await expect(page).toHaveURL((url) => {
    const currentUrl = new URL(url)
    return (
      currentUrl.pathname === href &&
      (href !== '/projects' ||
        currentUrl.searchParams.get('type') === 'github_open_source')
    )
  })
}

async function setAudioTime(page: Page, currentTime: number) {
  await page.locator('audio').evaluate((audio, time) => {
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      writable: true,
      value: time,
    })
    audio.dispatchEvent(new Event('timeupdate'))
  }, currentTime)
}

test('keeps the compact player within mobile and desktop viewports', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  const evidenceDirectory =
    process.env.BLOG_MUSIC_SCREENSHOT_DIR ??
    join(tmpdir(), 'blog-compact-music-player')
  await mkdir(evidenceDirectory, { recursive: true })

  for (const viewport of [
    { name: '375x812', width: 375, height: 812 },
    { name: '430x932', width: 430, height: 932 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/posts')
    const player = page.getByTestId('music-player')
    await expect(player).toBeVisible()

    const layout = await page.evaluate(() => {
      const element = document.querySelector('[data-testid="music-player"]')!
      const rect = element.getBoundingClientRect()
      return {
        bottom: rect.bottom,
        clientWidth: document.documentElement.clientWidth,
        left: rect.left,
        right: rect.right,
        scrollWidth: document.documentElement.scrollWidth,
        top: rect.top,
      }
    })
    expect(layout.left).toBeGreaterThanOrEqual(0)
    expect(layout.right).toBeLessThanOrEqual(viewport.width)
    expect(layout.top).toBeGreaterThanOrEqual(0)
    expect(layout.bottom).toBeLessThanOrEqual(viewport.height)
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)

    await page.screenshot({
      path: join(
        evidenceDirectory,
        `compact-player-${testInfo.project.name}-${viewport.name}.png`,
      ),
      fullPage: false,
      scale: 'css',
    })
  }
})

test('keeps the compact player clear of the footer when space allows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/projects?type=github_open_source')

  const player = page.getByTestId('music-player')
  const footer = page.locator('.site-footer')
  await expect(player).toBeVisible()

  const topLayout = await page.evaluate(() => {
    const playerRect = document
      .querySelector('[data-testid="music-player"]')!
      .getBoundingClientRect()
    const footerRect = document
      .querySelector('.site-footer')!
      .getBoundingClientRect()
    return {
      footerTop: footerRect.top,
      playerBottom: playerRect.bottom,
      viewportHeight: window.innerHeight,
    }
  })
  expect(topLayout.playerBottom).toBeLessThanOrEqual(topLayout.viewportHeight)
  expect(topLayout.playerBottom).toBeLessThanOrEqual(topLayout.footerTop - 15)

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  )
  await expect(player).toHaveCount(0)

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(player).toBeVisible()
  await expect(footer).toBeVisible()
})

test.beforeEach(async ({ page }) => {
  await mockFixtureMedia(page)
  await page.route('**/song/media/outer/url**', (route) =>
    route.fulfill({
      body: Buffer.from([0x49, 0x44, 0x33]),
      contentType: 'audio/mpeg',
      status: 200,
    }),
  )
  await page.route('**/music-tracks/*/lyrics', (route) => {
    const trackId = Number(
      new URL(route.request().url()).pathname.match(
        /music-tracks\/(\d+)\/lyrics/,
      )?.[1],
    )
    route.fulfill({
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
                    time_ms: 24000,
                    text: '星河落入远方',
                    translation: 'The stars drift away',
                  },
                ],
        },
      },
    })
  })

  await page.addInitScript(() => {
    const mediaPrototype = HTMLMediaElement.prototype

    mediaPrototype.load = () => undefined
    mediaPrototype.play = function play(this: HTMLMediaElement) {
      if (
        (window as Window & { __rejectMusicPlayback?: boolean })
          .__rejectMusicPlayback
      ) {
        return Promise.reject(
          new DOMException('Playback was blocked', 'NotAllowedError'),
        )
      }
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    }
    mediaPrototype.pause = function pause(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'))
    }

    Object.defineProperty(mediaPrototype, 'duration', {
      configurable: true,
      get: () => 180,
    })
  })
})

test('starts long lyrics at the first line and keeps later lines in sync', async ({
  page,
}) => {
  await page.route('**/music-tracks/*/lyrics', (route) =>
    route.fulfill({
      json: {
        data: {
          track_id: Number(
            new URL(route.request().url()).pathname.match(
              /music-tracks\/(\d+)\/lyrics/,
            )?.[1],
          ),
          status: 'available',
          lines: Array.from({ length: 30 }, (_, index) => ({
            time_ms: index * 4000,
            text: `歌词第${index + 1}句`,
            translation: null,
          })),
        },
      },
    }),
  )

  await openMusicPage(page)
  const lyrics = page.locator('.music-page__lyrics')
  const firstLine = lyrics.locator('[data-lyric-index="0"]')
  const firstLineVisible = async () =>
    lyrics.evaluate((container) => {
      const first = container.querySelector('[data-lyric-index="0"]')!
      const containerRect = container.getBoundingClientRect()
      const firstRect = first.getBoundingClientRect()
      return (
        firstRect.top >= containerRect.top &&
        firstRect.bottom <= containerRect.bottom
      )
    })

  await expect(lyrics).toHaveJSProperty('scrollTop', 0)
  await expect.poll(firstLineVisible).toBe(true)
  await expect
    .poll(() =>
      lyrics.evaluate((container) => {
        const first = container.querySelector('[data-lyric-index="0"]')!
        return (
          first.getBoundingClientRect().top -
          container.getBoundingClientRect().top
        )
      }),
    )
    .toBeLessThanOrEqual(144)
  await expect(firstLine).not.toHaveAttribute('aria-current', 'true')

  await setAudioTime(page, 96)
  await expect(
    lyrics.getByRole('button', { name: '歌词第25句' }),
  ).toHaveAttribute('aria-current', 'true')
  await expect
    .poll(() =>
      lyrics.evaluate((container) => {
        const active = container.querySelector('[aria-current="true"]')!
        const containerRect = container.getBoundingClientRect()
        const activeRect = active.getBoundingClientRect()
        return (
          activeRect.top >= containerRect.top &&
          activeRect.bottom <= containerRect.bottom
        )
      }),
    )
    .toBe(true)

  await setAudioTime(page, 116)
  await expect(
    lyrics.getByRole('button', { name: '歌词第30句' }),
  ).toHaveAttribute('aria-current', 'true')
  await expect
    .poll(() =>
      lyrics.evaluate((container) => {
        const active = container.querySelector('[aria-current="true"]')!
        const containerRect = container.getBoundingClientRect()
        const activeRect = active.getBoundingClientRect()
        return (
          activeRect.top >= containerRect.top &&
          activeRect.bottom <= containerRect.bottom
        )
      }),
    )
    .toBe(true)
})

test('keeps time-zero lyrics at the initial position until the audio clock is established', async ({
  page,
}) => {
  await openMusicPage(page)
  const musicPage = page.locator('.music-page')
  const lyrics = musicPage.locator('.music-page__lyrics')
  const firstLine = lyrics.getByRole('button', { name: /月光落在窗边/ })

  await expect(firstLine).toBeVisible()
  await expect(lyrics.locator('[aria-current="true"]')).toHaveCount(0)
  await expect(lyrics).toHaveJSProperty('scrollTop', 0)

  await page.locator('audio').dispatchEvent('loadedmetadata')
  await expect(lyrics.locator('[aria-current="true"]')).toHaveCount(0)

  await musicPage.getByRole('button', { name: '播放', exact: true }).click()
  await page.locator('audio').evaluate((audio) => {
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      writable: true,
      value: 0.1,
    })
    audio.dispatchEvent(new Event('timeupdate'))
  })
  await expect(firstLine).toHaveAttribute('aria-current', 'true')
  await expect(lyrics.getByText('The stars drift away')).toBeVisible()
})

test('keeps one compact player and shared audio state across public routes', async ({
  page,
}) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    consoleProblems.push(`pageerror: ${error.message}`)
  })

  await page.goto('/')
  await expect(page.locator('[data-testid="music-player"]')).toHaveCount(0)
  await page.goto('/projects')
  const player = page.getByRole('region', { name: '音乐播放器' })
  await expect(player).toBeVisible()
  await expect(player).toHaveAttribute('data-player-ready', 'true')
  await expect(player).toHaveAttribute('data-compact-player', 'true')
  await expect(player.getByText('月光落在窗边')).toBeVisible()
  await expect(player.getByText('本地示例音源')).toBeVisible()
  await expect(player.getByText('播放后显示同步歌词')).toBeVisible()
  await expect(player.locator('.music-player__artwork')).toHaveAttribute(
    'alt',
    '月光落在窗边的示例封面',
  )
  await expect
    .poll(() =>
      player
        .locator('.music-player__artwork')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0)
  await expect(
    player.getByRole('button', { name: '播放', exact: true }),
  ).toBeVisible()
  await expect(player.getByRole('button', { name: '下一首' })).toBeVisible()
  await expect(player.getByRole('button', { name: '上一首' })).toHaveCount(0)
  await expect(player.getByRole('slider')).toHaveCount(0)
  await expect
    .poll(() =>
      page.locator('audio').evaluate((audio) => ({
        paused: audio.paused,
        hasSource: Boolean(audio.getAttribute('src')),
      })),
    )
    .toEqual({ paused: true, hasSource: false })

  const playButton = player.getByRole('button', { name: '播放', exact: true })
  await playButton.focus()
  await expect(playButton).toBeFocused()
  await expect
    .poll(() =>
      playButton.evaluate((button) => getComputedStyle(button).outlineWidth),
    )
    .toBe('2px')
  await playButton.press('Enter')
  await expect(player.getByRole('button', { name: '暂停' })).toBeVisible()
  await expect(player.locator('.music-player__record')).toHaveClass(
    /music-player__record--playing/,
  )

  await setAudioTime(page, 1)
  await expect(player.locator('.music-player__lyric')).toHaveText(
    '月光落在窗边',
  )
  await setAudioTime(page, 24)
  await expect(player.locator('.music-player__lyric')).toHaveText(
    '星河落入远方',
  )

  const audioMarker = await page.locator('audio').evaluate((audio) => {
    const marker = crypto.randomUUID()
    audio.dataset.testMarker = marker
    return marker
  })
  await navigateTo(page, '/music', '音乐')
  await expect(page.locator('[data-testid="music-player"]')).toHaveCount(0)
  await expect(page.locator('audio')).toHaveCount(1)
  await expect(page.locator('audio')).toHaveAttribute(
    'data-test-marker',
    audioMarker,
  )
  await expect(page.locator('.music-page__track-info h2')).toHaveText(
    '月光落在窗边',
  )
  await expect(
    page.locator('.music-page').getByRole('button', { name: '星河落入远方' }),
  ).toHaveAttribute('aria-current', 'true')

  await navigateTo(page, '/projects', '项目')
  await expect(player.getByText('星河落入远方')).toBeVisible()
  await expect(player.getByRole('button', { name: '暂停' })).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(1)
  await expect(page.locator('audio')).toHaveAttribute(
    'data-test-marker',
    audioMarker,
  )
  await player.getByRole('button', { name: '下一首' }).click()
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()
  await expect(player.getByText('暂无同步歌词')).toBeVisible()
  await navigateTo(page, '/music', '音乐')
  await expect(page.locator('[data-testid="music-player"]')).toHaveCount(0)
  await expect(page.locator('.music-page__track-info h2')).toHaveText(
    '雨落在玻璃上',
  )

  expect(consoleProblems).toEqual([])
})

test('keeps the mini-player lyric honest before the first line and after seek or track change', async ({
  page,
}) => {
  await page.route('**/music-tracks/1/lyrics', (route) =>
    route.fulfill({
      json: {
        data: {
          track_id: 1,
          status: 'available',
          lines: [
            { time_ms: 5000, text: '第一句延后出现', translation: null },
            { time_ms: 15000, text: '第二句歌词', translation: null },
          ],
        },
      },
    }),
  )
  await page.goto('/projects')
  const player = page.getByRole('region', { name: '音乐播放器' })
  await expect(player).toHaveAttribute('data-player-ready', 'true')
  const lyric = player.locator('.music-player__lyric')
  await expect(lyric).toHaveText('播放后显示同步歌词')
  await player.getByRole('button', { name: '播放', exact: true }).click()
  await expect(player.getByRole('button', { name: '暂停' })).toBeVisible()

  await setAudioTime(page, 1)
  await expect(lyric).toHaveText('前奏 · 暂无同步歌词')
  await setAudioTime(page, 5)
  await expect(lyric).toHaveText('第一句延后出现')
  await setAudioTime(page, 15)
  await expect(lyric).toHaveText('第二句歌词')
  await setAudioTime(page, 1)
  await expect(lyric).toHaveText('前奏 · 暂无同步歌词')

  await player.getByRole('button', { name: '下一首' }).click()
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()
  await expect(lyric).toHaveText('暂无同步歌词')
})

test('music page shares the mini-player, synchronized lyrics, playlist, and controls', async ({
  page,
}) => {
  await openMusicPage(page)
  await expect(page).toHaveURL(/\/music$/)
  await expect(
    page.getByRole('heading', { name: '音乐', exact: true }),
  ).toBeVisible()
  const musicPage = page.locator('.music-page')
  const progress = musicPage.getByRole('slider', { name: '播放进度' })
  await expect(page.getByRole('region', { name: '音乐播放器' })).toHaveCount(0)

  await expect(
    musicPage.getByText('月光落在窗边', { exact: true }).first(),
  ).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(
    musicPage.getByRole('button', { name: '星河落入远方' }),
  ).toBeVisible()
  await expect(
    musicPage.getByRole('button', { name: '星河落入远方' }),
  ).not.toHaveAttribute('aria-current', 'true')
  await expect(musicPage.getByText('The stars drift away')).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(1)
  await page.locator('audio').dispatchEvent('loadedmetadata')

  await musicPage.getByRole('button', { name: '播放', exact: true }).click()
  await expect(
    musicPage.getByRole('button', { name: '暂停', exact: true }),
  ).toBeVisible()
  await setAudioTime(page, 1)
  await expect(
    musicPage.getByRole('button', { name: /月光落在窗边/ }),
  ).toHaveAttribute('aria-current', 'true')
  await musicPage.getByRole('button', { name: '星河落入远方' }).click()
  await expect(progress).toHaveValue('24')
  await expect(
    musicPage.getByRole('button', { name: '星河落入远方' }),
  ).toHaveAttribute('aria-current', 'true')

  await navigateTo(page, '/projects', '项目')
  const miniPlayer = page.getByRole('region', { name: '音乐播放器' })
  await expect(miniPlayer.getByText('星河落入远方')).toBeVisible()
  await expect(miniPlayer.getByRole('button', { name: '暂停' })).toBeVisible()
  await navigateTo(page, '/music', '音乐')
  await expect(
    page.locator('.music-page').getByRole('button', { name: '星河落入远方' }),
  ).toHaveAttribute('aria-current', 'true')

  await musicPage.getByRole('button', { name: '播放模式：列表循环' }).click()
  await expect(
    musicPage.getByRole('button', { name: '播放模式：单曲循环' }),
  ).toBeVisible()
  await page.locator('audio').dispatchEvent('ended')
  await expect(progress).toHaveValue('0')
  await expect(
    musicPage.getByRole('button', { name: '暂停', exact: true }),
  ).toBeVisible()
  await musicPage.getByRole('button', { name: '播放模式：单曲循环' }).click()
  await expect(
    musicPage.getByRole('button', { name: '播放模式：随机播放' }),
  ).toBeVisible()
  const pageVolume = musicPage.getByRole('slider', { name: '音量' })
  await pageVolume.focus()
  await pageVolume.press('ArrowDown')
  await expect(pageVolume).toHaveValue('0.6')

  const playlistTab = musicPage.getByRole('button', { name: /^播放列表/ })
  await playlistTab.click()
  await expect(playlistTab).toHaveAttribute('aria-pressed', 'true')
  await musicPage.getByRole('button', { name: /雨落在玻璃上/ }).click()
  await expect(
    musicPage.getByRole('heading', { name: '雨落在玻璃上' }),
  ).toBeVisible()
  await musicPage.getByRole('button', { name: '歌词' }).click()
  await expect(musicPage.getByText('暂无歌词，继续听歌吧。')).toBeVisible()
  await expect(
    musicPage.locator('.music-page__lyrics [aria-current="true"]'),
  ).toHaveCount(0)
  await expect(
    musicPage.getByRole('button', { name: '暂停', exact: true }),
  ).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(1)

  const audioMarker = await page.locator('audio').evaluate((audio) => {
    const marker = crypto.randomUUID()
    audio.dataset.testMarker = marker
    return marker
  })
  await navigateTo(page, '/projects', '项目')
  await expect(miniPlayer.getByText('雨落在玻璃上')).toBeVisible()
  await expect(miniPlayer.getByRole('button', { name: '暂停' })).toBeVisible()
  await expect(miniPlayer.getByRole('button', { name: '上一首' })).toHaveCount(
    0,
  )
  await expect(miniPlayer.getByRole('slider')).toHaveCount(0)
  await expect(page.locator('audio')).toHaveCount(1)
  await expect(page.locator('audio')).toHaveAttribute(
    'data-test-marker',
    audioMarker,
  )
  await miniPlayer.getByRole('button', { name: '暂停' }).click()
  await expect(
    miniPlayer.getByRole('button', { name: '播放', exact: true }),
  ).toBeVisible()
  await navigateTo(page, '/music', '音乐')
  await expect(
    page
      .locator('.music-page')
      .getByRole('button', { name: '播放', exact: true }),
  ).toBeVisible()
  await expect(page.locator('audio')).toHaveAttribute(
    'data-test-marker',
    audioMarker,
  )
})

test('ignores stale playback resolution after rapid playlist switching', async ({
  page,
}) => {
  await page.route('**/music-tracks/1/playback', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    await route.fulfill({
      json: {
        data: {
          track_id: 1,
          netease_song_id: '32001',
          provider_url: 'https://music.163.com/song?id=32001',
          media_url: 'https://music.163.com/song/media/outer/url?id=32001.mp3',
        },
      },
    })
  })
  await openMusicPage(page)
  const musicPage = page.locator('.music-page')
  const playlistTab = musicPage.getByRole('button', { name: /^播放列表/ })
  await playlistTab.click()
  await expect(playlistTab).toHaveAttribute('aria-pressed', 'true')
  await musicPage.getByRole('button', { name: /月光落在窗边/ }).click()
  await musicPage.getByRole('button', { name: /雨落在玻璃上/ }).click()

  await expect(page.locator('audio')).toHaveAttribute('src', /id=32002\.mp3/)
  await page.waitForTimeout(450)
  await expect(page.locator('audio')).toHaveAttribute('src', /id=32002\.mp3/)
  await expect(
    musicPage.getByRole('heading', { name: '雨落在玻璃上' }),
  ).toBeVisible()
})

test('reports unavailable tracks and recovers without skipping in a loop', async ({
  page,
}) => {
  await page.route('**/music-tracks/1/lyrics', (route) =>
    route.fulfill({
      json: {
        data: {
          track_id: 1,
          status: 'available',
          lines: Array.from({ length: 12 }, (_, index) => ({
            time_ms: index * 6000,
            text: `歌词第${index + 1}句`,
            translation: null,
          })),
        },
      },
    }),
  )
  await page.route('**/music-tracks/2/playback', (route) =>
    route.fulfill({
      status: 404,
      json: { error: { code: 'music_track_not_found', message: 'Not found' } },
    }),
  )
  await openMusicPage(page)
  const musicPage = page.locator('.music-page')
  await setAudioTime(page, 48)
  const lyrics = musicPage.locator('.music-page__lyrics')
  await expect(
    musicPage.getByRole('button', { name: '歌词第9句' }),
  ).toHaveAttribute('aria-current', 'true')
  await expect
    .poll(() => lyrics.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const playlistTab = musicPage.getByRole('button', { name: /^播放列表/ })
  await playlistTab.click()
  await expect(playlistTab).toHaveAttribute('aria-pressed', 'true')
  await musicPage.getByRole('button', { name: /雨落在玻璃上/ }).click()
  await expect(musicPage.getByText('这首歌暂时无法播放。')).toBeVisible()
  await musicPage.getByRole('button', { name: '歌词' }).click()
  await expect(musicPage.getByText('暂无歌词，继续听歌吧。')).toBeVisible()
  await expect(lyrics.locator('[aria-current="true"]')).toHaveCount(0)
  await expect(lyrics).toHaveJSProperty('scrollTop', 0)
  await expect(musicPage.getByRole('slider', { name: '播放进度' })).toHaveValue(
    '0',
  )

  await musicPage.getByRole('button', { name: /^播放列表/ }).click()
  await musicPage.getByRole('button', { name: /月光落在窗边/ }).click()
  await expect(musicPage.getByText('这首歌暂时无法播放。')).toBeHidden()
  await expect(
    musicPage.getByRole('button', { name: '暂停', exact: true }),
  ).toBeVisible()
})

test('ignores a stale lyrics response after rapid track switching', async ({
  page,
}) => {
  let staleLyricsRouteStarted = false
  let staleLyricsRouteSettled = false
  let releaseStaleLyrics: () => void = () => undefined
  const staleLyricsGate = new Promise<void>((resolve) => {
    releaseStaleLyrics = resolve
  })
  await page.route('**/music-tracks/1/lyrics', async (route) => {
    staleLyricsRouteStarted = true
    await staleLyricsGate
    try {
      await route.fulfill({
        json: {
          data: {
            track_id: 1,
            status: 'available',
            lines: [{ time_ms: 0, text: '旧歌曲残留', translation: null }],
          },
        },
      })
    } catch {
      // Selecting another track can abort this response.
    } finally {
      staleLyricsRouteSettled = true
    }
  })

  await openMusicPage(page)
  await expect.poll(() => staleLyricsRouteStarted).toBe(true)
  const musicPage = page.locator('.music-page')
  const playlistTab = musicPage.getByRole('button', { name: /^播放列表/ })
  await playlistTab.click()
  await expect(playlistTab).toHaveAttribute('aria-pressed', 'true')
  await musicPage.getByRole('button', { name: /雨落在玻璃上/ }).click()
  await musicPage.getByRole('button', { name: '歌词' }).click()
  await expect(musicPage.getByText('暂无歌词，继续听歌吧。')).toBeVisible()

  releaseStaleLyrics()
  await expect.poll(() => staleLyricsRouteSettled).toBe(true)
  await expect(musicPage.getByText('旧歌曲残留')).toHaveCount(0)
  await expect(musicPage.getByText('暂无歌词，继续听歌吧。')).toBeVisible()
})

test('sizes the record correctly and respects reduced motion and pause', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openMusicPage(page)
  const record = page.locator('.music-page__record')
  const dimensions = await page.evaluate(() => {
    const disc = document.querySelector('.music-page__record')!
    const cover = document.querySelector(
      '.music-page__artwork, .music-page__record-fallback',
    )!
    const aperture = document.querySelector('.music-page__record-hole')!
    return {
      disc: disc.getBoundingClientRect().width,
      cover: cover.getBoundingClientRect().width,
      aperture: aperture.getBoundingClientRect().width,
      animation: getComputedStyle(disc).animationName,
    }
  })

  expect(dimensions.cover / dimensions.disc).toBeGreaterThanOrEqual(0.9)
  expect(dimensions.aperture / dimensions.disc).toBeGreaterThanOrEqual(0.16)
  expect(dimensions.aperture / dimensions.disc).toBeLessThanOrEqual(0.19)
  expect(dimensions.animation).toBe('none')

  await page
    .locator('.music-page')
    .getByRole('button', { name: '播放', exact: true })
    .click()
  await expect(record).toHaveClass(/music-page__record--playing/)
  await expect
    .poll(() =>
      record.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe('none')
  await page
    .locator('.music-page')
    .getByRole('button', { name: '暂停', exact: true })
    .click()
  await expect(record).not.toHaveClass(/music-page__record--playing/)
})

test('rotates the record only during playback and stops it on pause or source error', async ({
  page,
}) => {
  await openMusicPage(page)
  const musicPage = page.locator('.music-page')
  const record = musicPage.locator('.music-page__record')
  const playButton = musicPage.getByRole('button', {
    name: '播放',
    exact: true,
  })

  await expect(record).not.toHaveClass(/music-page__record--playing/)
  await expect
    .poll(() =>
      record.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe('none')

  await playButton.click()
  await expect(record).toHaveClass(/music-page__record--playing/)
  await expect
    .poll(() =>
      record.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toMatch(/^record-rotate/)
  await musicPage.getByRole('button', { name: '暂停', exact: true }).click()
  await expect(record).not.toHaveClass(/music-page__record--playing/)

  await playButton.click()
  await expect(record).toHaveClass(/music-page__record--playing/)
  await page.locator('audio').dispatchEvent('error')
  await expect(musicPage.getByText('这首歌暂时无法播放。')).toBeVisible()
  await expect(record).not.toHaveClass(/music-page__record--playing/)
  await expect
    .poll(() =>
      record.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe('none')
})

test('falls back for failed artwork and disables record rotation with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/images/background/ambient-640.avif', (route) =>
    route.abort(),
  )
  await page.goto('/projects')

  const player = page.getByRole('region', { name: '音乐播放器' })
  const record = player.locator('.music-player__record')
  await expect(
    player.getByRole('img', { name: /月光落在窗边.*封面暂不可用/ }),
  ).toBeVisible()
  await expect
    .poll(() =>
      record.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe('none')

  await player.getByRole('button', { name: '播放', exact: true }).click()
  await expect(record).toHaveClass(/music-player__record--playing/)
  await expect
    .poll(() =>
      record.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe('none')
  await player.getByRole('button', { name: '下一首' }).click()
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()
  await expect(
    player.getByRole('img', { name: /雨落在玻璃上.*封面暂不可用/ }),
  ).toBeVisible()
})

test('explains browser autoplay rejection and lets the visitor retry', async ({
  page,
}) => {
  await openMusicPage(page)
  await page.evaluate(() => {
    ;(
      window as Window & { __rejectMusicPlayback?: boolean }
    ).__rejectMusicPlayback = true
  })
  await page
    .locator('.music-page')
    .getByRole('button', { name: '播放', exact: true })
    .click()
  await expect(
    page.getByText('浏览器阻止了播放，请再次点击播放。'),
  ).toBeVisible()

  await page.evaluate(() => {
    ;(
      window as Window & { __rejectMusicPlayback?: boolean }
    ).__rejectMusicPlayback = false
  })
  await page
    .locator('.music-page')
    .getByRole('button', { name: '播放', exact: true })
    .click()
  await expect(
    page
      .locator('.music-page')
      .getByRole('button', { name: '暂停', exact: true }),
  ).toBeVisible()
})

test('explains unavailable media and provides keyboard-accessible recovery', async ({
  page,
}) => {
  await page.goto('/projects')
  const player = page.getByRole('region', { name: '音乐播放器' })
  const playButton = player.getByRole('button', { name: '播放', exact: true })

  await expect(player).toHaveAttribute('data-player-ready', 'true')
  await playButton.focus()
  await expect(playButton).toBeFocused()
  await playButton.press('Enter')
  await expect(page.locator('audio')).toHaveAttribute('src', /id=32001\.mp3/)
  await page.locator('audio').dispatchEvent('error')

  await expect(player.getByText('当前歌曲暂不可用')).toBeVisible()
  await expect(player.getByRole('button', { name: '播放' })).toBeVisible()

  await player.getByRole('button', { name: '下一首' }).press('Enter')
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()
  await expect(player.getByText('暂无同步歌词')).toBeVisible()
})
