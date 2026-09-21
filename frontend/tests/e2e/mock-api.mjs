import { createServer } from 'node:http'

const pageSize = (value, fallback = 20) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, 100)
    : fallback
}

const paginate = (items, page, size) => {
  const normalizedPage =
    Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const totalPages = items.length ? Math.ceil(items.length / size) : 0
  return {
    data: items.slice((normalizedPage - 1) * size, normalizedPage * size),
    pagination: {
      page: normalizedPage,
      page_size: size,
      total: items.length,
      total_pages: totalPages,
    },
  }
}

const taxonomy = {
  'design-notes': {
    id: 1,
    name: '设计札记',
    post_count: 3,
    slug: 'design-notes',
  },
  engineering: { id: 2, name: '工程实践', post_count: 3, slug: 'engineering' },
  life: { id: 3, name: '生活记录', post_count: 2, slug: 'life' },
}

const tags = {
  accessibility: {
    id: 1,
    name: 'Accessibility',
    post_count: 2,
    slug: 'accessibility',
  },
  api: { id: 2, name: 'API', post_count: 1, slug: 'api' },
  architecture: {
    id: 3,
    name: 'Architecture',
    post_count: 1,
    slug: 'architecture',
  },
  css: { id: 4, name: 'CSS', post_count: 1, slug: 'css' },
  'design-system': {
    id: 5,
    name: 'Design System',
    post_count: 2,
    slug: 'design-system',
  },
  life: { id: 6, name: 'Life', post_count: 2, slug: 'life' },
  markdown: { id: 7, name: 'Markdown', post_count: 1, slug: 'markdown' },
  notes: { id: 8, name: 'Notes', post_count: 1, slug: 'notes' },
  nuxt: { id: 9, name: 'Nuxt', post_count: 2, slug: 'nuxt' },
  reflection: { id: 10, name: 'Reflection', post_count: 1, slug: 'reflection' },
  ssr: { id: 11, name: 'SSR', post_count: 1, slug: 'ssr' },
  typescript: { id: 12, name: 'TypeScript', post_count: 1, slug: 'typescript' },
}

const basePost = (
  id,
  title,
  slug,
  summary,
  category,
  postTags,
  body,
  date,
  pinned = false,
) => ({
  id,
  title,
  slug,
  summary,
  status: 'published',
  is_pinned: pinned,
  reading_count: 40 + id,
  reading_time_minutes: 3 + (id % 6),
  cover_url: id === 1 ? '/images/background/ambient-640.avif' : null,
  cover_alt: id === 1 ? '深蓝色夜空与柔和光晕' : null,
  published_at: `${date}T08:00:00.000Z`,
  created_at: `${date}T08:00:00.000Z`,
  updated_at: `${date}T08:00:00.000Z`,
  category: taxonomy[category],
  tags: postTags.map((tag) => tags[tag]),
  body,
})

