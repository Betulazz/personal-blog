import { expect, test, type Page } from '@playwright/test'

const backendOrigin = 'http://127.0.0.1:8000'

const seededMissingMediaPaths = [
  '/uploads/live-acceptance/missing-markdown.webp',
  '/uploads/live-acceptance/missing-moment.webp',
  '/uploads/live-acceptance/missing-audio.mp3',
  '/uploads/live-acceptance/missing-audio-2.mp3',
]

const scriptUrls = (page: Page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('/_nuxt/') && name.endsWith('.js')),
  )

const collectBrowserProblems = (page: Page) => {
  const problems: Array<{ message: string; url: string }> = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push({
        message: `${message.type()}: ${message.text()}`,
        url: message.location().url,
      })
    }
  })
  page.on('pageerror', (error) => {
    problems.push({ message: `pageerror: ${error.message}`, url: '' })
  })
  page.on('requestfailed', (request) => {
    problems.push({
      message: `requestfailed: ${request.failure()?.errorText ?? 'unknown'}`,
      url: request.url(),
    })
  })
  return problems
}

// Production intentionally serves seeded content whose media files were
// removed; those recoverable 404s are not performance failures.
const unexpectedProblems = (
  problems: Array<{ message: string; url: string }>,
) =>
  problems.filter(
    ({ message, url }) =>
      !seededMissingMediaPaths.some((path) => url.endsWith(path)) &&
      !url.startsWith(`${backendOrigin}/uploads/`) &&
      !message.includes('Failed to load resource'),
  )

const login = async (page: Page) => {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test('production delivery keeps responsive images lazy, bounded, and route-split', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const problems = collectBrowserProblems(page)
  const browserApiRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('127.0.0.1:8000/api/v1/')) {
      browserApiRequests.push(request.url())
    }
  })

  // Server rendering carries the content, and hydration does not repeat reads.
  const source = await (await page.request.get('/')).text()
  expect(source).toContain('让真实内容先抵达')
  expect(source).toContain('公开验收从真实内容开始')

  // Mobile first load selects the smallest responsive derivative.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(1_000)
  expect(browserApiRequests).toEqual([])

  const mobileMedia = await page.evaluate(() => {
    const background = document.querySelector<HTMLImageElement>(
      '.ambient-background .responsive-background-media__image',
    )
    const heroWindow = document.querySelector<HTMLImageElement>(
      '.hero__window .responsive-background-media__image',
    )
    const backdropFilters = [...document.querySelectorAll('*')]
      .map((element) => getComputedStyle(element).backdropFilter)
      .filter((value) => value !== 'none')
    const backdropBlurPixels = backdropFilters.map((value) => {
      const match = value.match(/([\d.]+)px/)
      return match ? Number.parseFloat(match[1]) : 0
    })
    return {
      backgroundPriority: background?.fetchPriority,
      backgroundSrc: background?.currentSrc,
      backgroundLoading: background?.loading,
      backdropFilterCount: backdropFilters.length,
      backdropMaxBlur: Math.max(0, ...backdropBlurPixels),
      canvases: document.querySelectorAll('canvas').length,
      fixedBackgroundLayers:
        document.querySelectorAll('.background-layer').length,
      heroLoading: heroWindow?.loading,
      heroSrc: heroWindow?.currentSrc,
    }
  })
  expect(mobileMedia.backgroundSrc).toContain('ambient-640')
  expect(mobileMedia.backgroundLoading).toBe('eager')
  expect(mobileMedia.backgroundPriority).toBe('high')
  expect(mobileMedia.heroSrc).toContain('ambient-640')
  expect(mobileMedia.heroLoading).toBe('lazy')
  expect(mobileMedia.backdropFilterCount).toBeLessThanOrEqual(16)
  expect(mobileMedia.backdropMaxBlur).toBeLessThanOrEqual(20)
  expect(mobileMedia.canvases).toBe(0)
  expect(mobileMedia.fixedBackgroundLayers).toBe(1)

  // Wide screens upgrade the full-viewport background, not the lazy preview.
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const wideMedia = await page.evaluate(() => ({
    backgroundSrc: document.querySelector<HTMLImageElement>(
      '.ambient-background .responsive-background-media__image',
    )?.currentSrc,
    heroSrc: document.querySelector<HTMLImageElement>(
      '.hero__window .responsive-background-media__image',
    )?.currentSrc,
  }))
  expect(wideMedia.backgroundSrc).toContain('ambient-1920')
  expect(wideMedia.heroSrc).not.toContain('ambient-640')

  // Markdown media and card covers defer their downloads.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/posts/live-acceptance-markdown')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const articleImages = await page
    .locator('article img')
    .evaluateAll((images) =>
      images.map((image) => ({
        alt: image.getAttribute('alt'),
        loading: image.getAttribute('loading'),
      })),
    )
  expect(articleImages.length).toBeGreaterThan(0)
  expect(articleImages.every((image) => image.loading === 'lazy')).toBe(true)
  expect(articleImages.every((image) => image.alt !== null)).toBe(true)

  // First-load scripts exclude administration-only route chunks.
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  const publicScripts = await scriptUrls(page)

  await login(page)
  await page.goto('/admin/posts/new')
  await expect(page.getByLabel('Markdown 正文')).toBeVisible()
  await page.waitForLoadState('networkidle')
  const adminScripts = await scriptUrls(page)

  const adminOnlyScripts = adminScripts.filter(
    (url) => !publicScripts.includes(url),
  )
  expect(adminOnlyScripts.length).toBeGreaterThan(0)
  expect(new Set(adminScripts).size).toBeGreaterThan(
    new Set(publicScripts).size,
  )
  console.log(
    `performance: public scripts ${new Set(publicScripts).size}, admin scripts ${new Set(adminScripts).size}, admin-only ${adminOnlyScripts.length}`,
  )

  expect(unexpectedProblems(problems)).toEqual([])
})

