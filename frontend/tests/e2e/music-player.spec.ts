import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/audio/*.mp3', (route) =>
    route.fulfill({
      body: Buffer.from([0x49, 0x44, 0x33]),
      contentType: 'audio/mpeg',
      status: 200,
    }),
  )

  await page.addInitScript(() => {
    const mediaPrototype = HTMLMediaElement.prototype

    mediaPrototype.load = () => undefined
    mediaPrototype.play = function play(this: HTMLMediaElement) {
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

test('keeps one accessible player instance across client-side navigation', async ({
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
  const player = page.getByRole('region', { name: '音乐播放器' })
  await expect(player).toBeVisible()
  await expect(player).toHaveAttribute('data-player-ready', 'true')
  await expect(player.getByText('月光落在窗边')).toBeVisible()
  await expect(player.getByRole('button', { name: '上一首' })).toBeVisible()
  await expect(player.getByRole('button', { name: '播放' })).toBeVisible()
  await expect(player.getByRole('button', { name: '静音' })).toBeVisible()

  await player.getByRole('button', { name: '播放' }).click()
  await expect(player.getByRole('button', { name: '暂停' })).toBeVisible()

  await page.locator('audio').dispatchEvent('loadedmetadata')
  const progressSlider = player.getByRole('slider', { name: '播放进度' })
  await expect(progressSlider).toBeEnabled()
  await progressSlider.focus()
  await progressSlider.press('ArrowRight')
  await expect(progressSlider).toHaveValue('0.1')

  const volumeSlider = player.getByRole('slider', { name: '音量' })
  await volumeSlider.focus()
  await volumeSlider.press('ArrowDown')
  await expect(volumeSlider).toHaveValue('0.6')

  const audioMarker = await page.locator('audio').evaluate((audio) => {
    const marker = crypto.randomUUID()
    audio.dataset.testMarker = marker
    return marker
  })

  await player.getByRole('button', { name: '下一首' }).click()
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()

  await page.evaluate(() => {
    window.history.pushState({}, '', '/design-system')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page).toHaveURL(/\/design-system$/)
  await expect(page.getByRole('region', { name: '音乐播放器' })).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(1)
  await expect(page.locator('audio')).toHaveAttribute(
    'data-test-marker',
    audioMarker,
  )
  await expect(page.getByRole('button', { name: '暂停' })).toBeVisible()

  expect(consoleProblems).toEqual([])
})

test('explains unavailable media and provides keyboard-accessible recovery', async ({
  page,
}) => {
  await page.goto('/')
  const player = page.getByRole('region', { name: '音乐播放器' })
  const playButton = player.getByRole('button', { name: '播放' })

  await expect(player).toHaveAttribute('data-player-ready', 'true')
  await playButton.focus()
  await expect(playButton).toBeFocused()
  await page.locator('audio').dispatchEvent('error')

  await expect(player).toContainText('当前音源暂不可用')
  await expect(player.getByRole('slider', { name: '播放进度' })).toBeDisabled()

  await player.getByRole('button', { name: '下一首' }).press('Enter')
  await expect(player.getByText('雨落在玻璃上')).toBeVisible()
})