const posts = [
  basePost(
    1,
    '把复杂的东西，留在安静的地方',
    'spatial-notes',
    '把复杂的交互留在组件里，让页面只负责讲清楚一件事。',
    'design-notes',
    ['design-system', 'nuxt'],
    '从设计 token 到页面层级，记录如何让一个界面保持安静而清晰。',
    '2026-09-14',
    true,
  ),
  basePost(
    2,
    'Markdown 是一条可迁移的路',
    'markdown-first',
    '可迁移的内容格式，给长期写作留出比编辑器更长的寿命。',
    'engineering',
    ['markdown', 'architecture'],
    '## 一种更长寿的写作格式\n\nMarkdown 让文章脱离某一个编辑器仍然可以迁移、审阅和长期保存。\n\n> 好的格式应该让内容走得更远。\n\n| 能力 | 结果 |\n| --- | --- |\n| 可读 | 可以直接审阅源文件 |\n| 可迁移 | 不依赖单一编辑器 |\n\n```ts\nconst format = "portable"\n```\n\n行内数学 $E=mc^2$ 可以和普通段落自然共存。\n\n$$\n\\sum_{i=1}^n i = \\frac{n(n+1)}{2}\n$$\n\n![一张可能已经被移除的示例图片](/media/missing-markdown-image.webp)',
    '2026-09-06',
  ),
  basePost(
    3,
    '缓慢生长，也是一种进度',
    'slow-growth',
    '一些关于持续、耐心和把小事做好的私人笔记。',
    'life',
    ['life', 'notes'],
    '关于持续、耐心和把小事做好的私人笔记。',
    '2026-08-28',
  ),
  basePost(
    4,
    '让首屏从一开始就有内容',
    'ssr-first-paint',
    '首屏不是等待数据出现，而是让内容从一开始就在那里。',
    'engineering',
    ['nuxt', 'ssr'],
    '用 Nuxt 的 SSR 把第一屏真正需要的内容交给搜索引擎和读者。',
    '2026-08-21',
  ),
  basePost(
    5,
    '状态本身也是内容',
    'states-as-content',
    '加载、空白和错误也属于体验的一部分，不应该被藏起来。',
    'design-notes',
    ['accessibility', 'design-system'],
    '用清晰的状态边界处理 loading、empty、error，让恢复动作自然可见。',
    '2026-08-13',
  ),
  basePost(
    6,
    '先把边界说清楚',
    'small-contracts',
    '先把边界说清楚，再让实现自由地生长。',
    'engineering',
    ['typescript', 'api'],
    '一套轻量的 TypeScript contract 帮助页面和未来 API 保持同一种语言。',
    '2026-08-04',
  ),
  basePost(
    7,
    '空间感不应该牺牲对比度',
    'contrast-in-space',
    '在深色空间里保持阅读对比度，视觉才有余地变得柔和。',
    'design-notes',
    ['accessibility', 'css'],
    '深色背景不等于低对比度，真正的空间感需要让文字有可靠的落点。',
    '2026-07-26',
  ),
  basePost(
    8,
    '给生活留一点空白',
    'a-little-blank',
    '留一点没有安排的空白，生活会自己找到呼吸的节奏。',
    'life',
    ['life', 'reflection'],
    '把周末留给没有安排的时间，回头看时才发现它也在慢慢整理生活。',
    '2026-07-15',
  ),
].sort(
  (left, right) =>
    Number(right.is_pinned) - Number(left.is_pinned) ||
    right.published_at.localeCompare(left.published_at),
)

const moments = [
  {
    id: 1,
    body: '今天把首页的第一道光调得更柔和了。来自公开 API 的动态记录，也像窗帘缝隙透进来的亮。',
    location: '书桌旁',
    mood: '专注',
    published_at: '2026-09-17T13:30:00.000Z',
    images: [
      {
        alt: '深蓝色夜空与柔和光晕',
        height: 451,
        src: '/uploads/images/moment-soft-light.webp',
        width: 640,
      },
    ],
    tags: [{ content_count: 2, id: 1, name: 'Building', slug: 'building' }],
  },
  {
    id: 2,
    body: '把一段很久没有读完的书重新翻开。',
    location: '窗边',
    mood: '平静',
    published_at: '2026-09-12T10:00:00.000Z',
    images: [
      {
        alt: '窗边摊开的书',
        height: 451,
        src: '/uploads/images/moment-open-book.webp',
        width: 640,
      },
    ],
    tags: [{ content_count: 1, id: 2, name: 'Reading', slug: 'reading' }],
  },
  {
    id: 3,
    body: '周末留了一点空白，没有安排，也没有追赶什么。',
    location: null,
    mood: '松弛',
    published_at: '2026-09-07T04:00:00.000Z',
    images: [],
    tags: [],
  },
  {
    id: 4,
    body: '为一个小组件补上键盘路径，才发现真正的顺手不是更快，而是不用猜下一步会发生什么。',
    location: '深夜工作台',
    mood: '清醒',
    published_at: '2026-09-03T15:20:00.000Z',
    images: [],
    tags: [
      { content_count: 2, id: 3, name: 'Accessibility', slug: 'accessibility' },
      { content_count: 2, id: 1, name: 'Building', slug: 'building' },
    ],
  },
  {
    id: 5,
    body: '回家的路上拍到一片很安静的蓝。它提醒我，长内容也可以留一点不急着解释的地方。',
    location: null,
    mood: '观察',
    published_at: '2026-08-29T11:45:00.000Z',
    images: [
      {
        alt: '傍晚的蓝色街景',
        height: 451,
        src: '/uploads/images/missing-evening-blue.webp',
        width: 640,
      },
    ],
    tags: [{ content_count: 1, id: 4, name: 'Life', slug: 'life' }],
  },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: index + 6,
    body: `分页动态 ${index + 1}：把公开内容继续整理成可浏览的时间线。`,
    location: '夜间工作台',
    mood: '记录',
    published_at: `2026-08-${String(28 - index).padStart(2, '0')}T08:00:00.000Z`,
    images: [],
    tags: [],
  })),
]

