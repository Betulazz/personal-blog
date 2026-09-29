import { expect, test, type Page } from '@playwright/test'

const control = 'http://127.0.0.1:8787/__control'

test.beforeEach(async ({ page }) => {
  await page.request.get(`${control}/reset`)
})

test('administrator edits and reorders About skills and interests', async ({
  page,
}) => {
  await page.goto('/about')
  await expect(page.locator('#about-skills-title')).toHaveText('技能')
  await expect(page.locator('#about-interests-title')).toHaveText('兴趣')

  await login(page)
  await openAbout(page)
  await expect(page.getByLabel('技能板块标题')).toHaveValue('技能')
  await expect(page.getByLabel('技能板块导语')).toHaveValue(
    '在实践中持续打磨的工具与方法。',
  )
  await expect(page.getByLabel('兴趣板块标题')).toHaveValue('兴趣')
  await expect(page.getByLabel('兴趣板块导语')).toHaveValue(
    '让工作之外的生活也保留一点好奇心。',
  )

  await page.getByLabel('技能板块标题').fill('实践与工具')
  await page.getByLabel('技能板块导语').fill('在真实项目里反复打磨。')
  await page.getByLabel('兴趣板块标题').fill('最近在意')
  await page.getByLabel('兴趣板块导语').fill('工作之外也保持好奇。')

  await page.getByLabel('技能组 1 的名称').fill('界面与体验')
  await page.getByRole('textbox', { name: '技能组 1 的技能 1' }).fill('Vue 3')
  await page.getByRole('button', { name: '添加技能组' }).click()
  await page.getByLabel('技能组 3 的名称').fill('架构实践')
  await page.getByRole('button', { name: '添加技能' }).nth(2).click()
  await page.getByRole('textbox', { name: '技能组 3 的技能 1' }).fill('Rust')
  await page.getByRole('button', { name: '添加技能' }).nth(2).click()
  await page.getByRole('textbox', { name: '技能组 3 的技能 2' }).fill('Go')
  await page.getByRole('button', { name: '技能组 3 的技能 2 上移' }).click()
  await expect(
    page.getByRole('textbox', { name: '技能组 3 的技能 1' }),
  ).toHaveValue('Go')
  await expect(
    page.getByRole('textbox', { name: '技能组 3 的技能 2' }),
  ).toHaveValue('Rust')
  await page.getByRole('button', { name: '移除技能组 3 的技能 2' }).click()
  await expect(
    page.getByRole('textbox', { name: '技能组 3 的技能 1' }),
  ).toHaveValue('Go')
  await page.getByRole('button', { name: '技能组 3 上移' }).click()
  await expect(page.getByLabel('技能组 2 的名称')).toHaveValue('架构实践')
  await page.getByLabel('技能组 2 的名称').fill('工程实践')

  await page.getByRole('textbox', { name: '兴趣 1' }).fill('软件设计')
  await page.getByRole('button', { name: '添加兴趣' }).click()
  await page.getByRole('textbox', { name: '兴趣 4' }).fill('徒步')
  await page.getByRole('button', { name: '兴趣 4 上移' }).click()
  await page.getByRole('button', { name: '移除兴趣 2' }).click()
  await expect(page.getByRole('textbox', { name: '兴趣 1' })).toHaveValue(
    '软件设计',
  )
  await expect(page.getByRole('textbox', { name: '兴趣 2' })).toHaveValue(
    '徒步',
  )
  await expect(page.getByRole('textbox', { name: '兴趣 3' })).toHaveValue(
    '环境音乐',
  )

  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--success')).toContainText(
    '关于页面内容已保存',
  )
  await page.reload()
  await expect(page.getByLabel('技能板块标题')).toHaveValue('实践与工具')
  await expect(page.getByLabel('技能组 1 的名称')).toHaveValue('界面与体验')
  await expect(page.getByLabel('技能组 2 的名称')).toHaveValue('工程实践')
  await expect(
    page.getByRole('textbox', { name: '技能组 2 的技能 1' }),
  ).toHaveValue('Go')
  await expect(page.getByRole('textbox', { name: '兴趣 1' })).toHaveValue(
    '软件设计',
  )
  await expect(page.getByRole('textbox', { name: '兴趣 2' })).toHaveValue(
    '徒步',
  )

  await page.goto('/about')
  await expect(page.locator('#about-skills-title')).toHaveText('实践与工具')
  await expect(page.locator('.about-page__skills-intro')).toHaveText(
    '在真实项目里反复打磨。',
  )
  await expect(page.locator('.about-page__skill-groups h3')).toHaveText([
    '界面与体验',
    '工程实践',
    '服务与数据',
  ])
  await expect(page.locator('.about-page__skill-groups li')).toHaveText([
    'Vue 3',
    'TypeScript',
    'Go',
    'FastAPI',
    'MySQL',
  ])
  await expect(page.locator('#about-interests-title')).toHaveText('最近在意')
  await expect(
    page.locator(
      'section[aria-labelledby="about-interests-title"] .about-page__section-intro',
    ),
  ).toHaveText('工作之外也保持好奇。')
  await expect(page.locator('.about-page__interests li')).toHaveText([
    '软件设计',
    '徒步',
    '环境音乐',
  ])
  await expect(page.locator('.about-page__story p')).toHaveText([
    '这段内容来自可配置的 About Site Identity。',
    '它与公开站点设置一起服务，而不是来自静态前端数据。',
  ])
  await expect(
    page.locator('aside.about-page__rail #about-skills-title'),
  ).toBeVisible()
  await expect(
    page.locator('.about-page__main #about-interests-title'),
  ).toBeVisible()

  await page.setViewportSize({ width: 430, height: 932 })
  await expect(page.locator('#about-skills-title')).toHaveText('实践与工具')
  await expect(page.locator('#about-interests-title')).toHaveText('最近在意')
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})

