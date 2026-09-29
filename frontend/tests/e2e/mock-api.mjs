import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'

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

posts.find((post) => post.slug === 'markdown-first').cover_url =
  'https://example.com/media/markdown-first.webp'
posts.find((post) => post.slug === 'markdown-first').cover_alt =
  'Markdown 文章封面'

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

// v2 public fixtures: legacy personal updates are Chatter, with no tags or lead.
for (const item of chatter) {
  delete item.tags
  delete item.lead
  item.images = []
}
chatter[0].body += '这是一条可以展开的长记录。'.repeat(32)
chatter.push(
  ...moments.map((item) => ({
    id: item.id + 100,
    body: item.body,
    mood: item.mood,
    title: null,
    images: item.images ?? [],
    published_at: item.published_at,
  })),
)
const publicChatter = (query) =>
  chatter.filter(
    (item) =>
      (!query.entry || item.id === Number(query.entry)) &&
      (!query.q ||
        [item.title, item.body]
          .join(' ')
          .toLowerCase()
          .includes(query.q.toLowerCase())),
  )

const projects = [
  {
    id: 1,
    project_type: 'personal',
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
    project_type: 'personal',
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
    project_type: 'personal',
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
  avatar_url: '/uploads/images/site-avatar.webp',
  background_gallery: [],
  avatar_alt: null,
  favicon_url: null,
  social_links: [
    { href: 'https://github.com/', kind: 'code', label: 'GitHub' },
    { href: 'https://mastodon.social/', kind: 'social', label: 'Mastodon' },
  ],
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
    netease_song_id: '32001',
    provider_url: 'https://music.163.com/song?id=32001',
    title: '月光落在窗边',
    artist: '本地示例音源',
    album: '夜航',
    artwork_url: '/images/background/ambient-640.avif',
    artwork_alt: '月光落在窗边的示例封面',
    duration_seconds: 214,
    display_order: 0,
    is_enabled: true,
  },
  {
    id: 2,
    netease_song_id: '32002',
    provider_url: 'https://music.163.com/song?id=32002',
    title: '雨落在玻璃上',
    artist: '本地示例音源',
    album: null,
    artwork_url: null,
    artwork_alt: null,
    duration_seconds: null,
    display_order: 1,
    is_enabled: true,
  },
  {
    id: 3,
    netease_song_id: '32003',
    provider_url: 'https://music.163.com/song?id=32003',
    title: '远岸星云',
    artist: '示例歌手',
    album: null,
    artwork_url: null,
    artwork_alt: null,
    duration_seconds: null,
    display_order: 2,
    is_enabled: false,
  },
]

const mediaPolicy = {
  accepted_image_types: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
  accepted_audio_types: ['audio/flac', 'audio/mpeg', 'audio/ogg', 'audio/wav'],
  max_upload_bytes: 262144,
  image_max_upload_bytes: 262144,
  image_max_pixels: 25000000,
  image_max_dimension: 10000,
}

const mediaSeed = [
  {
    id: 1,
    filename: 'night-sky.webp',
    kind: 'image',
    type: 'image/webp',
    size: 184320,
    width: 1280,
    height: 720,
    key: 'images/2026/09/11111111111111111111111111111111.webp',
    createdAt: '2026-09-18T08:00:00.000Z',
  },
  {
    id: 2,
    filename: 'ambient-loop.wav',
    kind: 'audio',
    type: 'audio/wav',
    size: 352044,
    width: null,
    height: null,
    key: 'audio/2026/09/22222222222222222222222222222222.wav',
    createdAt: '2026-09-17T08:00:00.000Z',
  },
  {
    id: 3,
    filename: 'post-cover.webp',
    kind: 'image',
    type: 'image/webp',
    size: 96256,
    width: 640,
    height: 451,
    key: 'images/2026/09/33333333333333333333333333333333.webp',
    createdAt: '2026-09-16T08:00:00.000Z',
    references: [{ resource_type: 'post', resource_id: 1, field: 'cover_url' }],
  },
  {
    id: 4,
    filename: 'missing-bytes.webp',
    kind: 'image',
    type: 'image/webp',
    size: 51200,
    width: 640,
    height: 451,
    key: 'images/2026/09/44444444444444444444444444444444.webp',
    createdAt: '2026-09-15T08:00:00.000Z',
    missingBytes: true,
  },
  {
    id: 5,
    filename: 'stale-metadata.png',
    kind: 'image',
    type: 'image/png',
    size: 40960,
    width: 320,
    height: 320,
    key: 'images/2026/09/55555555555555555555555555555555.png',
    createdAt: '2026-09-14T08:00:00.000Z',
    staleMetadata: true,
  },
  ...Array.from({ length: 12 }, (_, index) => ({
    id: index + 6,
    filename: `环境音 ${String(index + 1).padStart(2, '0')}.mp3`,
    kind: 'audio',
    type: 'audio/mpeg',
    size: 1048576 + index * 2048,
    width: null,
    height: null,
    key: `audio/2026/09/${String(index + 6).repeat(32)}.mp3`,
    createdAt: `2026-08-${String(28 - index).padStart(2, '0')}T08:00:00.000Z`,
  })),
]

const initialMediaAssets = structuredClone(mediaSeed)
const mediaAssets = structuredClone(mediaSeed)

const mediaAssetResponse = (asset) => ({
  id: asset.id,
  original_filename: asset.filename,
  media_kind: asset.kind,
  content_type: asset.type,
  size_bytes: asset.size,
  width: asset.width,
  height: asset.height,
  storage_strategy: 'local',
  key: asset.key,
  url: `/uploads/${asset.key}`,
  created_at: asset.createdAt,
})

const mediaReferencesForAsset = (asset) => {
  const references = [...(asset.references ?? [])]
  if (settings.about?.banner_url === `/uploads/${asset.key}`) {
    references.push({
      resource_type: 'site_settings',
      resource_id: 1,
      field: 'about.banner_url',
    })
  }
  return references
}

const tinyWav = (() => {
  const sampleRate = 8000
  const dataSize = 800 * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  return buffer
})()