const chatter = [
  {
    id: 1,
    title: '让界面先学会呼吸',
    lead: '留白不是空着，而是给信息之间留出可以呼吸的距离。',
    body: '留白不是空着，而是给信息之间留出可以呼吸的距离。',
    mood: '设计',
    published_at: '2026-09-15T08:00:00.000Z',
    tags: [
      { content_count: 1, id: 10, name: 'UI', slug: 'ui' },
      { content_count: 2, id: 11, name: 'Reflection', slug: 'reflection' },
    ],
  },
  {
    id: 2,
    title: '先把边界说清楚',
    lead: '公开 API 的杂谈：一个小而明确的类型边界，通常比一个聪明的全能抽象更容易长久。',
    body: '公开 API 的杂谈：一个小而明确的类型边界，通常比一个聪明的全能抽象更容易长久。',
    mood: '工程',
    published_at: '2026-09-09T08:00:00.000Z',
    tags: [
      { content_count: 1, id: 12, name: 'TypeScript', slug: 'typescript' },
      { content_count: 1, id: 13, name: 'API', slug: 'api' },
    ],
  },
  {
    id: 3,
    title: '把今天交给今天',
    lead: '能在夜里安静收尾的工作，第二天往往也更容易继续。',
    body: '能在夜里安静收尾的工作，第二天往往也更容易继续。',
    mood: '日常',
    published_at: '2026-09-02T08:00:00.000Z',
    tags: [
      { content_count: 2, id: 11, name: 'Reflection', slug: 'reflection' },
    ],
  },
  {
    id: 4,
    title: '状态也值得被写好',
    lead: '把搜索、筛选和空状态都当成内容的一部分，短记录也就不会因为数据变少而显得失去方向。',
    body: '把搜索、筛选和空状态都当成内容的一部分，短记录也就不会因为数据变少而显得失去方向。',
    mood: '产品',
    published_at: '2026-08-26T08:00:00.000Z',
    tags: [
      { content_count: 1, id: 14, name: 'UX', slug: 'ux' },
      {
        content_count: 1,
        id: 15,
        name: 'Accessibility',
        slug: 'accessibility',
      },
    ],
  },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: index + 5,
    title: `分页杂谈 ${index + 1}`,
    lead: '分页数据也应该保留清晰的上下文与可恢复的路径。',
    body: '分页数据也应该保留清晰的上下文与可恢复的路径。',
    mood: '记录',
    published_at: `2026-08-${String(25 - index).padStart(2, '0')}T08:00:00.000Z`,
    tags: [],
  })),
]

const projects = [
  {
    id: 1,
    name: 'Lumen Notes',
    description: '来自公开 API 的项目描述。',
    logo_url: null,
    logo_alt: null,
    technology: ['Nuxt', 'TypeScript', 'SQLite'],
    source_url: 'https://github.com/example/lumen-notes',
    demo_url: 'https://example.com/lumen-notes',
    status: 'active',
    featured: true,
    display_order: 0,
    time_span: '2025.02 — 2026.06',
  },
  {
    id: 2,
    name: 'Quiet API',
    description: '面向个人项目的清晰 API 约定与错误边界实验。',
    logo_url: null,
    logo_alt: null,
    technology: ['FastAPI', 'MySQL', 'OpenAPI'],
    source_url: 'https://github.com/example/quiet-api',
    demo_url: 'https://example.com/quiet-api',
    status: 'developing',
    featured: true,
    display_order: 1,
    time_span: '2026.03 — 至今',
  },
  {
    id: 3,
    name: 'Archive Garden',
    description: '一份关于阅读、写作和长期维护的静态资料集。',
    logo_url: null,
    logo_alt: null,
    technology: ['Markdown', 'Astro'],
    source_url: 'https://github.com/example/archive-garden',
    demo_url: null,
    status: 'archived',
    featured: false,
    display_order: 2,
    time_span: '2024.09 — 2025.01',
  },
]

