import type {
  PostCategory,
  PostCollectionResponse,
  PostDetail,
  PostDiscoveryProvider,
  PostQuery,
  PostSummary,
  PostTag,
  TaxonomyCollectionResponse,
} from '~/types/posts'
import { POST_MAX_PAGE_SIZE, POST_PAGE_SIZE } from '../utils/post-discovery'

interface PostFixtureRecord extends Omit<PostSummary, 'category' | 'tags'> {
  body: string
  category: Omit<PostCategory, 'postCount'>
  tags: Array<Omit<PostTag, 'postCount'>>
}

const cover = (alt: string, src = '/images/background/ambient-640.avif') => ({
  alt,
  height: 451,
  src,
  width: 640,
})

const records: PostFixtureRecord[] = [
  {
    body: '从设计 token 到页面层级，记录如何让一个界面保持安静而清晰。',
    category: { name: '设计札记', slug: 'design-notes' },
    cover: cover('深蓝色夜空与柔和光晕'),
    id: 'post-spatial-notes',
    pinned: true,
    publishedAt: '2026-09-14T08:00:00.000Z',
    readingCount: 128,
    readingTimeMinutes: 8,
    slug: 'spatial-notes',
    summary: '把复杂的交互留在组件里，让页面只负责讲清楚一件事。',
    tags: [
      { name: 'Design System', slug: 'design-system' },
      { name: 'Nuxt', slug: 'nuxt' },
    ],
    title: '把复杂的东西，留在安静的地方',
    updatedAt: '2026-09-16T08:00:00.000Z',
  },
  {
    body: [
      '## 一种更长寿的写作格式',
      '',
      'Markdown 让文章脱离某一个编辑器仍然可以迁移、审阅和长期保存。',
      '',
      '> 好的格式应该让内容走得更远，而不是把内容锁在工具里。',
      '',
      '| 能力 | 结果 |',
      '| --- | --- |',
      '| 可读 | 可以直接审阅源文件 |',
      '| 可迁移 | 不依赖单一编辑器 |',
      '',
      '```ts',
      'const format = "portable"',
      '```',
      '',
      '行内数学 $E=mc^2$ 可以和普通段落自然共存。',
      '',
      '$$',
      '\\sum_{i=1}^n i = \\frac{n(n+1)}{2}',
      '$$',
      '',
      '![一张可能已经被移除的示例图片](/media/missing-markdown-image.webp)',
    ].join('\n'),
    category: { name: '工程实践', slug: 'engineering' },
    id: 'post-markdown-first',
    pinned: false,
    publishedAt: '2026-09-06T08:00:00.000Z',
    readingCount: 96,
    readingTimeMinutes: 6,
    slug: 'markdown-first',
    summary: '可迁移的内容格式，给长期写作留出比编辑器更长的寿命。',
    tags: [
      { name: 'Markdown', slug: 'markdown' },
      { name: 'Architecture', slug: 'architecture' },
    ],
    title: 'Markdown 是一条可迁移的路',
  },
  {
    body: '关于持续、耐心和把小事做好的私人笔记，也关于生活如何留下节奏。',
    category: { name: '生活记录', slug: 'life' },
    id: 'post-slow-growth',
    pinned: false,
    publishedAt: '2026-08-28T08:00:00.000Z',
    readingCount: 74,
    readingTimeMinutes: 4,
    slug: 'slow-growth',
    summary: '一些关于持续、耐心和把小事做好的私人笔记。',
    tags: [
      { name: 'Life', slug: 'life' },
      { name: 'Notes', slug: 'notes' },
    ],
    title: '缓慢生长，也是一种进度',
  },
  {
    body: '用 Nuxt 的 SSR 把第一屏真正需要的内容交给搜索引擎和读者。',
    category: { name: '工程实践', slug: 'engineering' },
    id: 'post-ssr-first-paint',
    pinned: false,
    publishedAt: '2026-08-21T08:00:00.000Z',
    readingCount: 83,
    readingTimeMinutes: 7,
    slug: 'ssr-first-paint',
    summary: '首屏不是等待数据出现，而是让内容从一开始就在那里。',
    tags: [
      { name: 'Nuxt', slug: 'nuxt' },
      { name: 'SSR', slug: 'ssr' },
    ],
    title: '让首屏从一开始就有内容',
  },
  {
    body: '用清晰的状态边界处理 loading、empty、error，让恢复动作自然可见。',
    category: { name: '设计札记', slug: 'design-notes' },
    id: 'post-states-as-content',
    pinned: false,
    publishedAt: '2026-08-13T08:00:00.000Z',
    readingCount: 61,
    readingTimeMinutes: 5,
    slug: 'states-as-content',
    summary: '加载、空白和错误也属于体验的一部分，不应该被藏起来。',
    tags: [
      { name: 'Accessibility', slug: 'accessibility' },
      { name: 'Design System', slug: 'design-system' },
    ],
    title: '状态本身也是内容',
  },
  {
    body: '一套轻量的 TypeScript contract 帮助页面和未来 API 保持同一种语言。',
    category: { name: '工程实践', slug: 'engineering' },
    id: 'post-small-contracts',
    pinned: false,
    publishedAt: '2026-08-04T08:00:00.000Z',
    readingCount: 57,
    readingTimeMinutes: 6,
    slug: 'small-contracts',
    summary: '先把边界说清楚，再让实现自由地生长。',
    tags: [
      { name: 'TypeScript', slug: 'typescript' },
      { name: 'API', slug: 'api' },
    ],
    title: '先把边界说清楚',
  },
  {
    body: '深色背景不等于低对比度，真正的空间感需要让文字有可靠的落点。',
    category: { name: '设计札记', slug: 'design-notes' },
    id: 'post-contrast-in-space',
    pinned: false,
    publishedAt: '2026-07-26T08:00:00.000Z',
    readingCount: 49,
    readingTimeMinutes: 5,
    slug: 'contrast-in-space',
    summary: '在深色空间里保持阅读对比度，视觉才有余地变得柔和。',
    tags: [
      { name: 'Accessibility', slug: 'accessibility' },
      { name: 'CSS', slug: 'css' },
    ],
    title: '空间感不应该牺牲对比度',
  },
  {
    body: '把周末留给没有安排的时间，回头看时才发现它也在慢慢整理生活。',
    category: { name: '生活记录', slug: 'life' },
    id: 'post-a-little-blank',
    pinned: false,
    publishedAt: '2026-07-15T08:00:00.000Z',
    readingCount: 42,
    readingTimeMinutes: 3,
    slug: 'a-little-blank',
    summary: '留一点没有安排的空白，生活会自己找到呼吸的节奏。',
    tags: [
      { name: 'Life', slug: 'life' },
      { name: 'Reflection', slug: 'reflection' },
    ],
    title: '给生活留一点空白',
  },
]