test('invalid skills and interests and failed saves preserve drafts', async ({
  page,
}) => {
  await login(page)
  await openAbout(page)
  await page.getByLabel('技能板块标题').fill('保留技能草稿')
  await page.getByLabel('兴趣板块标题').fill('保留兴趣草稿')
  await page.getByRole('button', { name: '添加兴趣' }).click()
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--error')).toContainText(
    '请先修正标出的内容',
  )
  await expect(page.getByRole('textbox', { name: '兴趣 4' })).toHaveValue('')
  await expect(page.getByLabel('技能板块标题')).toHaveValue('保留技能草稿')

  await page.getByRole('textbox', { name: '兴趣 4' }).fill('保留兴趣条目')
  await page.getByRole('button', { name: '添加技能组' }).click()
  await page.getByLabel('技能组 3 的名称').fill('保留技能组')
  await page.getByRole('button', { name: '添加技能' }).nth(2).click()
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--error')).toContainText(
    '请先修正标出的内容',
  )
  await expect(
    page.getByRole('textbox', { name: '技能组 3 的技能 1' }),
  ).toHaveValue('')

  await page
    .getByRole('textbox', { name: '技能组 3 的技能 1' })
    .fill('可访问性')
  await page.request.get(
    'http://127.0.0.1:8787/__control/failure?resource=admin',
  )
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--error')).toContainText(
    '当前输入仍然保留',
  )
  await expect(
    page.getByRole('textbox', { name: '技能组 3 的技能 1' }),
  ).toHaveValue('可访问性')
  await expect(page.getByRole('textbox', { name: '兴趣 4' })).toHaveValue(
    '保留兴趣条目',
  )
  await expect(page.getByLabel('技能板块标题')).toHaveValue('保留技能草稿')

  await page.request.get('http://127.0.0.1:8787/__control/clear-failures')
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--success')).toContainText(
    '关于页面内容已保存',
  )
  const publicSettings = await page.request.get(
    'http://127.0.0.1:8787/api/v1/settings',
  )
  const about = (await publicSettings.json()).data.about
  expect(about.skills_heading).toBe('保留技能草稿')
  expect(about.skills[2]).toEqual({
    name: '保留技能组',
    items: ['可访问性'],
  })
  expect(about.interests[3]).toBe('保留兴趣条目')
  expect(about.story).toEqual([
    '这段内容来自可配置的 About Site Identity。',
    '它与公开站点设置一起服务，而不是来自静态前端数据。',
  ])
  expect(about.timeline[0].title).toBe('让内容回到配置')
})