const friends = [
  {
    id: 1,
    name: 'Lantern Notes',
    avatar_url: '/uploads/images/lantern-notes.webp',
    avatar_alt: 'Lantern Notes 网站头像',
    description: '记录界面、阅读和那些不急着完成的灵感。',
    url: 'https://example.com/lantern-notes',
    display_order: 0,
    is_active: true,
  },
  {
    id: 2,
    name: 'Soft Interfaces',
    avatar_url: '/uploads/images/soft-interfaces.webp',
    avatar_alt: 'Soft Interfaces 网站头像',
    description: '一份持续整理中的前端工程与可访问性笔记。',
    url: 'https://example.com/soft-interfaces',
    display_order: 1,
    is_active: true,
  },
  {
    id: 3,
    name: 'Blue Hour',
    avatar_url: '/uploads/images/blue-hour.webp',
    avatar_alt: 'Blue Hour 网站头像',
    description: '从植物、城市和慢速摄影里寻找日常的光。',
    url: 'https://example.com/blue-hour',
    display_order: 2,
    is_active: true,
  },
]

const settings = {
  name: '夜航手记',
  tagline: '在夜色里，写下仍然发光的事',
  description: '关于技术、生活与缓慢生长的个人记录。',
  profile: '一个喜欢把复杂问题拆小、把长期工作做得可持续的人。',
  avatar_url: null,
  avatar_alt: null,
  favicon_url: null,
  social_links: [
    { href: 'https://github.com/', kind: 'code', label: 'GitHub' },
    { href: 'https://mastodon.social/', kind: 'social', label: 'Mastodon' },
  ],
  seo_defaults: {
    title: '夜航手记',
    description: '关于技术、生活与缓慢生长的个人记录。',
    keywords: [],
    canonical_url: null,
    og_image_url: null,
    twitter_card: 'summary',
  },
  footer: { note: '一个安静的个人出版空间。', copyright: '', icp: '' },
  contact: { email: 'live@example.com', note: '欢迎从公开配置发来一封信。' },
  about: {
    interests: ['独立产品', '可访问性', '环境音乐'],
    skills: [
      { items: ['Vue / Nuxt', 'TypeScript'], name: '界面与体验' },
      { items: ['FastAPI', 'MySQL'], name: '服务与数据' },
    ],
    story: [
      '这段内容来自可配置的 About Site Identity。',
      '它与公开站点设置一起服务，而不是来自静态前端数据。',
    ],
    timeline: [
      {
        description: '从 live API 开始整理公开内容。',
        period: '2026',
        title: '让内容回到配置',
      },
    ],
  },
  homepage_visibility: {
    posts: true,
    moments: true,
    chatter: true,
    projects: true,
    friends: true,
    music: true,
  },
}

const tracks = [
  {
    id: 1,
    title: '月光落在窗边',
    artist: '本地示例音源',
    source_url: '/audio/ambient-example.mp3',
    artwork_url: null,
    artwork_alt: null,
    album: null,
    duration_seconds: null,
    display_order: 0,
  },
  {
    id: 2,
    title: '雨落在玻璃上',
    artist: '本地示例音源',
    source_url: '/audio/quiet-example.mp3',
    artwork_url: null,
    artwork_alt: null,
    album: null,
    duration_seconds: null,
    display_order: 1,
  },
]

const failures = new Set()

const publicPost = (post) =>
  Object.fromEntries(Object.entries(post).filter(([key]) => key !== 'body'))

const filteredPosts = (query) =>
  posts.filter((post) => {
    const searchable = [
      post.title,
      post.summary,
      post.body,
      post.category?.name,
      ...post.tags.map((tag) => tag.name),
    ]
      .join(' ')
      .toLocaleLowerCase()
    return (
      (!query.category || post.category?.slug === query.category) &&
      (!query.tag || post.tags.some((tag) => tag.slug === query.tag)) &&
      (!query.q || searchable.includes(query.q.toLocaleLowerCase()))
    )
  })