const sniffImageType = (buffer) => {
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg'
  }
  if (buffer.subarray(0, 6).toString('ascii').startsWith('GIF8')) {
    return 'image/gif'
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

const sniffAudioType = (buffer) => {
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    return 'audio/wav'
  }
  if (
    buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
    (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return 'audio/mpeg'
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'fLaC') {
    return 'audio/flac'
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return 'audio/ogg'
  }
  return null
}

const parseMultipart = (buffer, contentType) => {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(
    contentType || '',
  )
  if (!boundaryMatch) return null
  const boundary = `--${(boundaryMatch[1] || boundaryMatch[2]).trim()}`
  for (const part of buffer.toString('binary').split(boundary)) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headers = part.slice(0, headerEnd)
    const nameMatch = /name="([^"]+)"/i.exec(headers)
    if (!nameMatch || nameMatch[1] !== 'file') continue
    const filenameMatch = /filename="([^"]*)"/i.exec(headers)
    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers)
    let content = part.slice(headerEnd + 4)
    if (content.endsWith('\r\n')) content = content.slice(0, -2)
    return {
      content: Buffer.from(content, 'binary'),
      contentType: (typeMatch?.[1] || '').trim().toLowerCase(),
      filename: filenameMatch?.[1] || 'upload',
    }
  }
  return null
}

const readBuffer = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks)
}

const mediaKeyFor = (kind, contentType) => {
  const folder = kind === 'image' ? 'images' : 'audio'
  const extension = {
    'audio/flac': 'flac',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }[contentType]
  return `${folder}/2026/09/${randomBytes(16).toString('hex')}.${extension}`
}

const failures = new Set()
const authState = { forbidden: false }
const initialPosts = structuredClone(posts)
const initialTaxonomy = structuredClone(taxonomy)
const initialTags = structuredClone(tags)
const initialProjects = structuredClone(projects)
const initialFriends = structuredClone(friends)
const initialSettings = structuredClone(settings)
const initialTracks = structuredClone(tracks)
const settingsMeta = {
  created_at: '2026-09-01T08:00:00.000Z',
  updated_at: '2026-09-20T08:00:00.000Z',
}

const withAdminDates = (item) => ({
  ...item,
  created_at: item.created_at || '2026-09-01T08:00:00.000Z',
  updated_at: item.updated_at || '2026-09-20T08:00:00.000Z',
})

const orderedMusicTracks = () =>
  [...tracks].sort(
    (left, right) =>
      left.display_order - right.display_order || left.id - right.id,
  )

const publicMusicTrack = (track) => ({
  id: track.id,
  netease_song_id: track.netease_song_id,
  provider_url: track.provider_url,
  title: track.title,
  artist: track.artist,
  album: track.album ?? null,
  artwork_url: track.artwork_url ?? null,
  artwork_alt: track.artwork_alt ?? null,
  duration_seconds: track.duration_seconds ?? null,
  display_order: track.display_order,
})

const adminSettings = () => ({
  ...settings,
  ...settingsMeta,
  id: 1,
})

const publicPortfolioItem = (item) =>
  Object.fromEntries(
    Object.entries(item).filter(
      ([key]) => key !== 'created_at' && key !== 'updated_at',
    ),
  )

const restoreMap = (target, source) => {
  Object.keys(target).forEach((key) => delete target[key])
  Object.assign(target, structuredClone(source))
}

const publicPost = (post) =>
  Object.fromEntries(Object.entries(post).filter(([key]) => key !== 'body'))

const adminPost = (post) => ({
  ...post,
  category_id: post.category?.id ?? null,
  cover_alt: post.cover_alt ?? null,
  cover_url: post.cover_url ?? null,
  tag_ids: post.tags.map((tag) => tag.id),
})

const estimateReadingTimeMinutes = (markdown) => {
  const readableText = markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(
      /^\s{0,3}(?:#{1,6}[ \t]+|>[ \t]?|[-+*][ \t]+(?:\[[ xX]\][ \t]+)?|\d+[.)][ \t]+)/gm,
      '',
    )
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
  const cjk =
    readableText.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    ) ?? []
  const latinWords =
    readableText
      .replace(
        /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
        ' ',
      )
      .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
  const minutes = Math.ceil(latinWords.length / 200 + cjk.length / 400)
  return readableText.trim() ? Math.max(1, minutes) : 0
}

const taxonomyItems = (kind) => (kind === 'category' ? taxonomy : tags)
const findTaxonomy = (kind, id) =>
  Object.values(taxonomyItems(kind)).find((item) => item.id === Number(id))

const replaceTaxonomy = (kind, current, next) => {
  const items = taxonomyItems(kind)
  delete items[current.slug]
  items[next.slug] = next
  posts.forEach((post) => {
    if (kind === 'category' && post.category?.id === current.id)
      post.category = next
    if (kind === 'tag') {
      post.tags = post.tags.map((tag) => (tag.id === current.id ? next : tag))
    }
  })
}

const withPostPayload = (post, payload) => {
  const next = { ...post }
  for (const key of [
    'title',
    'slug',
    'summary',
    'body',
    'is_pinned',
    'cover_url',
    'cover_alt',
  ]) {
    if (Object.hasOwn(payload, key)) next[key] = payload[key]
  }
  if (Object.hasOwn(payload, 'body')) {
    next.reading_time_minutes = estimateReadingTimeMinutes(payload.body ?? '')
  }
  if (Object.hasOwn(payload, 'category_id')) {
    next.category = payload.category_id
      ? (Object.values(taxonomy).find(
          (item) => item.id === Number(payload.category_id),
        ) ?? null)
      : null
  }
  if (Object.hasOwn(payload, 'tag_ids')) {
    next.tags = payload.tag_ids
      .map((id) => Object.values(tags).find((item) => item.id === Number(id)))
      .filter(Boolean)
  }
  return next
}

const filteredPosts = (query) =>
  posts.filter((post) => {
    const searchable = [
      post.title,
      post.summary,
      post.body,
      ...post.tags.map((tag) => tag.name),
    ]
      .join(' ')
      .toLocaleLowerCase()
    return (
      (!query.tag || post.tags.some((tag) => tag.slug === query.tag)) &&
      (!query.q || searchable.includes(query.q.toLocaleLowerCase()))
    )
  })

const publicTags = (items) => [
  ...new Map(
    items.flatMap((item) => item.tags).map((tag) => [tag.slug, tag]),
  ).values(),
]

