import { expect, test, type Page, type TestInfo } from '@playwright/test'

const backendOrigin = 'http://127.0.0.1:8000'
const apiBase = `${backendOrigin}/api/v1`

const requiredViewports = [
  { height: 812, width: 375 },
  { height: 932, width: 430 },
  { height: 1024, width: 768 },
  { height: 768, width: 1024 },
  { height: 900, width: 1440 },
  { height: 1080, width: 1920 },
] as const

const seededMissingMediaPaths = [
  '/uploads/live-acceptance/missing-markdown.webp',
  '/uploads/live-acceptance/missing-moment.webp',
  '/uploads/live-acceptance/missing-audio.mp3',
  '/uploads/live-acceptance/missing-audio-2.mp3',
]

const login = async (page: Page) => {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

const csrfToken = async (page: Page) => {
  const response = await page.request.get(`${apiBase}/auth/csrf`)
  expect(response.status()).toBe(200)
  return (await response.json()).data.token as string
}

type AdminPostApiPayload = {
  body: string
  category_id: number
  slug: string
  summary: string
  title: string
}

const createPostThroughApi = async (page: Page, input: AdminPostApiPayload) => {
  const token = await csrfToken(page)
  const response = await page.request.post(`${apiBase}/admin/posts`, {
    data: input,
    headers: { 'X-CSRF-Token': token },
  })
  expect(response.status()).toBe(201)
  return (await response.json()).data as { id: number; slug: string }
}

const deletePostThroughApi = async (page: Page, id: number) => {
  const token = await csrfToken(page)
  const response = await page.request.delete(`${apiBase}/admin/posts/${id}`, {
    headers: { 'X-CSRF-Token': token },
  })
  expect([200, 404]).toContain(response.status())
}

const seededCategoryId = async (page: Page) => {
  const response = await page.request.get(`${apiBase}/admin/categories`)
  expect(response.status()).toBe(200)
  const categories = (await response.json()).data as Array<{
    id: number
    slug: string
  }>
  const category = categories.find((item) => item.slug === 'live-acceptance')
  expect(category, 'seeded live-acceptance category').toBeTruthy()
  return category!.id
}

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
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push({
        message: `response: ${response.status()} ${response.statusText()}`,
        url: response.url(),
      })
    }
  })
  return problems
}

// Seeded live content intentionally points at removed media; those recoverable
// 404s are part of the modelled experience rather than convergence failures.
// Nuxt dev-mode diagnostics are filtered so real application problems stay visible.
const unexpectedProblems = (
  problems: Array<{ message: string; url: string }>,
) =>
  problems.filter(({ message, url }) => {
    if (seededMissingMediaPaths.some((path) => url.endsWith(path))) {
      return false
    }
    // Production serves media directly; seeded uploads are intentionally absent.
    if (url.includes('/uploads/')) {
      return false
    }
    // Documented noncritical engine differences: the journeys and capture loop
    // navigate rapidly, so in-flight prefetches, pending reads, media, and
    // Nuxt's app-manifest fetch are routinely cancelled by the next navigation.
    // Firefox reports that cancellation as NS_BINDING_ABORTED, Chromium as
    // net::ERR_ABORTED, and WebKit as "Load request cancelled"; WebKit can also
    // surface an unhandled build-manifest rejection or Nuxt's transient
    // NUXT_E5002 app-manifest diagnostic for the same cancellation. All are
    // navigation cancellations rather than network failures.
    if (
      message === 'requestfailed: NS_BINDING_ABORTED' ||
      message === 'requestfailed: net::ERR_ABORTED' ||
      message === 'requestfailed: Load request cancelled' ||
      message.includes('[NUXT_E5002]')
    ) {
      return false
    }
    if (
      message.includes('builds/meta') &&
      message.includes('access control checks')
    ) {
      return false
    }
    return !(
      message.includes('[NUXT_E4011]') ||
      message.includes('[nostics]') ||
      message.includes('import.meta.hot.send()')
    )
  })

