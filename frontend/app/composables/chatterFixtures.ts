import type {
  Chatter,
  ChatterCollectionResponse,
  ChatterProvider,
} from '../types/chatter'
import type { PublicFeedQuery } from '../types/public-content'
import { clampPublicPageSize, toPublicFilters } from '../utils/public-content'

const chatter: Chatter[] = [
  {
    body: '一个小而明确的类型边界，通常比一个聪明的全能抽象更容易长久。先让数据拥有清楚的名字，页面和未来的 API 才有机会说同一种语言。',
    id: 'chatter-small-contracts',
    mood: '工程',
    publishedAt: '2026-09-15T08:00:00.000Z',
    tags: [
      { name: 'TypeScript', slug: 'typescript' },
      { name: 'API', slug: 'api' },
    ],
    title: '先把边界说清楚',
  },
  {
    body: '留白不是空着，而是给信息之间留出可以呼吸的距离。好的卡片不会把每个角落都填满，它知道什么应该被看见，也知道什么可以暂时安静。',
    id: 'chatter-interface-breathing',
    mood: '设计',
    publishedAt: '2026-09-10T08:00:00.000Z',
    tags: [
      { name: 'UI', slug: 'ui' },
      { name: 'Reflection', slug: 'reflection' },
    ],
    title: '让界面先学会呼吸',
  },
  {
    body: '能在夜里安静收尾的工作，第二天往往也更容易继续。把未完成的部分写下来，给明天留一盏小灯，比逼自己现在解决全部问题更有效。',
    id: 'chatter-nightly-shipping',
    mood: '日常',
    publishedAt: '2026-09-02T08:00:00.000Z',
    tags: [
      { name: 'Routine', slug: 'routine' },
      { name: 'Reflection', slug: 'reflection' },
    ],
    title: '把今天交给今天',
  },
  {
    body: '把搜索、筛选和空状态都当成内容的一部分，短记录也就不会因为数据变少而显得失去方向。',
    id: 'chatter-visible-states',
    mood: '产品',
    publishedAt: '2026-08-26T08:00:00.000Z',
    tags: [
      { name: 'UX', slug: 'ux' },
      { name: 'Accessibility', slug: 'accessibility' },
    ],
    title: '状态也值得被写好',
  },
]

const contains = (entry: Chatter, q: string) =>
  [
    entry.body,
    entry.mood,
    entry.tags.map((tag) => `${tag.name} ${tag.slug}`).join(' '),
    entry.title,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
    .includes(q.toLocaleLowerCase())

export const chatterFixtureProvider: ChatterProvider = {
  listChatter: async (
    query: PublicFeedQuery,
  ): Promise<ChatterCollectionResponse> => {
    const filtered = chatter
      .filter((entry) =>
        query.tag ? entry.tags.some((tag) => tag.slug === query.tag) : true,
      )
      .filter((entry) => (query.q ? contains(entry, query.q) : true))
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    const pageSize = clampPublicPageSize(query.pageSize)
    const totalPages = Math.ceil(filtered.length / pageSize)
    const start = (Math.max(query.page, 1) - 1) * pageSize

    return {
      data: filtered.slice(start, start + pageSize),
      filters: toPublicFilters(query),
      pagination: {
        page: Math.max(query.page, 1),
        pageSize,
        total: filtered.length,
        totalPages,
      },
    }
  },
  listTags: async () =>
    [
      ...new Map(
        chatter.flatMap((entry) => entry.tags).map((tag) => [tag.slug, tag]),
      ).values(),
    ].sort((left, right) => left.name.localeCompare(right.name)),
}

export const chatterFixtureRecords = chatter
