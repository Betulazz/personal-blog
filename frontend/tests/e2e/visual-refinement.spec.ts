import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { expect, test } from '@playwright/test'

import { mockFixtureMedia } from './support/fixture-media'

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]

const pages = [
  { path: '/moments', name: 'timeline' },
  { path: '/music', name: 'music' },
]

const evidenceDirectory = resolve(
  process.env.VISUAL_REFINEMENT_EVIDENCE ??
    join(
      process.env.POLISH_ACCEPTANCE_EVIDENCE ?? tmpdir(),
      'visual-refinement',
    ),
)

test('Timeline and Music render cleanly at all six supported viewports', async ({
  page,
}) => {
  test.setTimeout(900_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockFixtureMedia(page)
  await mkdir(evidenceDirectory, { recursive: true })

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const target of pages) {
      await page.goto(target.path, { waitUntil: 'networkidle' })
      await expect(page.locator('main h1').first()).toBeVisible()
      await expect(page.locator('vite-error-overlay')).toHaveCount(0)

      const report = await page.evaluate(() => {
        const fireflies = document.querySelector<HTMLCanvasElement>(
          'canvas.firefly-layer',
        )
        return {
          audioCount: document.querySelectorAll('audio').length,
          fireflyCount: Number(fireflies?.dataset.fireflyCount ?? 0),
          horizontalOverflow:
            document.documentElement.scrollWidth > window.innerWidth,
          title: document.title,
          viewportWidth: window.innerWidth,
        }
      })

      expect(report.title).not.toBe('')
      expect(report.horizontalOverflow).toBe(false)
      expect(report.audioCount).toBe(1)
      expect(report.fireflyCount).toBeGreaterThan(0)
      expect(report.fireflyCount).toBeLessThanOrEqual(
        viewport.width <= 768 ? 10 : 32,
      )
      expect(report.viewportWidth).toBe(viewport.width)

      const stem = `${target.name}-${viewport.width}x${viewport.height}`
      await page.screenshot({
        path: join(evidenceDirectory, `${stem}-viewport.png`),
      })
      await page.screenshot({
        fullPage: true,
        path: join(evidenceDirectory, `${stem}-full.png`),
      })
    }
  }

  expect(errors).toEqual([])
})

test('fireflies honor reduced motion and pause while the page is hidden', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    let scheduledFrames = 0
    const requestFrame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) => {
      scheduledFrames += 1
      return requestFrame(callback)
    }
    Object.defineProperty(window, '__scheduledFrames', {
      get: () => scheduledFrames,
    })
  })

  await page.goto('/moments', { waitUntil: 'networkidle' })
  const fireflies = page.locator('canvas.firefly-layer')
  await expect(fireflies).toHaveCount(1)
  await page.waitForTimeout(120)

  const beforeHide = await page.evaluate(
    () => (window as Window & { __scheduledFrames: number }).__scheduledFrames,
  )
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-page-hidden', ''),
  )
  await expect(page.locator('html')).toHaveAttribute('data-page-hidden', '')
  await page.waitForTimeout(160)
  const whileHidden = await page.evaluate(
    () => (window as Window & { __scheduledFrames: number }).__scheduledFrames,
  )
  expect(whileHidden - beforeHide).toBeLessThanOrEqual(1)

  await page.evaluate(() =>
    document.documentElement.removeAttribute('data-page-hidden'),
  )
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __scheduledFrames: number }).__scheduledFrames,
      ),
    )
    .toBeGreaterThan(whileHidden)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(fireflies).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(fireflies).toHaveCount(1)
})

test('Timeline navigation opens the Music playlist panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/moments')

  await page
    .locator('.desktop-navigation')
    .getByRole('link', { name: '音乐', exact: true })
    .click()
  await expect(page).toHaveURL(/\/music$/)
  await expect(page.locator('main h1')).toHaveText('音乐')

  const playlistButton = page.getByRole('button', { name: /播放列表/ })
  await playlistButton.click()
  await expect(playlistButton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('audio')).toHaveCount(1)
})

test('fireflies keep mobile scrolling responsive without layout shifts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const state = { cls: 0, longTasks: [] as number[] }
    ;(window as Window & { __visualPerf: typeof state }).__visualPerf = state

    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean
            value?: number
          }
          if (!shift.hadRecentInput) state.cls += shift.value ?? 0
        }
      }).observe({ type: 'layout-shift', buffered: true })
    }

    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTasks.push(entry.duration)
        }
      }).observe({ type: 'longtask', buffered: true })
    }
  })

  await page.goto('/moments', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1_000)

  const report = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto'
    const state = (
      window as Window & {
        __visualPerf: { cls: number; longTasks: number[] }
      }
    ).__visualPerf
    const frameGaps: number[] = []
    let previousFrame = performance.now()
    await new Promise<void>((resolve) => {
      let frames = 0
      const scrollFrame = () => {
        const now = performance.now()
        frameGaps.push(now - previousFrame)
        previousFrame = now
        window.scrollBy(0, 32)
        frames += 1
        const atEnd =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 1
        if (frames >= 120 || atEnd) {
          resolve()
          return
        }
        requestAnimationFrame(scrollFrame)
      }
      requestAnimationFrame(scrollFrame)
    })

    return {
      cls: state.cls,
      frameGaps,
      longTasks: state.longTasks,
      scrollHeight: document.documentElement.scrollHeight,
    }
  })

  const sortedGaps = [...report.frameGaps].sort((left, right) => left - right)
  const p95FrameGap = sortedGaps[Math.floor(sortedGaps.length * 0.95)] ?? 0
  const maxFrameGap = Math.max(...report.frameGaps)
  const maxLongTask = Math.max(0, ...report.longTasks)

  expect(report.scrollHeight).toBeGreaterThan(812)
  expect(report.cls).toBeLessThan(0.1)
  expect(p95FrameGap).toBeLessThan(120)
  expect(maxFrameGap).toBeLessThan(400)
  expect(maxLongTask).toBeLessThan(400)
  console.log(
    `mobile scroll: CLS ${report.cls.toFixed(4)}, p95 frame gap ${p95FrameGap.toFixed(1)}ms, max frame gap ${maxFrameGap.toFixed(1)}ms, longest task ${maxLongTask.toFixed(1)}ms`,
  )
})