const assertNoHorizontalOverflow = async (
  page: Page,
  route: string,
  width: number,
) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(
    dimensions.scrollWidth,
    `${route} at ${width}px: ${dimensions.scrollWidth}px exceeds ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth)
}

const capture = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
  width: number,
) => {
  const prefix = `test-results/quality-convergence/${testInfo.project.name}-${name}-${width}`
  await page.screenshot({ path: `${prefix}-viewport.png`, scale: 'css' })
  await page.screenshot({
    path: `${prefix}-full-page.png`,
    fullPage: true,
    scale: 'css',
  })
}

test('public critical journeys, semantics, and focus work in this engine', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const problems = collectBrowserProblems(page)
  const routes = [
    { heading: '让真实内容先抵达，再让细节慢慢发光', path: '/' },
    { heading: '文章', path: '/posts' },
    {
      heading: 'Markdown 仍然是一条可迁移的路',
      path: '/posts/live-acceptance-markdown',
    },
    { heading: '动态', path: '/moments' },
    { heading: '杂谈', path: '/chatter' },
    { heading: '项目集', path: '/projects' },
    { heading: '友链', path: '/friends' },
    {
      heading: '让真实内容先抵达，再让细节慢慢发光',
      path: '/about',
    },
    { heading: '搜索：portable', path: '/search?q=portable' },
  ] as const

  await page.setViewportSize({ width: 430, height: 932 })
  for (const route of routes) {
    const response = await page.goto(route.path)
    expect(response?.status(), route.path).toBe(200)
    await expect(
      page.getByRole('heading', { level: 1, name: route.heading }),
    ).toBeVisible()
    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(page.locator('[data-error-page]')).toHaveCount(0)
    await assertNoHorizontalOverflow(page, route.path, 430)
    const imagesWithoutAlt = await page.locator('img:not([alt])').count()
    expect(imagesWithoutAlt, `${route.path} images missing alt`).toBe(0)
    const unsafeLinks = await page
      .locator('a[target="_blank"]')
      .evaluateAll((links) =>
        links
          .filter((link) => {
            const rel = (link.getAttribute('rel') ?? '')
              .split(/\s+/)
              .filter(Boolean)
            return !rel.includes('noopener') || !rel.includes('noreferrer')
          })
          .map((link) => (link as HTMLAnchorElement).href),
      )
    expect(unsafeLinks, `${route.path} unsafe target=_blank links`).toEqual([])
  }

  // The skip link moves keyboard focus to the main boundary.
  await page.goto('/')
  const skipLink = page.getByRole('link', { name: '跳到主要内容' })
  await skipLink.focus()
  await expect(skipLink).toBeFocused()
  await skipLink.press('Enter')
  await expect(page.locator('main#main-content')).toBeFocused()

  // Keyboard focus stays visible where it lands.
  await page.keyboard.press('Tab')
  const focusVisible = await page.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) {
      return null
    }
    const style = getComputedStyle(active)
    return {
      matchesFocusVisible: active.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    }
  })
  expect(focusVisible?.matchesFocusVisible).toBe(true)
  expect(focusVisible?.outlineStyle).not.toBe('none')
  expect(focusVisible?.outlineWidth ?? 0).toBeGreaterThan(0)

  // Mobile navigation uses a focus-managed sheet with touch-sized controls.
  const menuButton = page.getByRole('button', { name: '打开主导航' })
  await expect(menuButton).toBeVisible()
  const menuSize = await menuButton.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { height: rect.height, width: rect.width }
  })
  expect(menuSize.height).toBeGreaterThanOrEqual(44)
  expect(menuSize.width).toBeGreaterThanOrEqual(44)
  await menuButton.click()
  await expect(
    page.getByRole('navigation', { name: '移动端主导航' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '关闭主导航' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menuButton).toBeFocused()

  // Reading progress, code, math, and the desktop TOC remain functional.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/posts/live-acceptance-markdown')
  await expect(
    page.getByRole('complementary', { name: '文章目录' }),
  ).toBeVisible()
  await expect(page.locator('.post-markdown__code .shiki')).toBeVisible()
  await expect(page.locator('.katex')).toHaveCount(1)

  // Reading progress tracks the scroll position on a narrow viewport. The
  // scroll is repeated until hydration has settled so router restoration
  // cannot reset the position between the scroll and the assertion.
  await page.setViewportSize({ width: 375, height: 812 })
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          document.documentElement.style.scrollBehavior = 'auto'
          window.scrollTo(0, document.documentElement.scrollHeight)
          return Number(
            document
              .querySelector('[aria-label="文章阅读进度"]')
              ?.getAttribute('aria-valuenow') ?? 0,
          )
        }),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0)

  // The custom 404 stays inside the product shell.
  const notFound = await page.goto('/not-a-real-convergence-route')
  expect(notFound?.status()).toBe(404)
  await expect(page.locator('[data-error-page]')).toBeVisible()

  // Layout holds at the declared widths in every engine.
  for (const width of [375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await assertNoHorizontalOverflow(page, '/', width)
    await page.goto('/posts/live-acceptance-markdown')
    await assertNoHorizontalOverflow(
      page,
      '/posts/live-acceptance-markdown',
      width,
    )
  }

  expect(
    unexpectedProblems(problems).filter(
      ({ url }) => !url.includes('/not-a-real-convergence-route'),
    ),
  ).toEqual([])
})

test('admin critical journeys work end to end in this engine', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const problems = collectBrowserProblems(page)
  const token = `quality-convergence-${Date.now()}`
  const title = `质量收敛验收文章 ${token}`
  const body = `质量收敛验收正文 ${token}。`

  await login(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText(/文章总数/)).toBeVisible()

  const categoryId = await seededCategoryId(page)
  const created = await createPostThroughApi(page, {
    body,
    category_id: categoryId,
    slug: token,
    summary: '质量收敛验收摘要。',
    title,
  })

  try {
    await page.goto(`/admin/posts/${created.id}/edit`)
    await expect(page.getByLabel('Markdown 正文')).toContainText(body)
    await expect(page.getByRole('button', { name: '发布' })).toBeVisible()

    await page.getByRole('button', { name: '发布' }).click()
    await page
      .getByRole('dialog', { name: '确认发布这篇文章？' })
      .getByRole('button', { name: '确认发布', exact: true })
      .click()
    await expect(page.getByRole('button', { name: '撤回' })).toBeVisible()

    const publicResponse = await page.goto(`/posts/${token}`)
    expect(publicResponse?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.locator('article').getByText(body)).toBeVisible()

    await page.goto('/posts')
    await expect(
      page.locator('.post-card').filter({ hasText: title }),
    ).toBeVisible()

    // Admin shell keyboard access and mobile navigation hold in this engine.
    await page.setViewportSize({ width: 430, height: 932 })
    await page.goto('/admin')
    const skipLink = page.getByRole('link', { name: '跳到后台主要内容' })
    await skipLink.focus()
    await skipLink.press('Enter')
    await expect(page.locator('#admin-main')).toBeFocused()

    const menuButton = page.getByRole('button', { name: '打开后台导航' })
    await menuButton.focus()
    await menuButton.press('Enter')
    await expect(
      page.getByRole('button', { name: '关闭后台导航' }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menuButton).toBeFocused()

    for (const viewport of requiredViewports) {
      await page.setViewportSize(viewport)
      await page.goto('/admin/posts/new')
      await expect(page.getByLabel('Markdown 正文')).toBeVisible()
      await assertNoHorizontalOverflow(page, '/admin/posts/new', viewport.width)
    }
  } finally {
    await deletePostThroughApi(page, created.id)
  }

  expect(unexpectedProblems(problems)).toEqual([])
})

test('deterministic viewports keep separate captured evidence for public and admin pages', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Chromium owns the fixed-size capture baseline.',
  )
  test.setTimeout(1_800_000)
  const problems = collectBrowserProblems(page)

  await login(page)
  for (const viewport of requiredViewports) {
    await page.setViewportSize(viewport)
    for (const route of [
      { name: 'home', path: '/' },
      { name: 'post', path: '/posts/live-acceptance-markdown' },
      { name: 'moments', path: '/moments' },
      { name: 'search', path: '/search?q=portable' },
      { name: 'friends', path: '/friends' },
      { name: 'admin-dashboard', path: '/admin' },
      { name: 'admin-posts', path: '/admin/posts' },
      { name: 'admin-editor', path: '/admin/posts/new' },
      { name: 'admin-settings', path: '/admin/settings' },
    ]) {
      await page.goto(route.path)
      await expect(page.locator('main, #admin-main').first()).toBeVisible()
      await assertNoHorizontalOverflow(page, route.path, viewport.width)
      await capture(page, testInfo, route.name, viewport.width)
    }
  }

  expect(unexpectedProblems(problems)).toEqual([])
})

test('accessibility audit covers names, labels, landmarks, and contrast', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'The automated audit runs once; engines are covered by journey tests.',
  )
  test.setTimeout(600_000)

  await login(page)

  const routes = [
    '/',
    '/posts',
    '/posts/live-acceptance-markdown',
    '/search?q=portable',
    '/moments',
    '/projects',
    '/friends',
    '/about',
    '/admin',
    '/admin/posts',
    '/admin/posts/new',
    '/admin/settings',
    '/admin/media',
  ] as const

  for (const route of routes) {
    await page.goto(route)
    await expect(
      page.locator(
        route.startsWith('/admin') ? '#admin-main' : 'main#main-content',
      ),
    ).toBeVisible()

    const audit = await page.evaluate(() => {
      const issues: string[] = []

      if (document.documentElement.lang !== 'zh-CN') {
        issues.push(`html lang is ${document.documentElement.lang}`)
      }
      if (document.querySelectorAll('main').length !== 1) {
        issues.push('expected exactly one main landmark')
      }
      for (const navigation of document.querySelectorAll('nav')) {
        if (
          !navigation.getAttribute('aria-label') &&
          !navigation.getAttribute('aria-labelledby')
        ) {
          issues.push('navigation landmark without a name')
        }
      }

      const hasAccessibleName = (element: Element) => {
        const labelledBy = element.getAttribute('aria-labelledby')
        if (labelledBy) {
          return labelledBy
            .split(/\s+/)
            .every((id) =>
              Boolean(document.getElementById(id)?.textContent?.trim()),
            )
        }
        if (element.getAttribute('aria-label')?.trim()) {
          return true
        }
        if (element.getAttribute('title')?.trim()) {
          return true
        }
        if (element.textContent?.trim()) {
          return true
        }
        return Boolean(
          element.querySelector('img[alt]:not([alt=""])')?.getAttribute('alt'),
        )
      }

      for (const element of document.querySelectorAll(
        'button, a[href], [role="button"], [role="tab"]',
      )) {
        if (element.closest('[aria-hidden="true"]')) {
          continue
        }
        if (getComputedStyle(element).display === 'none') {
          continue
        }
        if (!hasAccessibleName(element)) {
          issues.push(
            `unnamed ${element.tagName.toLowerCase()}: ${element.outerHTML.slice(0, 80)}`,
          )
        }
      }

      for (const field of document.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input:not([type="hidden"]), select, textarea')) {
        if (field.closest('[aria-hidden="true"]')) {
          continue
        }
        const id = field.id
        const labelled =
          field.getAttribute('aria-label')?.trim() ||
          field.getAttribute('aria-labelledby') ||
          (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
          field.closest('label')
        if (!labelled) {
          issues.push(
            `unlabelled ${field.tagName.toLowerCase()}: ${field.outerHTML.slice(0, 80)}`,
          )
        }
      }

      return issues
    })
    expect(audit, route).toEqual([])
  }

  // Automated contrast floor over opaque and glass-composited surfaces.
  for (const route of [
    '/',
    '/posts/live-acceptance-markdown',
    '/projects',
    '/about',
    '/admin',
    '/admin/posts/new',
    '/admin/settings',
  ]) {
    await page.goto(route)
    const failures = await page.evaluate(() => {
      type Rgba = [number, number, number, number]
      const parseColor = (value: string): Rgba | null => {
        const match = value.match(/^rgba?\(([^)]+)\)$/)
        if (!match) {
          return null
        }
        const parts = match[1]
          .split(/[,\s/]+/)
          .filter(Boolean)
          .map(Number)
        if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) {
          return null
        }
        const alpha =
          parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1
        return [parts[0], parts[1], parts[2], alpha]
      }
      const composite = (top: Rgba, bottom: Rgba): Rgba => [
        top[0] * top[3] + bottom[0] * (1 - top[3]),
        top[1] * top[3] + bottom[1] * (1 - top[3]),
        top[2] * top[3] + bottom[2] * (1 - top[3]),
        1,
      ]
      const luminance = (color: Rgba) => {
        const channel = (value: number) => {
          const normalized = value / 255
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4
        }
        return (
          0.2126 * channel(color[0]) +
          0.7152 * channel(color[1]) +
          0.0722 * channel(color[2])
        )
      }
      const ratio = (a: Rgba, b: Rgba) => {
        const first = luminance(a)
        const second = luminance(b)
        return (
          (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
        )
      }

      const canvas = parseColor(
        getComputedStyle(document.body).backgroundColor,
      ) ?? [6, 10, 23, 1]
      const failures: string[] = []

      for (const element of document.querySelectorAll<HTMLElement>('body *')) {
        if (element.closest('[aria-hidden="true"]')) {
          continue
        }
        const hasDirectText = [...element.childNodes].some(
          (node) => node.nodeType === 3 && node.textContent?.trim(),
        )
        if (!hasDirectText) {
          continue
        }
        const style = getComputedStyle(element)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number.parseFloat(style.opacity) < 0.85
        ) {
          continue
        }

        const color = parseColor(style.color)
        if (!color) {
          continue
        }

        // Gradient backgrounds are common on this site, so their color stops
        // are composited too; only true image backgrounds are unevaluable.
        const gradientStops = (value: string) => {
          if (!value.includes('gradient')) {
            return []
          }
          return [...value.matchAll(/rgba?\(([^)]+)\)/g)]
            .map((match) => parseColor(`rgba(${match[1]})`))
            .filter((stop): stop is Rgba => Boolean(stop))
        }

        const layers: Rgba[] = []
        let opaqueAncestor = false
        let node: HTMLElement | null = element
        let hasImage = false
        let stops: Rgba[] = []
        while (node) {
          const nodeStyle = getComputedStyle(node)
          if (nodeStyle.backgroundImage.includes('url(')) {
            hasImage = true
            break
          }
          stops = stops.concat(gradientStops(nodeStyle.backgroundImage))
          const background = parseColor(nodeStyle.backgroundColor)
          if (background && background[3] > 0) {
            layers.push(background)
            if (background[3] >= 1) {
              opaqueAncestor = true
              break
            }
          }
          node = node.parentElement
        }
        if (hasImage) {
          continue
        }

        let surface: Rgba = opaqueAncestor
          ? ([...layers[layers.length - 1]] as Rgba)
          : ([...canvas] as Rgba)
        for (let index = layers.length - 1; index >= 0; index -= 1) {
          surface = composite(layers[index], surface)
        }

        const surfaces =
          stops.length > 0
            ? stops.map((stop) => composite(stop, surface))
            : [surface]

        const fontSize = Number.parseFloat(style.fontSize)
        const weight = Number.parseInt(style.fontWeight, 10) || 400
        const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700)
        const minimum = large ? 3 : 4.5
        const contrast = Math.min(
          ...surfaces.map((candidate) => ratio(color, candidate)),
        )
        if (contrast < minimum) {
          failures.push(
            `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 32)}" ${contrast.toFixed(2)}:1`,
          )
        }
      }

      return failures
    })
    expect(failures, route).toEqual([])
  }

  // Mobile controls expose touch-sized targets on representative pages.
  await page.setViewportSize({ width: 430, height: 932 })
  for (const route of ['/', '/posts', '/moments']) {
    await page.goto(route)
    const undersized = await page.evaluate(() =>
      [...document.querySelectorAll('button, input[type="range"]')]
        .filter((element) => {
          const style = getComputedStyle(element)
          if (style.display === 'none' || style.visibility === 'hidden') {
            return false
          }
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0 && rect.height < 44
        })
        .map((element) => {
          const label = (
            element.getAttribute('aria-label') ??
            element.textContent ??
            ''
          )
            .trim()
            .slice(0, 24)
          return `${element.tagName.toLowerCase()} "${label}" ${element.getBoundingClientRect().height}px`
        }),
    )
    expect(undersized, route).toEqual([])
  }
  await page.setViewportSize({ width: 1440, height: 900 })

  // Reduced motion removes running animation and smooth scrolling.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of ['/', '/posts/live-acceptance-markdown']) {
    await page.goto(route)
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document
                .getAnimations()
                .filter((animation) => animation.playState === 'running')
                .length,
          ),
        { timeout: 5_000 },
      )
      .toBe(0)
    const scrollBehavior = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    )
    expect(scrollBehavior).toBe('auto')
  }
  await page.emulateMedia({ reducedMotion: null })
})

