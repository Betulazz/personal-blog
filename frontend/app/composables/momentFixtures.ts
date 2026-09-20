import type {
  Moment,
  MomentCollectionResponse,
  MomentProvider,
} from '../types/moments'
import type { PublicFeedQuery } from '../types/public-content'
import { clampPublicPageSize, toPublicFilters } from '../utils/public-content'

const image = (alt: string, src: string) => ({
  alt,
  height: 451,
  src,
  width: 640,
})

const moments: Moment[] = [
  {
    body: '今天把首页的第一道光调得更柔和了。比起夺目的效果，我更想让它像夜里窗帘缝隙透进来的亮。',
    id: 'moment-soft-light',
    images: [
      image('深蓝色夜空与柔和光晕', '/images/background/ambient-640.avif'),
    ],
    location: '书桌旁',
    mood: '专注',
    publishedAt: '2026-09-17T13:30:00.000Z',
    tags: [{ name: 'Building', slug: 'building' }],
  },
  {
    body: '把一段很久没有读完的书重新翻开，发现以前跳过的句子正在回应现在的问题。',
    id: 'moment-open-book',
    images: [image('窗边摊开的书', '/images/background/ambient-640.webp')],
    location: '窗边',
    mood: '平静',
    publishedAt: '2026-09-12T10:00:00.000Z',
    tags: [{ name: 'Reading', slug: 'reading' }],
  },
  {
    body: '周末留了一点空白，没有安排，也没有追赶什么。',
    id: 'moment-blank-space',
    mood: '松弛',
    publishedAt: '2026-09-07T04:00:00.000Z',
  },
  {
    body: '为一个小组件补上键盘路径，才发现真正的顺手不是更快，而是不用猜下一步会发生什么。',
    id: 'moment-keyboard-path',
    location: '深夜工作台',
    mood: '清醒',
    publishedAt: '2026-09-03T15:20:00.000Z',
    tags: [
      { name: 'Accessibility', slug: 'accessibility' },
      { name: 'Building', slug: 'building' },
    ],
  },
  {
    body: '回家的路上拍到一片很安静的蓝。它提醒我，长内容也可以留一点不急着解释的地方。',
    id: 'moment-evening-blue',
    images: [image('傍晚的蓝色街景', '/images/background/ambient-640.avif')],
    mood: '观察',
    publishedAt: '2026-08-29T11:45:00.000Z',
    tags: [{ name: 'Life', slug: 'life' }],
  },
]

const contains = (moment: Moment, q: string) =>
  [
    moment.body,
    moment.location,
    moment.mood,
    moment.tags?.map((tag) => `${tag.name} ${tag.slug}`).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
    .includes(q.toLocaleLowerCase())

export const momentFixtureProvider: MomentProvider = {
  listMoments: async (
    query: PublicFeedQuery,
  ): Promise<MomentCollectionResponse> => {
    const filtered = moments
      .filter((moment) =>
        query.tag ? moment.tags?.some((tag) => tag.slug === query.tag) : true,
      )
      .filter((moment) => (query.q ? contains(moment, query.q) : true))
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
        moments
          .flatMap((moment) => moment.tags ?? [])
          .map((tag) => [tag.slug, tag]),
      ).values(),
    ].sort((left, right) => left.name.localeCompare(right.name)),
}

export const momentFixtureRecords = moments