test('administrator edits and reorders About story and timeline content', async ({
  page,
}) => {
  await page.goto('/about')
  const defaultStory = page.locator(
    'section[aria-labelledby="about-story-title"]',
  )
  const defaultTimeline = page.locator(
    'section[aria-labelledby="about-timeline-title"]',
  )
  await expect(defaultStory.locator('h2')).toHaveText('我为什么写这里')
  await expect(defaultStory).toContainText(
    '这不是完成时的简历，而是一份仍在生长中的公开记录。',
  )
  await expect(defaultTimeline.locator('h2')).toHaveText('时间线')
  await expect(defaultTimeline).toContainText('几个让我继续走下去的节点。')

  await login(page)
  await openAbout(page)
  await expect(page).toHaveURL(/\/admin\/about$/)
  await expect(
    page.getByRole('heading', { name: '关于页面', level: 1 }),
  ).toBeVisible()
  await expect(page.getByLabel('故事板块标题')).toHaveValue('我为什么写这里')
  await expect(page.getByLabel('时间线板块标题')).toHaveValue('时间线')

  await page.getByLabel('故事板块标题').fill('写作与生活')
  await page.getByLabel('故事板块导语').fill('一段新的故事导语。')
  await page
    .getByRole('textbox', { name: '故事段落 1' })
    .fill('先留下这段新的开场。')
  await page.getByRole('button', { name: '添加故事段落' }).click()
  await page
    .getByRole('textbox', { name: '故事段落 3' })
    .fill('再补充一段新的记录。')
  await page.getByRole('button', { name: '移除故事段落 2' }).click()
  await page.getByRole('button', { name: '故事段落 1 下移' }).click()
  await expect(page.getByRole('textbox', { name: '故事段落 1' })).toHaveValue(
    '再补充一段新的记录。',
  )
  await expect(page.getByRole('textbox', { name: '故事段落 2' })).toHaveValue(
    '先留下这段新的开场。',
  )

  await page.getByLabel('时间线板块标题').fill('经历节点')
  await page.getByLabel('时间线板块导语').fill('按时间记录重要变化。')
  await page.getByLabel('时间线节点 1 的标题').fill('第一份工作')
  await page.getByRole('button', { name: '添加时间线节点' }).click()
  await page.getByLabel('时间线节点 2 的时间').fill('2025')
  await page.getByLabel('时间线节点 2 的标题').fill('开始独立写作')
  await page.getByLabel('时间线节点 2 的说明').fill('把持续学习变成公开记录。')
  await page.getByRole('button', { name: '添加时间线节点' }).click()
  await page.getByLabel('时间线节点 3 的时间').fill('2024')
  await page.getByLabel('时间线节点 3 的标题').fill('移除的草稿')
  await page.getByLabel('时间线节点 3 的说明').fill('这条草稿会被删除。')
  await page.getByRole('button', { name: '移除时间线节点 3' }).click()
  await page.getByRole('button', { name: '时间线节点 2 上移' }).click()
  await expect(page.getByLabel('时间线节点 1 的标题')).toHaveValue(
    '开始独立写作',
  )
  await expect(page.getByLabel('时间线节点 2 的标题')).toHaveValue('第一份工作')

  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--success')).toContainText(
    '关于页面内容已保存',
  )
  await page.reload()
  await expect(page.getByRole('textbox', { name: '故事段落 1' })).toHaveValue(
    '再补充一段新的记录。',
  )
  await expect(page.getByLabel('时间线节点 1 的标题')).toHaveValue(
    '开始独立写作',
  )

  await page.goto('/admin/settings')
  await expect(page.getByLabel('网站名称')).toHaveValue('夜航手记')

  await page.goto('/about')
  const story = page.locator('section[aria-labelledby="about-story-title"]')
  const timeline = page.locator(
    'section[aria-labelledby="about-timeline-title"]',
  )
  await expect(story.getByRole('heading', { level: 2 })).toHaveText(
    '写作与生活',
  )
  await expect(story).toContainText('一段新的故事导语。')
  await expect(story.locator('.about-page__story p')).toHaveText([
    '再补充一段新的记录。',
    '先留下这段新的开场。',
  ])
  await expect(timeline.getByRole('heading', { level: 2 })).toHaveText(
    '经历节点',
  )
  await expect(timeline).toContainText('按时间记录重要变化。')
  await expect(timeline.locator('.about-page__timeline h3')).toHaveText([
    '开始独立写作',
    '第一份工作',
  ])
  await expect(page.locator('#about-profile-title')).toHaveText('夜航手记')
})