const json = (response, payload, status = 200, extraHeaders = {}) => {
  response.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, X-CSRF-Token',
    'Access-Control-Allow-Methods': 'DELETE, GET, PATCH, POST, OPTIONS',
    'Access-Control-Allow-Origin':
      process.env.MOCK_API_ORIGIN || 'http://127.0.0.1:3000',
    'Content-Type': 'application/json',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

const parseCookies = (value = '') =>
  Object.fromEntries(
    value
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, cookieValue]) => key && cookieValue)
      .map(([key, cookieValue]) => [key, decodeURIComponent(cookieValue)]),
  )

const readJson = async (request) => {
  let body = ''
  for await (const chunk of request) body += chunk
  try {
    return JSON.parse(body || '{}')
  } catch {
    return {}
  }
}

const authUser = {
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'owner@example.com',
  id: 1,
  is_active: true,
  username: 'owner',
}

const dashboard = {
  counts: {
    chatter: 13,
    draft_posts: 2,
    friends: 3,
    posts: 10,
    projects: 3,
    published_posts: 8,
    total_reading_count: 388,
  },
  recent_activity: [
    {
      id: 1,
      status: 'published',
      title: '后台状态示例文章',
      type: 'post',
      updated_at: '2026-09-20T08:00:00.000Z',
    },
    {
      id: 1,
      status: 'draft',
      title: '让界面先学会呼吸',
      type: 'chatter',
      updated_at: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 1,
      status: 'published',
      title: '今天把首页的第一道光调得更柔和了。',
      type: 'chatter',
      updated_at: '2026-09-17T13:30:00.000Z',
    },
    {
      id: 2,
      status: null,
      title: 'Dashboard GitHub 项目',
      type: 'project',
      updated_at: '2026-09-16T08:00:00.000Z',
    },
  ],
}

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAIAAABqVuVZAAABCUlEQVR42u3WMQoDMQwF0Vmz58hJcsQcOkUgJMtahcHYlkeo+92r5ng8X4Wj/mXz9aQcUPtSn3ZZAyB1IiB1IiB1IiB1/tYLkDrX9RdInZv1C6TO/foBUqe6nhR1otWSjlcs6UgnAFKHAEgdAiB1CIDUIQBShwBIHQIgdQiA1CEGUqcRSJ3dS5pmIHV2L2magdTZvaRpBlJn95KmGUid3UuaTkDq5C9pOgGpk7+k6QSkTv6SphOQOvlLmk5A6uQvaYYAqZOhpBkCpE6GkmYIkDoZSpohQOpkKGmGAKmToaSZEEidNUqaCYHUWaOkmRBInTVKmgmB1FmjpJkQSJ01SprlgNSZpaSnvjc9gBdbduq/fgAAAABJRU5ErkJggg==',
  'base64',
)

