import { siteIdentity } from '../config/siteIdentity'
import type {
  AboutProfile,
  FriendCollectionResponse,
  FriendLink,
  PortfolioProvider,
  Project,
  ProjectCollectionResponse,
} from '../types/portfolio'

const projects: Project[] = [
  {
    demoUrl: 'https://example.com/lumen-notes',
    description: '一个把零散灵感整理成可继续阅读的轻量工作台。',
    featured: true,
    highlights: ['把记录整理成可检索的阅读路径', '为小团队保留安静的协作节奏'],
    id: 'project-lumen-notes',
    logo: {
      alt: 'Lumen Notes 项目标志',
      height: 160,
      src: '/images/portfolio/project-lumen.svg',
      width: 160,
    },
    name: 'Lumen Notes',
    sourceUrl: 'https://github.com/example/lumen-notes',
    stack: ['Nuxt', 'TypeScript', 'SQLite'],
    status: 'active',
    timeSpan: '2025.02 — 2026.06',
  },
  {
    demoUrl: 'https://example.com/quiet-api',
    description: '面向个人项目的清晰 API 约定与错误边界实验。',
    featured: true,
    highlights: ['稳定的成功、分页与错误响应', '让服务边界可以被测试和解释'],
    id: 'project-quiet-api',
    logo: {
      alt: 'Quiet API 项目标志',
      height: 160,
      src: '/images/portfolio/project-quiet.svg',
      width: 160,
    },
    name: 'Quiet API',
    sourceUrl: 'https://github.com/example/quiet-api',
    stack: ['FastAPI', 'MySQL', 'OpenAPI'],
    status: 'developing',
    timeSpan: '2026.03 — 至今',
  },
  {
    description: '一份关于阅读、写作和长期维护的静态资料集。',
    featured: false,
    id: 'project-archive-garden',
    logo: {
      alt: 'Archive Garden 项目标志',
      height: 160,
      src: '/images/portfolio/project-archive.svg',
      width: 160,
    },
    name: 'Archive Garden',
    sourceUrl: 'https://github.com/example/archive-garden',
    stack: ['Markdown', 'Astro'],
    status: 'archived',
    timeSpan: '2024.09 — 2025.01',
  },
]

const friends: FriendLink[] = [
  {
    description: '记录界面、阅读和那些不急着完成的灵感。',
    id: 'friend-lantern-notes',
    avatar: {
      alt: 'Lantern Notes 网站头像',
      height: 160,
      src: '/images/portfolio/friend-lantern.svg',
      width: 160,
    },
    name: 'Lantern Notes',
    tags: ['写作', '设计'],
    url: 'https://example.com/lantern-notes',
  },
  {
    description: '一份持续整理中的前端工程与可访问性笔记。',
    id: 'friend-soft-interfaces',
    avatar: {
      alt: 'Soft Interfaces 网站头像',
      height: 160,
      src: '/images/portfolio/friend-soft.svg',
      width: 160,
    },
    name: 'Soft Interfaces',
    tags: ['前端', 'Accessibility'],
    url: 'https://example.com/soft-interfaces',
  },
  {
    description: '从植物、城市和慢速摄影里寻找日常的光。',
    id: 'friend-blue-hour',
    avatar: {
      alt: 'Blue Hour 网站头像',
      height: 160,
      src: '/images/portfolio/friend-blue.svg',
      width: 160,
    },
    name: 'Blue Hour',
    tags: ['生活', '摄影'],
    url: 'https://example.com/blue-hour',
  },
]

const about: AboutProfile = {
  contact: {
    email: 'hello@example.com',
    note: '欢迎来信讨论长期写作、独立产品和温和的工程实践。',
  },
  interests: ['独立产品', '书与纸张', '城市散步', '可访问性', '环境音乐'],
  name: siteIdentity.name,
  profile:
    '我是一个喜欢把复杂问题拆小、把长期工作做得可持续的人。这里是我的公开记录：一些技术实践，一些生活观察，也包括仍在慢慢成形的想法。',
  skills: [
    {
      items: ['Vue / Nuxt', 'TypeScript', 'CSS Architecture'],
      name: '界面与体验',
    },
    { items: ['FastAPI', 'SQLAlchemy', 'MySQL'], name: '服务与数据' },
    {
      items: ['Design Systems', 'Accessibility', 'Technical Writing'],
      name: '方法与表达',
    },
  ],
  socialLinks: siteIdentity.socialLinks,
  story: [
    '我一直相信，好的个人网站不需要把所有事情都说完。它更像一张留在桌面上的地图：标记走过的地方，也给下一次出发留一些空白。',
    '我在工作中关注清晰的边界、可迁移的内容和不打扰人的交互。无论是一个页面、一篇文章，还是一段 API，我都希望它们能在被使用时少让人猜一步。',
    '夜航手记从这些实践里生长出来。它不是一份完成时的简历，而是一段持续更新的过程；如果你在这里遇到一段有用的文字，那就是它很好的去处。',
  ],
  tagline: siteIdentity.tagline,
  timeline: [
    {
      description: '开始把技术笔记与生活记录放在同一个可持续维护的空间。',
      period: '2026',
      title: '夜航手记重新出发',
    },
    {
      description: '从交互细节开始，逐渐建立自己的设计 token 和组件边界。',
      period: '2025',
      title: '做更安静的界面',
    },
    {
      description:
        '第一次认真整理长期写作的工作流，发现 Markdown 依然值得信任。',
      period: '2024',
      title: '把内容交还给文本',
    },
  ],
}

export const portfolioFixtureProvider: PortfolioProvider = {
  getAbout: async () => about,
  listFriends: async (): Promise<FriendCollectionResponse> => ({
    data: friends,
  }),
  listProjects: async (): Promise<ProjectCollectionResponse> => ({
    data: projects,
  }),
}

export const portfolioFixtureRecords = {
  about,
  friends,
  projects,
}