test('continuous effects pause offscreen and when the document is hidden', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Continuous-effect observation is engine-independent; Chromium proves it.',
  )
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // A tagged element outside the viewport is paused, one in view keeps running.
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.textContent =
      '@keyframes convergence-probe { to { transform: rotate(360deg); } }'
    document.head.append(style)

    const createProbe = (name: string, top: string) => {
      const probe = document.createElement('span')
      probe.setAttribute('data-continuous-effect', '')
      probe.setAttribute('data-probe', name)
      probe.style.cssText = `position:absolute;top:${top};left:0;width:1rem;height:1rem;animation:convergence-probe 1s linear infinite;`
      document.body.append(probe)
    }

    createProbe('visible', '4rem')
    createProbe('offscreen', '6000px')
  })
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .querySelector('[data-probe="offscreen"]')
              ?.getAttribute('data-effect-paused') ?? null,
        ),
      { timeout: 15_000 },
    )
    .toBe('true')
  const visiblePaused = await page.evaluate(
    () =>
      document
        .querySelector('[data-probe="visible"]')
        ?.hasAttribute('data-effect-paused') ?? true,
  )
  expect(visiblePaused).toBe(false)

  // Hidden documents suspend every continuous effect through the root marker.
  const hiddenState = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    const animated = document.querySelector<HTMLElement>(
      '[data-probe="visible"]',
    )
    return {
      hiddenAttribute:
        document.documentElement.hasAttribute('data-page-hidden'),
      playState: animated
        ? getComputedStyle(animated).animationPlayState
        : 'none',
    }
  })
  expect(hiddenState.hiddenAttribute).toBe(true)
  expect(hiddenState.playState).toBe('paused')

  const resumed = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    return document.documentElement.hasAttribute('data-page-hidden')
  })
  expect(resumed).toBe(false)
})