const adminMoments = []
const adminChatters = []

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    json(response, {})
    return
  }
  const url = new URL(request.url, 'http://127.0.0.1:8787')
  const path = url.pathname.replace(/^\/api\/v1/, '')
  const query = Object.fromEntries(url.searchParams.entries())
  const size = pageSize(query.page_size)
  const cookies = parseCookies(request.headers.cookie)

  if (path.startsWith('/uploads/')) {
    const key = decodeURIComponent(path.replace(/^\/uploads\//, ''))
    const asset = mediaAssets.find((item) => item.key === key)
    if (key.includes('..') || asset?.missingBytes) {
      json(
        response,
        {
          error: {
            code: 'media_bytes_missing',
            message: 'The Media Asset bytes are missing',
          },
        },
        404,
      )
      return
    }
    const isAudio = key.startsWith('audio/')
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': isAudio ? 'audio/wav' : 'image/png',
    })
    response.end(isAudio ? tinyWav : tinyPng)
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
  if (path === '/__control/clear-failures') {
    failures.clear()
    json(response, { failures: [] })
    return
  }
  if (path === '/__control/clear-media') {
    mediaAssets.length = 0
    json(response, { cleared: true })
    return
  }
  if (path === '/__control/site-settings' && request.method === 'POST') {
    const payload = await readJson(request)
    settings.background_gallery = structuredClone(
      payload.background_gallery ?? [],
    )
    json(response, { data: settings.background_gallery })
    return
  }
  if (path === '/__control/projects' && request.method === 'POST') {
    const payload = await readJson(request)
    const replacement = Array.isArray(payload.projects) ? payload.projects : []
    projects.splice(0, projects.length, ...structuredClone(replacement))
    json(response, { count: projects.length })
    return
  }
  if (path === '/__control/reset') {
    failures.clear()
    adminMoments.length = 0
    adminChatters.length = 0
    authState.forbidden = false
    posts.splice(0, posts.length, ...structuredClone(initialPosts))
    restoreMap(taxonomy, initialTaxonomy)
    restoreMap(tags, initialTags)
    projects.splice(0, projects.length, ...structuredClone(initialProjects))
    friends.splice(0, friends.length, ...structuredClone(initialFriends))
    tracks.splice(0, tracks.length, ...structuredClone(initialTracks))
    mediaAssets.splice(
      0,
      mediaAssets.length,
      ...structuredClone(initialMediaAssets),
    )
    Object.keys(settings).forEach((key) => delete settings[key])
    Object.assign(settings, structuredClone(initialSettings))
    settingsMeta.updated_at = settingsMeta.created_at
    json(response, { failures: [] }, 200, {
      'Set-Cookie': [
        'access_token=; Max-Age=0; Path=/api/v1',
        'refresh_token=; Max-Age=0; Path=/api/v1/auth',
        'csrf_token=; Max-Age=0; Path=/api/v1',
      ],
    })
    return
  }
  if (path === '/__control/expire-access') {
    json(response, { expired: true }, 200, {
      'Set-Cookie': ['access_token=; Max-Age=0; Path=/api/v1'],
    })
    return
  }
  if (path === '/__control/expire-session') {
    json(response, { expired: true }, 200, {
      'Set-Cookie': [
        'access_token=; Max-Age=0; Path=/api/v1',
        'refresh_token=; Max-Age=0; Path=/api/v1/auth',
      ],
    })
    return
  }
  if (path === '/__control/forbid') {
    authState.forbidden = true
    json(response, { forbidden: true })
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
  if (path === '/auth/csrf') {
    const token = cookies.csrf_token || 'mock-csrf'
    json(response, { data: { token } }, 200, {
      'Set-Cookie': [`csrf_token=${token}; Path=/api/v1`],
    })
    return
  }
  if (path === '/auth/login' && request.method === 'POST') {
    const payload = await readJson(request)
    if (
      payload.identifier !== 'owner' ||
      payload.password !== 'a sufficiently long password'
    ) {
      json(
        response,
        {
          error: {
            code: 'invalid_credentials',
            message: 'The supplied credentials are invalid',
          },
        },
        401,
      )
      return
    }
    json(response, { data: { user: authUser } }, 200, {
      'Set-Cookie': [
        'access_token=mock-access; HttpOnly; Path=/api/v1',
        'refresh_token=mock-refresh; HttpOnly; Path=/api/v1/auth',
        'csrf_token=mock-csrf; Path=/api/v1',
      ],
    })
    return
  }
  if (path === '/auth/refresh' && request.method === 'POST') {
    if (cookies.refresh_token !== 'mock-refresh') {
      json(
        response,
        {
          error: {
            code: 'invalid_refresh_token',
            message: 'The refresh session is invalid',
          },
        },
        401,
      )
      return
    }
    json(response, { data: { user: authUser } }, 200, {
      'Set-Cookie': [
        'access_token=mock-access; HttpOnly; Path=/api/v1',
        'refresh_token=mock-refresh; HttpOnly; Path=/api/v1/auth',
        'csrf_token=mock-csrf; Path=/api/v1',
      ],
    })
    return
  }
  if (path === '/auth/logout' && request.method === 'POST') {
    json(response, { data: { logged_out: true } }, 200, {
      'Set-Cookie': [
        'access_token=; Max-Age=0; Path=/api/v1',
        'refresh_token=; Max-Age=0; Path=/api/v1/auth',
      ],
    })
    return
  }
  if (path === '/auth/me') {
    if (authState.forbidden) {
      json(
        response,
        {
          error: { code: 'forbidden', message: 'You cannot access this area' },
        },
        403,
      )
      return
    }
    if (cookies.access_token !== 'mock-access') {
      json(
        response,
        {
          error: {
            code: 'access_token_expired',
            message: 'Authentication is required',
          },
        },
        401,
      )
      return
    }
    json(response, { data: authUser })
    return
  }
  if (path === '/admin/dashboard') {
    if (cookies.access_token !== 'mock-access') {
      json(
        response,
        {
          error: {
            code: 'authentication_required',
            message: 'Authentication is required',
          },
        },
        401,
      )
      return
    }
    json(response, { data: dashboard })
    return
  }
  const isAdminPostOrTaxonomyPath =
    path.startsWith('/admin/chatter') ||
    path.startsWith('/admin/friends') ||
    path.startsWith('/admin/media') ||
    path.startsWith('/admin/moments') ||
    path.startsWith('/admin/music-tracks') ||
    path.startsWith('/admin/posts') ||
    path.startsWith('/admin/projects') ||
    path.startsWith('/admin/categories') ||
    path.startsWith('/admin/settings') ||
    path.startsWith('/admin/tags')
  if (isAdminPostOrTaxonomyPath && cookies.access_token !== 'mock-access') {
    json(
      response,
      {
        error: {
          code: 'authentication_required',
          message: 'Authentication is required',
        },
      },
      401,
    )
    return
  }
  if (path === '/admin/media/policy' && request.method === 'GET') {
    json(response, { data: mediaPolicy })
    return
  }
  const mediaReferencesMatch = path.match(/^\/admin\/media\/(\d+)\/references$/)
  if (mediaReferencesMatch && request.method === 'GET') {
    const asset = mediaAssets.find(
      (item) => item.id === Number(mediaReferencesMatch[1]),
    )
    if (!asset) {
      json(
        response,
        {
          error: {
            code: 'media_asset_not_found',
            message: 'The requested Media Asset does not exist',
          },
        },
        404,
      )
      return
    }
    json(response, { data: mediaReferencesForAsset(asset) })
    return
  }
  if (path === '/admin/media' && request.method === 'GET') {
    const filtered = mediaAssets
      .filter((asset) => !query.kind || asset.kind === query.kind)
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) || right.id - left.id,
      )
    json(response, paginate(filtered.map(mediaAssetResponse), query.page, size))
    return
  }
  if (path === '/admin/media' && request.method === 'POST') {
    const raw = await readBuffer(request)
    const part = parseMultipart(raw, request.headers['content-type'])
    if (!part || part.content.length === 0) {
      json(
        response,
        {
          error: {
            code: 'media_empty',
            message: 'The Media Asset must not be empty',
          },
        },
        422,
      )
      return
    }
    const acceptedTypes = [
      ...mediaPolicy.accepted_image_types,
      ...mediaPolicy.accepted_audio_types,
    ]
    if (!acceptedTypes.includes(part.contentType)) {
      json(
        response,
        {
          error: {
            code: 'media_type_unsupported',
            message:
              'Only supported image and audio Media Assets may be uploaded',
          },
        },
        422,
      )
      return
    }
    const isImage = mediaPolicy.accepted_image_types.includes(part.contentType)
    if (part.content.length > mediaPolicy.max_upload_bytes) {
      json(
        response,
        {
          error: {
            code: 'media_too_large',
            message: 'The Media Asset exceeds the upload size limit',
          },
        },
        413,
      )
      return
    }
    if (isImage && part.content.length > mediaPolicy.image_max_upload_bytes) {
      json(
        response,
        {
          error: {
            code: 'image_too_large',
            message: 'The image exceeds the image size limit',
          },
        },
        413,
      )
      return
    }
    const actual = isImage
      ? sniffImageType(part.content)
      : sniffAudioType(part.content)
    if (!actual) {
      json(
        response,
        {
          error: {
            code: isImage ? 'media_content_invalid' : 'media_content_mismatch',
            message: isImage
              ? 'The uploaded image is not valid'
              : 'The uploaded bytes do not match the declared audio type',
          },
        },
        422,
      )
      return
    }
    if (actual !== part.contentType) {
      json(
        response,
        {
          error: {
            code: 'media_content_mismatch',
            message: 'The uploaded bytes do not match the declared image type',
          },
        },
        422,
      )
      return
    }
    const created = {
      id: Math.max(0, ...mediaAssets.map((asset) => asset.id)) + 1,
      filename: part.filename.replace(/\\/g, '/').split('/').pop() || 'upload',
      kind: isImage ? 'image' : 'audio',
      type: part.contentType,
      size: part.content.length,
      width: isImage ? 640 : null,
      height: isImage ? 451 : null,
      key: mediaKeyFor(isImage ? 'image' : 'audio', part.contentType),
      createdAt: new Date().toISOString(),
    }
    mediaAssets.push(created)
    json(response, { data: mediaAssetResponse(created) }, 201)
    return
  }
  const mediaDeleteMatch = path.match(/^\/admin\/media\/(\d+)$/)
  if (mediaDeleteMatch && request.method === 'DELETE') {
    const asset = mediaAssets.find(
      (item) => item.id === Number(mediaDeleteMatch[1]),
    )
    if (!asset) {
      json(
        response,
        {
          error: {
            code: 'media_asset_not_found',
            message: 'The requested Media Asset does not exist',
          },
        },
        404,
      )
      return
    }
    const purge = query.purge_metadata === 'true'
    if (mediaReferencesForAsset(asset).length) {
      json(
        response,
        {
          error: {
            code: 'media_asset_referenced',
            message: 'The Media Asset is still referenced by site content',
            details: mediaReferencesForAsset(asset),
          },
        },
        409,
      )
      return
    }
    if (asset.missingBytes && !purge) {
      json(
        response,
        {
          error: {
            code: 'media_bytes_missing',
            message:
              'The Media Asset bytes are missing; retry with purge_metadata=true',
            details: {
              asset_id: asset.id,
              key: asset.key,
              metadata_preserved: true,
              recovery: 'purge_metadata',
            },
          },
        },
        409,
      )
      return
    }
    if (asset.staleMetadata && !purge) {
      json(
        response,
        {
          error: {
            code: 'media_metadata_delete_failed',
            message:
              'The Media Asset bytes were removed but metadata cleanup failed; retry with purge_metadata=true',
            details: {
              asset_id: asset.id,
              key: asset.key,
              metadata_preserved: true,
              recovery: 'purge_metadata',
            },
          },
        },
        503,
      )
      return
    }
    mediaAssets.splice(mediaAssets.indexOf(asset), 1)
    json(response, {
      data: purge ? { deleted: true, bytes_missing: true } : { deleted: true },
    })
    return
  }
  const noteMatch = path.match(
    /^\/admin\/(moments|chatter)(?:\/(\d+)(?:\/(publish|unpublish))?)?$/,
  )
  if (noteMatch) {
    const [, resource, id, action] = noteMatch
    const collection = resource === 'moments' ? adminMoments : adminChatters
    if (!id && request.method === 'GET') {
      const filtered = collection.filter(
        (item) =>
          (!query.status || item.status === query.status) &&
          (!query.q ||
            [
              item.title,
              item.lead,
              item.body,
              ...(item.tags ?? []).map((tag) => tag.name),
            ]
              .join(' ')
              .includes(query.q)),
      )
      json(
        response,
        paginate(
          [...filtered].sort(
            (a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id,
          ),
          query.page,
          size,
        ),
      )
      return
    }
    let item = collection.find((item) => item.id === Number(id))
    if (!id && request.method === 'POST') {
      const payload = await readJson(request)
      item = {
        ...payload,
        images: payload.images ?? [],
        id: Math.max(0, ...collection.map((item) => item.id)) + 1,
        status: 'draft',
        published_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: Object.values(tags).filter((tag) =>
          payload.tag_ids?.includes(tag.id),
        ),
      }
      collection.push(item)
      json(response, { data: item }, 201)
      return
    }
    if (!item) {
      json(
        response,
        {
          error: {
            code: `${resource === 'moments' ? 'moment' : 'chatter'}_not_found`,
            message: 'Not found',
          },
        },
        404,
      )
      return
    }
    if (request.method === 'DELETE') {
      collection.splice(collection.indexOf(item), 1)
      json(response, { data: { deleted: true } })
      return
    }
    if (request.method === 'PATCH') {
      const payload = await readJson(request)
      Object.assign(item, payload, {
        tags: Object.values(tags).filter((tag) =>
          payload.tag_ids?.includes(tag.id),
        ),
        updated_at: new Date().toISOString(),
      })
    }
    if (action) {
      item.status = action === 'publish' ? 'published' : 'draft'
      if (action === 'publish' && !item.published_at)
        item.published_at = new Date().toISOString()
    }
    json(response, { data: item })
    return
  }
  if (path === '/admin/music-tracks/reorder' && request.method === 'POST') {
    const payload = await readJson(request)
    const requestedIds = Array.isArray(payload.track_ids)
      ? payload.track_ids.map(Number)
      : []
    const existingIds = orderedMusicTracks().map((track) => track.id)
    const isComplete =
      requestedIds.length === existingIds.length &&
      new Set(requestedIds).size === requestedIds.length &&
      existingIds.every((id) => requestedIds.includes(id))
    if (!isComplete) {
      json(
        response,
        {
          error: {
            code: 'music_track_reorder_mismatch',
            message:
              'Reorder must include every configured Music Track exactly once',
          },
        },
        422,
      )
      return
    }
    requestedIds.forEach((id, index) => {
      const track = tracks.find((candidate) => candidate.id === id)
      track.display_order = index
      track.updated_at = new Date().toISOString()
    })
    json(response, { data: orderedMusicTracks().map(withAdminDates) })
    return
  }
  if (path === '/admin/music-tracks/preview' && request.method === 'POST') {
    const payload = await readJson(request)
    const songId = String(payload.netease_song_id ?? '')
    if (!/^[1-9][0-9]{0,18}$/.test(songId)) {
      json(
        response,
        { error: { code: 'validation_error', message: 'Invalid song ID' } },
        422,
      )
      return
    }
    const existing = tracks.find((track) => track.netease_song_id === songId)
    json(response, {
      data: {
        album: existing?.album ?? '示例专辑',
        already_added: Boolean(existing),
        artist: existing?.artist ?? '示例歌手',
        artwork_url: existing?.artwork_url ?? null,
        duration_seconds: existing?.duration_seconds ?? 180,
        netease_song_id: songId,
        provider_url: `https://music.163.com/song?id=${songId}`,
        title: existing?.title ?? `歌曲 ${songId}`,
      },
    })
    return
  }
  const adminMusicMatch = path.match(
    /^\/admin\/music-tracks(?:\/(\d+)(?:\/(enable|disable))?)?$/,
  )
  if (adminMusicMatch) {
    const [, id, action] = adminMusicMatch
    if (!id && request.method === 'GET') {
      json(
        response,
        paginate(orderedMusicTracks().map(withAdminDates), query.page, size),
      )
      return
    }
    if (!id && request.method === 'POST') {
      const payload = await readJson(request)
      const songId = String(payload.netease_song_id ?? '')
      if (!/^[1-9][0-9]{0,18}$/.test(songId)) {
        json(
          response,
          { error: { code: 'validation_error', message: 'Invalid song ID' } },
          422,
        )
        return
      }
      if (tracks.some((track) => track.netease_song_id === songId)) {
        json(
          response,
          {
            error: { code: 'music_track_duplicate', message: 'Already added' },
          },
          409,
        )
        return
      }
      const created = {
        id: Math.max(0, ...tracks.map((track) => track.id)) + 1,
        netease_song_id: songId,
        provider_url: `https://music.163.com/song?id=${songId}`,
        title: `歌曲 ${songId}`,
        artist: '示例歌手',
        album: '示例专辑',
        artwork_url: null,
        artwork_alt: null,
        duration_seconds: 180,
        display_order: payload.display_order ?? 0,
        is_enabled: payload.is_enabled ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      tracks.push(created)
      json(response, { data: withAdminDates(created) }, 201)
      return
    }
    const track = tracks.find((candidate) => candidate.id === Number(id))
    if (!track) {
      json(
        response,
        {
          error: {
            code: 'music_track_not_found',
            message: 'The requested Music Track does not exist',
          },
        },
        404,
      )
      return
    }
    if (action && request.method === 'POST') {
      track.is_enabled = action === 'enable'
      track.updated_at = new Date().toISOString()
      json(response, { data: withAdminDates(track) })
      return
    }
    if (!action && request.method === 'GET') {
      json(response, { data: withAdminDates(track) })
      return
    }
    if (!action && request.method === 'PATCH') {
      const payload = await readJson(request)
      for (const key of ['display_order', 'is_enabled']) {
        if (Object.hasOwn(payload, key)) track[key] = payload[key]
      }
      track.updated_at = new Date().toISOString()
      json(response, { data: withAdminDates(track) })
      return
    }
    if (!action && request.method === 'DELETE') {
      tracks.splice(tracks.indexOf(track), 1)
      json(response, { data: { deleted: true } })
      return
    }
  }
  const adminPortfolioMatch = path.match(
    /^\/admin\/(projects|friends)(?:\/(\d+))?$/,
  )
  if (adminPortfolioMatch) {
    const [, resource, id] = adminPortfolioMatch
    const collection = resource === 'projects' ? projects : friends
    const isProject = resource === 'projects'
    if (!id && request.method === 'GET') {
      const search = (query.q || '').toLocaleLowerCase()
      const filtered = collection.filter((item) => {
        const searchable = [
          item.name,
          item.description,
          item.url,
          item.source_url,
          item.demo_url,
          item.repository_url,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
        return (
          (!search || searchable.includes(search)) &&
          (isProject
            ? (!query.status || item.status === query.status) &&
              (!query.project_type || item.project_type === query.project_type)
            : query.active === undefined ||
              item.is_active === (query.active === 'true'))
        )
      })
      const ordered = [...filtered].sort((left, right) =>
        isProject
          ? Number(right.featured) - Number(left.featured) ||
            left.display_order - right.display_order ||
            right.id - left.id
          : left.display_order - right.display_order || right.id - left.id,
      )
      json(response, paginate(ordered.map(withAdminDates), query.page, size))
      return
    }
    if (!id && request.method === 'POST') {
      const payload = await readJson(request)
      const created = {
        ...payload,
        ...(isProject
          ? payload.project_type === 'github_open_source'
            ? {
                project_type: 'github_open_source',
                repository_url: payload.repository_url,
                logo_url: payload.logo_url ?? null,
                logo_alt: payload.logo_alt ?? null,
              }
            : {
                project_type: 'personal',
                technology: payload.technology || [],
                logo_url: payload.logo_url ?? null,
                logo_alt: payload.logo_alt ?? null,
                source_url: payload.source_url ?? null,
                demo_url: payload.demo_url ?? null,
              }
          : {
              avatar_url: payload.avatar_url ?? null,
              avatar_alt: payload.avatar_alt ?? null,
            }),
        id: Math.max(0, ...collection.map((item) => item.id)) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      collection.push(created)
      json(response, { data: withAdminDates(created) }, 201)
      return
    }
    const item = collection.find((candidate) => candidate.id === Number(id))
    if (!item) {
      json(
        response,
        {
          error: {
            code: `${isProject ? 'project' : 'friend_link'}_not_found`,
            message: 'The requested resource does not exist',
          },
        },
        404,
      )
      return
    }
    if (request.method === 'GET') {
      json(response, { data: withAdminDates(item) })
      return
    }
    if (request.method === 'PATCH') {
      const payload = await readJson(request)
      if (isProject) {
        const projectType = payload.project_type ?? item.project_type
        if (projectType === 'github_open_source') {
          for (const key of [
            'technology',
            'time_span',
            'source_url',
            'demo_url',
            'status',
          ]) {
            delete item[key]
          }
          Object.assign(item, payload, {
            project_type: 'github_open_source',
            updated_at: new Date().toISOString(),
          })
        } else {
          delete item.repository_url
          Object.assign(item, payload, {
            project_type: 'personal',
            updated_at: new Date().toISOString(),
          })
        }
      } else {
        Object.assign(item, payload, { updated_at: new Date().toISOString() })
      }
      json(response, { data: withAdminDates(item) })
      return
    }
    if (request.method === 'DELETE') {
      collection.splice(collection.indexOf(item), 1)
      json(response, { data: { deleted: true } })
      return
    }
  }
  if (path === '/admin/settings') {
    if (request.method === 'GET') {
      json(response, { data: adminSettings() })
      return
    }
    if (request.method === 'PATCH') {
      const payload = await readJson(request)
      if (payload.about && Object.hasOwn(payload.about, 'banner_url')) {
        const reference = payload.about.banner_url
        const focalPoint = payload.about.banner_focal_point
        const malformedFocalPoint =
          focalPoint &&
          (!Number.isInteger(focalPoint.x) ||
            !Number.isInteger(focalPoint.y) ||
            focalPoint.x < 0 ||
            focalPoint.x > 100 ||
            focalPoint.y < 0 ||
            focalPoint.y > 100)
        const invalidReference =
          reference !== null &&
          (typeof reference !== 'string' ||
            !reference.startsWith('/uploads/images/') ||
            !mediaAssets.some(
              (asset) =>
                `/uploads/${asset.key}` === reference && asset.kind === 'image',
            ))
        if (invalidReference || malformedFocalPoint) {
          json(
            response,
            {
              error: {
                code: 'about_banner_media_asset_invalid',
                message:
                  'About banners must reference an existing image Media Asset',
              },
            },
            422,
          )
          return
        }
      }
      if (Object.hasOwn(payload, 'background_gallery')) {
        const gallery = payload.background_gallery
        const references = Array.isArray(gallery)
          ? gallery.map((item) => String(item?.url ?? '').trim())
          : []
        const invalid =
          !Array.isArray(gallery) ||
          gallery.length > 12 ||
          gallery.some((item) => {
            if (
              !item ||
              typeof item.alt !== 'string' ||
              !item.alt.trim() ||
              item.alt.trim().length > 200 ||
              typeof item.url !== 'string'
            ) {
              return true
            }
            const url = item.url.trim()
            if (url.startsWith('/uploads/')) {
              const key = url.slice('/uploads/'.length)
              return !mediaAssets.some(
                (asset) => asset.key === key && asset.kind === 'image',
              )
            }
            try {
              const parsed = new URL(url)
              return (
                parsed.protocol !== 'https:' ||
                !parsed.hostname ||
                Boolean(parsed.username || parsed.password)
              )
            } catch {
              return true
            }
          }) ||
          new Set(references.map((reference) => reference.toLowerCase()))
            .size !== references.length
        if (invalid) {
          json(
            response,
            {
              error: {
                code: 'validation_error',
                message:
                  'Background Gallery entries must be unique safe HTTPS URLs or existing image Media Assets, with alternative text (up to 12 images).',
              },
            },
            422,
          )
          return
        }
      }
      for (const [key, value] of Object.entries(payload)) {
        if (
          ['about', 'footer', 'contact', 'homepage_visibility'].includes(key)
        ) {
          settings[key] = { ...settings[key], ...value }
        } else {
          settings[key] = value
        }
      }
      settingsMeta.updated_at = new Date().toISOString()
      json(response, { data: adminSettings() })
      return
    }
  }
  if (path === '/admin/posts' && request.method === 'GET') {
    const filtered = posts.filter((post) => {
      const searchable = [
        post.title,
        post.summary,
        post.body,
        ...post.tags.map((item) => item.name),
      ]
        .join(' ')
        .toLocaleLowerCase()
      return (
        (!query.status || post.status === query.status) &&
        (!query.tag || post.tags.some((item) => item.slug === query.tag)) &&
        (!query.q || searchable.includes(query.q.toLocaleLowerCase()))
      )
    })
    json(response, {
      ...paginate(filtered.map(adminPost), query.page, size),
    })
    return
  }
  const adminPostMatch = path.match(
    /^\/admin\/posts\/(\d+)(?:\/(preview|publish|unpublish))?$/,
  )
  if (path === '/admin/posts' && request.method === 'POST') {
    const payload = await readJson(request)
    if (posts.some((post) => post.slug === payload.slug)) {
      json(
        response,
        {
          error: {
            code: 'post_slug_conflict',
            message: 'The Post slug is already in use',
          },
        },
        409,
      )
      return
    }
    const id = Math.max(0, ...posts.map((post) => post.id)) + 1
    const category = payload.category_id
      ? (Object.values(taxonomy).find(
          (item) => item.id === Number(payload.category_id),
        ) ?? null)
      : null
    const created = withPostPayload(
      {
        id,
        title: payload.title,
        slug: payload.slug,
        summary: payload.summary ?? '',
        status: 'draft',
        is_pinned: Boolean(payload.is_pinned),
        reading_count: 0,
        reading_time_minutes: estimateReadingTimeMinutes(payload.body ?? ''),
        cover_url: payload.cover_url ?? null,
        cover_alt: payload.cover_alt ?? null,
        published_at: null,
        created_at: '2026-09-21T08:00:00.000Z',
        updated_at: '2026-09-21T08:00:00.000Z',
        category,
        tags: [],
        body: payload.body ?? '',
      },
      payload,
    )
    posts.unshift(created)
    json(response, { data: adminPost(created) }, 201)
    return
  }
  if (adminPostMatch) {
    const post = posts.find(
      (candidate) => candidate.id === Number(adminPostMatch[1]),
    )
    if (!post) {
      json(
        response,
        {
          error: {
            code: 'post_not_found',
            message: 'The requested Post does not exist',
          },
        },
        404,
      )
      return
    }
    const action = adminPostMatch[2]
    if (action === 'preview' && request.method === 'POST') {
      const payload = await readJson(request)
      json(response, { data: adminPost(withPostPayload(post, payload)) })
      return
    }
    if (action === 'publish' && request.method === 'POST') {
      if (post.status === 'published') {
        json(
          response,
          {
            error: {
              code: 'post_already_published',
              message: 'The Post is already published',
            },
          },
          409,
        )
        return
      }
      if (!post.body?.trim()) {
        json(
          response,
          {
            error: {
              code: 'post_body_required',
              message: 'A Post needs Markdown content before publishing',
            },
          },
          422,
        )
        return
      }
      post.status = 'published'
      post.published_at = '2026-09-21T09:00:00.000Z'
      json(response, { data: adminPost(post) })
      return
    }
    if (action === 'unpublish' && request.method === 'POST') {
      if (post.status === 'draft') {
        json(
          response,
          {
            error: {
              code: 'post_not_published',
              message: 'The Post is not published',
            },
          },
          409,
        )
        return
      }
      post.status = 'draft'
      post.published_at = null
      json(response, { data: adminPost(post) })
      return
    }
    if (!action && request.method === 'GET') {
      json(response, { data: adminPost(post) })
      return
    }
    if (!action && request.method === 'PATCH') {
      const payload = await readJson(request)
      if (
        payload.slug &&
        posts.some(
          (candidate) =>
            candidate.id !== post.id && candidate.slug === payload.slug,
        )
      ) {
        json(
          response,
          {
            error: {
              code: 'post_slug_conflict',
              message: 'The Post slug is already in use',
            },
          },
          409,
        )
        return
      }
      Object.assign(post, withPostPayload(post, payload))
      json(response, { data: adminPost(post) })
      return
    }
    if (!action && request.method === 'DELETE') {
      posts.splice(posts.indexOf(post), 1)
      json(response, { data: { deleted: true } })
      return
    }
  }
  const taxonomyMatch = path.match(/^\/admin\/(categories|tags)(?:\/(\d+))?$/)
  if (taxonomyMatch) {
    const kind = taxonomyMatch[1] === 'categories' ? 'category' : 'tag'
    const items = taxonomyItems(kind)
    if (!taxonomyMatch[2] && request.method === 'GET') {
      json(response, { data: Object.values(items) })
      return
    }
    if (!taxonomyMatch[2] && request.method === 'POST') {
      const payload = await readJson(request)
      if (
        Object.values(items).some(
          (item) => item.slug === payload.slug || item.name === payload.name,
        )
      ) {
        json(
          response,
          {
            error: {
              code: `${kind}_conflict`,
              message: 'The taxonomy name or slug is already in use',
            },
          },
          409,
        )
        return
      }
      const next = {
        id: Math.max(0, ...Object.values(items).map((item) => item.id)) + 1,
        name: payload.name,
        slug: payload.slug,
        post_count: 0,
      }
      items[next.slug] = next
      json(response, { data: next }, 201)
      return
    }
    const item = findTaxonomy(kind, taxonomyMatch[2])
    if (!item) {
      json(
        response,
        {
          error: {
            code: `${kind}_not_found`,
            message: 'The requested taxonomy does not exist',
          },
        },
        404,
      )
      return
    }
    if (request.method === 'PATCH') {
      const payload = await readJson(request)
      if (
        Object.values(items).some(
          (candidate) =>
            candidate.id !== item.id &&
            (candidate.slug === payload.slug ||
              candidate.name === payload.name),
        )
      ) {
        json(
          response,
          {
            error: {
              code: `${kind}_conflict`,
              message: 'The taxonomy name or slug is already in use',
            },
          },
          409,
        )
        return
      }
      const next = { ...item, ...payload }
      replaceTaxonomy(kind, item, next)
      json(response, { data: next })
      return
    }
    if (request.method === 'DELETE') {
      const used = posts.some((post) =>
        kind === 'category'
          ? post.category?.id === item.id
          : post.tags.some((tag) => tag.id === item.id),
      )
      if (kind === 'category' && used) {
        json(
          response,
          {
            error: {
              code: `${kind}_in_use`,
              message: 'The taxonomy is still assigned to content',
            },
          },
          409,
        )
        return
      }
      if (kind === 'tag') {
        for (const post of posts) {
          post.tags = post.tags.filter((tag) => tag.id !== item.id)
        }
      }
      delete items[item.slug]
      json(response, { data: { deleted: true } })
      return
    }
  }
  if (path === '/settings') {
    json(response, { data: settings })
    return
  }
  if (path === '/music-tracks') {
    const playable = orderedMusicTracks()
      .filter((track) => track.is_enabled !== false)
      .map(publicMusicTrack)
    json(response, { ...paginate(playable, query.page, size) })
    return
  }
  const playbackMatch = path.match(/^\/music-tracks\/(\d+)\/(playback|lyrics)$/)
  if (playbackMatch) {
    const track = tracks.find(
      (candidate) =>
        candidate.id === Number(playbackMatch[1]) && candidate.is_enabled,
    )
    if (!track) {
      json(
        response,
        { error: { code: 'music_track_not_found', message: 'Not found' } },
        404,
      )
      return
    }
    if (playbackMatch[2] === 'playback') {
      json(response, {
        data: {
          track_id: track.id,
          netease_song_id: track.netease_song_id,
          provider_url: track.provider_url,
          media_url: `https://music.163.com/song/media/outer/url?id=${track.netease_song_id}.mp3`,
        },
      })
      return
    }
    json(response, {
      data: {
        track_id: track.id,
        status: 'available',
        lines: [{ time_ms: 0, text: '示例歌词', translation: null }],
      },
    })
    return
  }
  if (path === '/projects') {
    const filteredProjects = projects.filter(
      (project) =>
        !query.project_type || project.project_type === query.project_type,
    )
    json(response, {
      ...paginate(filteredProjects.map(publicPortfolioItem), query.page, size),
    })
    return
  }
  if (path === '/friends') {
    json(response, {
      ...paginate(friends.map(publicPortfolioItem), query.page, size),
    })
    return
  }
  if (path === '/moments/tags') {
    json(response, { ...paginate(publicTags(moments), query.page, size) })
    return
  }
  if (path === '/moments') {
    json(response, {
      ...paginate(
        [
          ...filteredPosts({ q: query.q }).map((content) => ({
            kind: 'post',
            content: publicPost(content),
          })),
          ...publicChatter({ q: query.q }).map((content) => ({
            kind: 'chatter',
            content,
          })),
        ].sort(
          (a, b) =>
            b.content.published_at.localeCompare(a.content.published_at) ||
            a.kind.localeCompare(b.kind) ||
            b.content.id - a.content.id,
        ),
        query.page,
        size,
      ),
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
      ...paginate(publicChatter(query), query.page, size),
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