const filteredFeed = (items, query) =>
  items.filter((item) => {
    const searchable = [
      item.title,
      item.lead,
      item.body,
      item.location,
      item.mood,
      ...item.tags.flatMap((tag) => [tag.name, tag.slug]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
    return (
      (!query.tag || item.tags.some((tag) => tag.slug === query.tag)) &&
      (!query.q || searchable.includes(query.q.toLocaleLowerCase()))
    )
  })

const publicTags = (items) => [
  ...new Map(
    items.flatMap((item) => item.tags).map((tag) => [tag.slug, tag]),
  ).values(),
]

const json = (response, payload, status = 200) => {
  response.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, X-CSRF-Token',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(payload))
}

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    json(response, {})
    return
  }
  const url = new URL(request.url, 'http://127.0.0.1:8787')
  const path = url.pathname.replace(/^\/api\/v1/, '')
  const query = Object.fromEntries(url.searchParams.entries())
  const size = pageSize(query.page_size)

  if (path.startsWith('/uploads/')) {
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'image/png',
    })
    response.end(tinyPng)
    return
  }

  if (path === '/health') {
    json(response, { status: 'ok' })
    return
  }
  if (path === '/__control/failure') {
    const resource = query.resource
    if (resource) failures.add(resource)
    json(response, { failures: [...failures] })
    return
  }
  if (path === '/__control/reset') {
    failures.clear()
    json(response, { failures: [] })
    return
  }
  if (failures.has(path.split('/')[1])) {
    json(
      response,
      {
        error: {
          code: 'upstream_unavailable',
          details: null,
          message: '内容服务暂时无法响应，请稍后重试。',
        },
      },
      503,
    )
    return
  }
  if (path === '/settings') {
    json(response, { data: settings })
    return
  }
  if (path === '/music-tracks') {
    json(response, { ...paginate(tracks, query.page, size) })
    return
  }
  if (path === '/projects') {
    json(response, { ...paginate(projects, query.page, size) })
    return
  }
  if (path === '/friends') {
    json(response, { ...paginate(friends, query.page, size) })
    return
  }
  if (path === '/moments/tags') {
    json(response, { ...paginate(publicTags(moments), query.page, size) })
    return
  }
  if (path === '/moments') {
    json(response, {
      ...paginate(filteredFeed(moments, query), query.page, size),
      filters: Object.fromEntries(
        Object.entries(query).filter(([key]) => ['tag', 'q'].includes(key)),
      ),
    })
    return
  }
  if (path === '/chatter/tags') {
    json(response, { ...paginate(publicTags(chatter), query.page, size) })
    return
  }
  if (path === '/chatter') {
    json(response, {
      ...paginate(filteredFeed(chatter, query), query.page, size),
      filters: Object.fromEntries(
        Object.entries(query).filter(([key]) => ['tag', 'q'].includes(key)),
      ),
    })
    return
  }
  if (path === '/categories') {
    json(response, { ...paginate(Object.values(taxonomy), query.page, size) })
    return
  }
  if (path === '/tags') {
    json(response, { ...paginate(Object.values(tags), query.page, size) })
    return
  }
  if (path === '/posts') {
    const filtered = filteredPosts(query).map(publicPost)
    json(response, {
      ...paginate(filtered, query.page, size),
      filters: Object.fromEntries(
        Object.entries(query).filter(([key]) =>
          ['category', 'tag', 'q'].includes(key),
        ),
      ),
    })
    return
  }
  const postMatch = path.match(/^\/posts\/([^/]+)$/)
  if (postMatch) {
    const post = posts.find(
      (candidate) => candidate.slug === decodeURIComponent(postMatch[1]),
    )
    if (!post) {
      json(
        response,
        {
          error: {
            code: 'post_not_found',
            message: 'The requested Post does not exist',
            details: null,
          },
        },
        404,
      )
      return
    }
    json(response, { data: post })
    return
  }
  json(
    response,
    { error: { code: 'not_found', message: 'Not found', details: null } },
    404,
  )
})

server.listen(8787, '127.0.0.1')