const categoryCounts = new Map<string, number>()
const tagCounts = new Map<string, number>()

for (const record of records) {
  categoryCounts.set(
    record.category.slug,
    (categoryCounts.get(record.category.slug) ?? 0) + 1,
  )
  for (const tag of record.tags) {
    tagCounts.set(tag.slug, (tagCounts.get(tag.slug) ?? 0) + 1)
  }
}

const toSummary = (record: PostFixtureRecord): PostSummary => ({
  category: {
    ...record.category,
    postCount: categoryCounts.get(record.category.slug) ?? 0,
  },
  ...(record.cover ? { cover: record.cover } : {}),
  id: record.id,
  pinned: record.pinned,
  publishedAt: record.publishedAt,
  readingCount: record.readingCount,
  readingTimeMinutes: record.readingTimeMinutes,
  slug: record.slug,
  summary: record.summary,
  tags: record.tags.map((tag) => ({
    ...tag,
    postCount: tagCounts.get(tag.slug) ?? 0,
  })),
  title: record.title,
  ...(record.updatedAt ? { updatedAt: record.updatedAt } : {}),
})

const sortedRecords = [...records].sort((left, right) => {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1
  }

  return right.publishedAt.localeCompare(left.publishedAt)
})

const matchesQuery = (record: PostFixtureRecord, query: PostQuery) => {
  if (query.category && record.category.slug !== query.category) {
    return false
  }
  if (query.tag && !record.tags.some((tag) => tag.slug === query.tag)) {
    return false
  }
  if (query.q) {
    const searchableText = [
      record.body,
      record.category.name,
      record.summary,
      record.tags.map((tag) => tag.name).join(' '),
      record.title,
    ]
      .join(' ')
      .toLocaleLowerCase()

    if (!searchableText.includes(query.q.toLocaleLowerCase())) {
      return false
    }
  }

  return true
}

const taxonomyPagination = (total: number) => ({
  page: 1,
  pageSize: Math.min(Math.max(total, 1), POST_MAX_PAGE_SIZE),
  total,
  totalPages: total > 0 ? 1 : 0,
})

export const postFixtureRecords = records

export const postFixtureProvider = {
  getPostBySlug: async (slug: string): Promise<PostDetail | null> => {
    const record = records.find((candidate) => candidate.slug === slug)
    return record ? { ...toSummary(record), body: record.body } : null
  },

  listCategories: async (): Promise<
    TaxonomyCollectionResponse<PostCategory>
  > => {
    const data = [...categoryCounts.entries()]
      .map(([slug, postCount]) => {
        const category = records.find(
          (record) => record.category.slug === slug,
        )?.category
        return category ? { ...category, postCount } : undefined
      })
      .filter((category): category is PostCategory => Boolean(category))
      .sort((left, right) => left.name.localeCompare(right.name, 'zh'))

    return { data, pagination: taxonomyPagination(data.length) }
  },

  listPosts: async (query: PostQuery): Promise<PostCollectionResponse> => {
    const filtered = sortedRecords.filter((record) =>
      matchesQuery(record, query),
    )
    const page = Number.isSafeInteger(query.page) ? Math.max(query.page, 1) : 1
    const pageSize = Number.isSafeInteger(query.pageSize)
      ? Math.min(Math.max(query.pageSize, 1), POST_MAX_PAGE_SIZE)
      : POST_PAGE_SIZE
    const totalPages = Math.ceil(filtered.length / pageSize)
    const start = (page - 1) * pageSize

    return {
      data: filtered.slice(start, start + pageSize).map(toSummary),
      filters: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.q ? { q: query.q } : {}),
        ...(query.tag ? { tag: query.tag } : {}),
      },
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages,
      },
    }
  },

  listTags: async (): Promise<TaxonomyCollectionResponse<PostTag>> => {
    const data = [...tagCounts.entries()]
      .map(([slug, postCount]) => {
        const tag = records
          .flatMap((record) => record.tags)
          .find((candidate) => candidate.slug === slug)
        return tag ? { ...tag, postCount } : undefined
      })
      .filter((tag): tag is PostTag => Boolean(tag))
      .sort((left, right) => left.name.localeCompare(right.name))

    return { data, pagination: taxonomyPagination(data.length) }
  },
} satisfies PostDiscoveryProvider