test('production pages keep layout stable, long tasks acceptable, and mobile scrolling smooth', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const problems = collectBrowserProblems(page)

  await page.addInitScript(() => {
    const state = { cls: 0, longTasks: [] as number[] }
    ;(window as unknown as { __perfState: typeof state }).__perfState = state
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean
          value?: number
        }
        if (!shift.hadRecentInput) {
          state.cls += shift.value ?? 0
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.longTasks.push(entry.duration)
      }
    }).observe({ type: 'longtask', buffered: true })
  })

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(2_000)

  const report = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto'
    const state = (
      window as unknown as {
        __perfState: { cls: number; longTasks: number[] }
      }
    ).__perfState
    const gaps: number[] = []
    let last = performance.now()
    await new Promise<void>((resolve) => {
      let frames = 0
      const step = () => {
        const now = performance.now()
        gaps.push(now - last)
        last = now
        window.scrollBy(0, 40)
        frames += 1
        const atEnd =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 1
        if (frames >= 150 || atEnd) {
          resolve()
          return
        }
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
    return { cls: state.cls, gaps, longTasks: state.longTasks }
  })

  const sortedGaps = [...report.gaps].sort((a, b) => a - b)
  const p95Gap = sortedGaps[Math.floor(sortedGaps.length * 0.95)] ?? 0
  const maxGap = Math.max(...report.gaps)
  const maxLongTask =
    report.longTasks.length > 0 ? Math.max(...report.longTasks) : 0

  expect(report.cls, 'cumulative layout shift').toBeLessThan(0.1)
  expect(p95Gap, 'p95 frame gap while scrolling').toBeLessThan(120)
  expect(maxGap, 'maximum frame gap while scrolling').toBeLessThan(400)
  expect(maxLongTask, 'longest main-thread task').toBeLessThan(400)
  console.log(
    `performance: CLS ${report.cls.toFixed(4)}, p95 frame gap ${p95Gap.toFixed(1)}ms, max frame gap ${maxGap.toFixed(1)}ms, longest task ${maxLongTask.toFixed(1)}ms over ${report.longTasks.length} long tasks`,
  )

  // The ambient layer stops moving once the entry reveals settle.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.playState === 'running').length,
        ),
      { timeout: 5_000 },
    )
    .toBe(0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.playState === 'running').length,
        ),
      { timeout: 5_000 },
    )
    .toBe(0)

  expect(unexpectedProblems(problems)).toEqual([])
})