test('About editor validates input, preserves failed drafts, and rejects anonymous access', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/about')
  await page.getByLabel('故事板块标题').fill('')
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--error')).toContainText(
    '请先修正标出的内容',
  )
  await expect(page.getByLabel('故事板块标题')).toHaveValue('')

  await page.getByLabel('故事板块标题').fill('保留草稿')
  await page.getByLabel('故事板块导语').fill('服务暂时失败后的未保存内容。')
  await page.request.get(`${control}/failure?resource=admin`)
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--error')).toContainText(
    '当前输入仍然保留',
  )
  await expect(page.getByLabel('故事板块标题')).toHaveValue('保留草稿')
  await expect(page.getByLabel('故事板块导语')).toHaveValue(
    '服务暂时失败后的未保存内容。',
  )

  await page.request.get(`${control}/clear-failures`)
  await page.getByRole('button', { name: '保存关于页面' }).click()
  await expect(page.locator('.admin-about-feedback--success')).toContainText(
    '关于页面内容已保存',
  )

  await page.context().clearCookies()
  await page.goto('/admin/about')
  await expect(page).toHaveURL(/\/admin\/login\?redirect=\/admin\/about$/)

  const unauthorizedUpdate = await page.request.patch(
    'http://127.0.0.1:8787/api/v1/admin/settings',
    {
      headers: { 'X-CSRF-Token': 'mock-csrf' },
      data: { about: { story_heading: '未授权写入' } },
    },
  )
  expect(unauthorizedUpdate.status()).toBe(401)
  const publicSettings = await page.request.get(
    'http://127.0.0.1:8787/api/v1/settings',
  )
  expect((await publicSettings.json()).data.about.story_heading).toBe(
    '保留草稿',
  )
})

test('About editor remains usable without mobile horizontal overflow', async ({
  page,
}) => {
  await login(page)
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/admin')
  await page.getByRole('button', { name: '打开后台导航' }).click()
  await page
    .getByRole('navigation', { name: '移动端后台导航' })
    .getByRole('link', { name: '关于页面' })
    .click()
  await expect(
    page.getByRole('heading', { name: '关于页面', level: 1 }),
  ).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  await page.getByRole('textbox', { name: '故事段落 1' }).focus()
  await expect(page.getByRole('textbox', { name: '故事段落 1' })).toBeFocused()
})

async function login(page: Page) {
  await page.goto('/admin/login')
  await expect(page.locator('[data-admin-ready="true"]')).toBeVisible()
  await page.getByLabel('用户名或邮箱').fill('owner')
  await page.getByLabel('密码').fill('a sufficiently long password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

async function openAbout(page: Page) {
  const menuButton = page.getByRole('button', { name: '打开后台导航' })
  if (await menuButton.isVisible()) {
    await menuButton.click()
    await page
      .getByRole('navigation', { name: '移动端后台导航' })
      .getByRole('link', { name: '关于页面' })
      .click()
    return
  }
  const sidebarLink = page
    .getByRole('navigation', { name: '后台导航' })
    .getByRole('link', { name: '关于页面' })
  if (await sidebarLink.isVisible()) {
    await sidebarLink.click()
    return
  }
  await page.goto('/admin/about')
}
