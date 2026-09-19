import type {
  HomepageChatter,
  HomepageCollectionResponse,
  HomepageFixtureContent,
  HomepageMoment,
  HomepagePost,
  HomepageProject,
} from '~/types/homepage'

const collection = <T>(data: T[]): HomepageCollectionResponse<T> => ({
  data,
  pagination: {
    page: 1,
    pageSize: data.length,
    total: data.length,
    totalPages: data.length > 0 ? 1 : 0,
  },
})

const posts: HomepagePost[] = [
  {
    category: { name: '设计札记', slug: 'design-notes' },
    cover: {
      alt: '深蓝色夜空与柔和光晕',
      height: 451,
      src: '/images/background/ambient-640.avif',
      width: 640,
    },
    id: 'post-spatial-notes',
    publishedAt: '2026-09-14T08:00:00.000Z',
    readingTimeMinutes: 8,
    slug: 'spatial-notes',
    summary: '把复杂的交互留在组件里，让页面只负责讲清楚一件事。',
    tags: ['Design System', 'Nuxt'],
    title: '把复杂的东西，留在安静的地方',
  },
  {
    category: { name: '工程实践', slug: 'engineering' },
    id: 'post-markdown-first',
    publishedAt: '2026-09-06T08:00:00.000Z',
    readingTimeMinutes: 6,
    slug: 'markdown-first',
    summary: '可迁移的内容格式，给长期写作留出比编辑器更长的寿命。',
    tags: ['Markdown', 'Architecture'],
    title: 'Markdown 是一条可迁移的路',
  },
  {
    category: { name: '生活记录', slug: 'life' },
    id: 'post-slow-growth',
    publishedAt: '2026-08-28T08:00:00.000Z',
    readingTimeMinutes: 4,
    slug: 'slow-growth',
    summary: '一些关于持续、耐心和把小事做好的私人笔记。',
    tags: ['Life', 'Notes'],
    title: '缓慢生长，也是一种进度',
  },
]

const moments: HomepageMoment[] = [
  {
    body: '今天把首页的第一道光调得更柔和了。比起夺目的效果，我更想让它像夜里窗帘缝隙透进来的亮。',
    id: 'moment-soft-light',
    location: '书桌旁',
    mood: '专注',
    publishedAt: '2026-09-17T13:30:00.000Z',
    tags: ['Building'],
  },
  {
    body: '把一段很久没有读完的书重新翻开，发现以前跳过的句子正在回应现在的问题。',
    id: 'moment-open-book',
    location: '窗边',
    mood: '平静',
    publishedAt: '2026-09-12T10:00:00.000Z',
    tags: ['Reading'],
  },
  {
    body: '周末留了一点空白，没有安排，也没有追赶什么。',
    id: 'moment-blank-space',
    mood: '松弛',
    publishedAt: '2026-09-07T04:00:00.000Z',
    tags: ['Life'],
  },
]

const chatter: HomepageChatter[] = [
  {
    id: 'chatter-interface-breathing',
    lead: '留白不是空着，而是给信息之间留出可以呼吸的距离。',
    mood: '设计',
    publishedAt: '2026-09-15T08:00:00.000Z',
    tags: ['UI', 'Reflection'],
    title: '让界面先学会呼吸',
  },
  {
    id: 'chatter-small-contracts',
    lead: '一个小而明确的类型边界，通常比一个聪明的全能抽象更容易长久。',
    mood: '工程',
    publishedAt: '2026-09-09T08:00:00.000Z',
    tags: ['TypeScript', 'API'],
    title: '先把边界说清楚',
  },
  {
    id: 'chatter-nightly-shipping',
    lead: '能在夜里安静收尾的工作，第二天往往也更容易继续。',
    mood: '日常',
    publishedAt: '2026-09-02T08:00:00.000Z',
    tags: ['Routine'],
    title: '把今天交给今天',
  },
]

const projects: HomepageProject[] = [
  {
    demoUrl: 'https://example.com/lumen-notes',
    description: '一个把零散灵感整理成可继续阅读的轻量工作台。',
    githubUrl: 'https://github.com/example/lumen-notes',
    id: 'project-lumen-notes',
    name: 'Lumen Notes',
    selected: true,
    stack: ['Nuxt', 'TypeScript', 'SQLite'],
    status: 'active',
  },
  {
    demoUrl: 'https://example.com/quiet-api',
    description: '面向个人项目的清晰 API 约定与错误边界实验。',
    githubUrl: 'https://github.com/example/quiet-api',
    id: 'project-quiet-api',
    name: 'Quiet API',
    selected: true,
    stack: ['FastAPI', 'MySQL', 'OpenAPI'],
    status: 'developing',
  },
  {
    description: '一份关于阅读、写作和长期维护的静态资料集。',
    githubUrl: 'https://github.com/example/archive-garden',
    id: 'project-archive-garden',
    name: 'Archive Garden',
    selected: false,
    stack: ['Markdown', 'Astro'],
    status: 'archived',
  },
]

export const homepageFixtures: HomepageFixtureContent = {
  chatter: collection(chatter),
  moments: collection(moments),
  posts: collection(posts),
  projects: collection(projects.filter((project) => project.selected)),
  stats: [
    {
      detail: '持续更新',
      label: '公开文章',
      value: String(posts.length).padStart(2, '0'),
    },
    {
      detail: '生活片段',
      label: '最近动态',
      value: String(moments.length).padStart(2, '0'),
    },
    {
      detail: '正在维护',
      label: '精选项目',
      value: String(
        projects.filter((project) => project.selected).length,
      ).padStart(2, '0'),
    },
  ],
}
