import type { Chatter, ChatterCollectionResponse } from '~/types/chatter'
import type {
  HomepageChatter,
  HomepageCollectionResponse,
  HomepageMoment,
  HomepagePost,
  HomepageProject,
} from '~/types/homepage'
import type { Moment, MomentCollectionResponse } from '~/types/moments'
import type { MusicTrack, MusicTrackCollectionResponse } from '~/types/music'
import type {
  PostCategory,
  PostCollectionResponse,
  PostDetail,
  PostQuery,
  PostSummary,
  PostTag,
  TaxonomyCollectionResponse,
} from '~/types/posts'
import type {
  AboutProfile,
  AboutSkillGroup,
  AboutTimelineItem,
  FriendCollectionResponse,
  Project,
  ProjectCollectionResponse,
} from '~/types/portfolio'
import type {
  PublicCollectionPagination,
  PublicFeedQuery,
  PublicTag,
} from '~/types/public-content'
import type { PublicSiteSettings, SiteIdentityView } from '~/types/site'

interface RawPagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

interface RawCollection<T> {
  data: T[]
  pagination: RawPagination
}

interface RawApiResponse<T> {
  data: T
}

interface RawTaxonomy {
  id: number
  name: string
  post_count: number
  slug: string
}

interface RawPost {
  body?: string
  category: RawTaxonomy | null
  cover_alt: string | null
  cover_url: string | null
  created_at: string
  id: number
  is_pinned: boolean
  published_at: string | null
  reading_count: number
  reading_time_minutes: number
  slug: string
  status: string
  summary: string
  tags: RawTaxonomy[]
  title: string
  updated_at: string
}

interface RawPostCollection extends RawCollection<RawPost> {
  filters: Record<string, string>
}

interface RawProject {
  demo_url: string | null
  description: string
  display_order: number
  featured: boolean
  id: number
  logo_alt: string | null
  logo_url: string | null
  name: string
  source_url: string | null
  status: 'active' | 'archived' | 'developing'
  technology: string[]
  time_span: string
}

interface RawFriend {
  avatar_alt: string | null
  avatar_url: string | null
  description: string
  display_order: number
  id: number
  is_active: boolean
  name: string
  url: string
}

interface RawSiteSettings {
  about: {
    interests: string[]
    skills: AboutSkillGroup[]
    story: string[]
    timeline: AboutTimelineItem[]
  }
  avatar_alt: string | null
  avatar_url: string | null
  contact: { email: string; note: string }
  description: string
  favicon_url: string | null
  footer: { copyright: string; icp: string; note: string }
  homepage_visibility: {
    chatter: boolean
    friends: boolean
    music: boolean
    moments: boolean
    posts: boolean
    projects: boolean
  }
  name: string
  profile: string
  seo_defaults: {
    canonical_url: string | null
    description: string
    keywords: string[]
    og_image_url: string | null
    title: string
    twitter_card: 'summary' | 'summary_large_image'
  }
  social_links: Array<{
    href: string
    kind: 'code' | 'social'
    label: string
  }>
  tagline: string
}

interface RawMusicTrack {
  artist: string
  display_order: number
  duration_seconds: number | null
  id: number
  source_url: string
  title: string
}

interface RawMoment {
  body: string
  id: number
  images: Array<{ alt: string; height: number; src: string; width: number }>
  location: string | null
  mood: string | null
  published_at: string
  tags: Array<{ content_count: number; id: number; name: string; slug: string }>
}

interface RawChatter {
  body: string
  id: number
  lead: string | null
  mood: string | null
  published_at: string
  tags: Array<{ content_count: number; id: number; name: string; slug: string }>
  title: string | null
}

interface RawFeedCollection<T> extends RawCollection<T> {
  filters: Record<string, string>
}

interface RawPublicTag {
  content_count: number
  id: number
  name: string
  slug: string
}

export class BlogApiError extends Error {
  readonly code: string
  readonly details: unknown
  readonly status: number

  constructor(
    message: string,
    options: { code?: string; details?: unknown; status?: number } = {},
  ) {
    super(message)
    this.name = 'BlogApiError'
    this.code = options.code ?? 'api_error'
    this.details = options.details
    this.status = options.status ?? 0
  }
}

export interface BlogApiClient {
  getPostBySlug: (
    slug: string,
    signal?: AbortSignal,
  ) => Promise<PostDetail | null>
  getAbout: (signal?: AbortSignal) => Promise<AboutProfile>
  getSettings: (signal?: AbortSignal) => Promise<PublicSiteSettings>
  listCategories: (
    signal?: AbortSignal,
  ) => Promise<TaxonomyCollectionResponse<PostCategory>>
  listChatter: (
    query: PublicFeedQuery,
    signal?: AbortSignal,
  ) => Promise<ChatterCollectionResponse>
  listChatterTags: (signal?: AbortSignal) => Promise<PublicTag[]>
  listFriends: (signal?: AbortSignal) => Promise<FriendCollectionResponse>
  listHomepageChatter: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageChatter>>
  listHomepageMoments: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageMoment>>
  listHomepagePosts: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepagePost>>
  listHomepageProjects: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageProject>>
  listMoments: (
    query: PublicFeedQuery,
    signal?: AbortSignal,
  ) => Promise<MomentCollectionResponse>
  listMomentTags: (signal?: AbortSignal) => Promise<PublicTag[]>
  listMusicTracks: (
    signal?: AbortSignal,
  ) => Promise<MusicTrackCollectionResponse>
  listPosts: (
    query: PostQuery,
    signal?: AbortSignal,
  ) => Promise<PostCollectionResponse>
  listProjects: (signal?: AbortSignal) => Promise<ProjectCollectionResponse>
  listTags: (
    signal?: AbortSignal,
  ) => Promise<TaxonomyCollectionResponse<PostTag>>
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

const pagination = (value: RawPagination): PublicCollectionPagination => ({
  page: value.page,
  pageSize: value.page_size,
  total: value.total,
  totalPages: value.total_pages,
})

type MediaUrlResolver = (value: string) => string

const cover = (
  url: string | null,
  alt: string | null,
  resolveMediaUrl: MediaUrlResolver,
) =>
  url
    ? {
        alt: alt || '文章封面',
        height: 451,
        src: resolveMediaUrl(url),
        width: 640,
      }
    : undefined

const toPostCategory = (value: RawTaxonomy | null): PostCategory =>
  value
    ? {
        name: value.name,
        postCount: value.post_count,
        slug: value.slug,
      }
    : { name: '未分类', postCount: 0, slug: 'uncategorized' }

const toPostTag = (value: RawTaxonomy): PostTag => ({
  name: value.name,
  postCount: value.post_count,
  slug: value.slug,
})

const toPostSummary = (
  value: RawPost,
  resolveMediaUrl: MediaUrlResolver,
): PostSummary => {
  const postCover = cover(value.cover_url, value.cover_alt, resolveMediaUrl)

  return {
    category: toPostCategory(value.category),
    ...(postCover ? { cover: postCover } : {}),
    id: String(value.id),
    pinned: value.is_pinned,
    publishedAt: value.published_at ?? value.created_at,
    readingCount: value.reading_count,
    readingTimeMinutes: value.reading_time_minutes,
    slug: value.slug,
    summary: value.summary,
    tags: value.tags.map(toPostTag),
    title: value.title,
    ...(value.updated_at ? { updatedAt: value.updated_at } : {}),
  }
}

const toProject = (
  value: RawProject,
  resolveMediaUrl: MediaUrlResolver,
): Project => ({
  demoUrl: value.demo_url ?? undefined,
  description: value.description,
  featured: value.featured,
  githubUrl: value.source_url ?? undefined,
  id: String(value.id),
  ...(value.logo_url
    ? {
        logo: {
          alt: value.logo_alt || `${value.name} 标志`,
          height: 160,
          src: resolveMediaUrl(value.logo_url),
          width: 160,
        },
      }
    : {}),
  name: value.name,
  sourceUrl: value.source_url ?? undefined,
  stack: value.technology,
  status: value.status,
  timeSpan: value.time_span,
})

const toPublicTag = (value: { name: string; slug: string }): PublicTag => ({
  name: value.name,
  slug: value.slug,
})

const toMoment = (
  value: RawMoment,
  resolveMediaUrl: MediaUrlResolver,
): Moment => ({
  body: value.body,
  id: String(value.id),
  ...(value.images.length
    ? {
        images: value.images.map((image) => ({
          alt: image.alt,
          height: image.height,
          src: resolveMediaUrl(image.src),
          width: image.width,
        })),
      }
    : {}),
  ...(value.location ? { location: value.location } : {}),
  ...(value.mood ? { mood: value.mood } : {}),
  publishedAt: value.published_at,
  tags: value.tags.map(toPublicTag),
})

const toChatter = (value: RawChatter): Chatter => ({
  body: value.body,
  id: String(value.id),
  lead: value.lead ?? value.body,
  ...(value.mood ? { mood: value.mood } : {}),
  publishedAt: value.published_at,
  tags: value.tags.map(toPublicTag),
  title: value.title ?? '杂谈记录',
})

const toSiteSettings = (
  value: RawSiteSettings,
  resolveMediaUrl: MediaUrlResolver,
): PublicSiteSettings => ({
  about: value.about,
  ...(value.avatar_alt ? { avatarAlt: value.avatar_alt } : {}),
  ...(value.avatar_url ? { avatarUrl: resolveMediaUrl(value.avatar_url) } : {}),
  contact: value.contact,
  description: value.description,
  ...(value.favicon_url
    ? { faviconUrl: resolveMediaUrl(value.favicon_url) }
    : {}),
  footer: value.footer,
  homepageVisibility: value.homepage_visibility,
  name: value.name,
  profile: value.profile,
  seoDefaults: {
    ...(value.seo_defaults.canonical_url
      ? { canonicalUrl: value.seo_defaults.canonical_url }
      : {}),
    description: value.seo_defaults.description,
    keywords: value.seo_defaults.keywords,
    ...(value.seo_defaults.og_image_url
      ? { ogImageUrl: resolveMediaUrl(value.seo_defaults.og_image_url) }
      : {}),
    title: value.seo_defaults.title,
    twitterCard: value.seo_defaults.twitter_card,
  },
  socialLinks: value.social_links,
  tagline: value.tagline,
})

const toIdentity = (value: PublicSiteSettings): SiteIdentityView => ({
  description: value.description,
  footerNote: value.footer.note,
  name: value.name,
  socialLinks: value.socialLinks,
  tagline: value.tagline,
})

const toAbout = (
  value: PublicSiteSettings,
  avatarUrl = value.avatarUrl,
): AboutProfile => ({
  avatar: avatarUrl
    ? {
        alt: value.avatarAlt || `${value.name}头像`,
        height: 240,
        src: avatarUrl,
        width: 240,
      }
    : undefined,
  contact: value.contact,
  interests: value.about.interests,
  name: value.name,
  profile: value.profile || value.description,
  skills: value.about.skills,
  socialLinks: value.socialLinks,
  story: value.about.story,
  tagline: value.tagline,
  timeline: value.about.timeline,
})

const toTrack = (
  value: RawMusicTrack,
  resolveMediaUrl: MediaUrlResolver,
): MusicTrack => ({
  artist: value.artist,
  id: String(value.id),
  src: resolveMediaUrl(value.source_url),
  title: value.title,
})

export const toPublicSiteIdentity = toIdentity
export const toPublicAbout = toAbout

export function useApiClient(): BlogApiClient {
  const runtimeConfig = useRuntimeConfig()
  const configuredBase = import.meta.server
    ? String(runtimeConfig.apiBase || '')
    : String(runtimeConfig.public.apiBase || '')
  const publicBase = String(runtimeConfig.public.apiBase || '/api/v1')
  const baseURL = normalizeBaseUrl(
    configuredBase.startsWith('http')
      ? configuredBase
      : import.meta.server
        ? new URL(publicBase, useRequestURL().origin).toString()
        : configuredBase || publicBase,
  )
  const mediaBase = publicBase.startsWith('http')
    ? publicBase
    : import.meta.server
      ? useRequestURL().origin
      : ''
  const resolveMediaUrl: MediaUrlResolver = (value) => {
    if (/^https?:\/\//i.test(value)) {
      return value
    }
    if (!value.startsWith('/uploads/')) {
      return value
    }
    if (!mediaBase) {
      return value
    }
    return new URL(value, mediaBase).toString()
  }
  const serverHeaders = import.meta.server
    ? useRequestHeaders(['cookie', 'x-csrf-token'])
    : undefined

  const request = async <T>(
    path: string,
    options: {
      query?: Record<string, string | number | undefined>
      signal?: AbortSignal
    } = {},
  ): Promise<T> => {
    try {
      return await $fetch<T>(path, {
        baseURL,
        credentials: 'include',
        headers: serverHeaders,
        query: options.query,
        signal: options.signal,
      })
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw error
      }
      throw normalizeApiError(error)
    }
  }

  const listPosts = async (query: PostQuery, signal?: AbortSignal) => {
    const response = await request<RawPostCollection>('/posts', {
      query: {
        category: query.category,
        page: query.page,
        page_size: query.pageSize,
        q: query.q,
        tag: query.tag,
      },
      signal,
    })
    return {
      data: response.data.map((post) => toPostSummary(post, resolveMediaUrl)),
      filters: response.filters,
      pagination: pagination(response.pagination),
    }
  }

  const listAllTaxonomy = async (
    path: '/categories' | '/tags',
    signal?: AbortSignal,
  ) => {
    const data: Array<{ name: string; postCount: number; slug: string }> = []
    let page = 1
    let totalPages = 1
    let lastPagination: PostCollectionResponse['pagination'] = {
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 0,
    }

    while (page <= totalPages) {
      const response = await request<RawCollection<RawTaxonomy>>(path, {
        query: { page, page_size: 100 },
        signal,
      })
      lastPagination = pagination(response.pagination)
      totalPages = Math.max(1, lastPagination.totalPages)
      data.push(
        ...response.data.map((value) => ({
          name: value.name,
          postCount: value.post_count,
          slug: value.slug,
        })),
      )
      page += 1
    }

    return {
      data,
      pagination: {
        ...lastPagination,
        page: 1,
        total: data.length,
        totalPages: data.length ? 1 : 0,
      },
    }
  }

  const listCategories = async (signal?: AbortSignal) => {
    const response = await listAllTaxonomy('/categories', signal)
    return {
      data: response.data,
      pagination: response.pagination,
    }
  }

  const listTags = async (signal?: AbortSignal) => {
    const response = await listAllTaxonomy('/tags', signal)
    return {
      data: response.data,
      pagination: response.pagination,
    }
  }

  const listMoments = async (query: PublicFeedQuery, signal?: AbortSignal) => {
    const response = await request<RawFeedCollection<RawMoment>>('/moments', {
      query: {
        page: query.page,
        page_size: query.pageSize,
        q: query.q,
        tag: query.tag,
      },
      signal,
    })
    return {
      data: response.data.map((moment) => toMoment(moment, resolveMediaUrl)),
      filters: response.filters,
      pagination: pagination(response.pagination),
    }
  }

  const listChatter = async (query: PublicFeedQuery, signal?: AbortSignal) => {
    const response = await request<RawFeedCollection<RawChatter>>('/chatter', {
      query: {
        page: query.page,
        page_size: query.pageSize,
        q: query.q,
        tag: query.tag,
      },
      signal,
    })
    return {
      data: response.data.map(toChatter),
      filters: response.filters,
      pagination: pagination(response.pagination),
    }
  }

  const listAllPublicTags = async (
    path: '/moments/tags' | '/chatter/tags',
    signal?: AbortSignal,
  ) => {
    const data: PublicTag[] = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const response = await request<RawCollection<RawPublicTag>>(path, {
        query: { page, page_size: 100 },
        signal,
      })
      totalPages = Math.max(1, response.pagination.total_pages)
      data.push(...response.data.map(toPublicTag))
      page += 1
    }

    return data
  }

  const listMomentTags = (signal?: AbortSignal) =>
    listAllPublicTags('/moments/tags', signal)

  const listChatterTags = (signal?: AbortSignal) =>
    listAllPublicTags('/chatter/tags', signal)

  const listHomepagePosts = async (signal?: AbortSignal) => {
    const response = await listPosts({ page: 1, pageSize: 3 }, signal)
    return {
      data: response.data.map((post) => ({
        category: post.category,
        ...(post.cover ? { cover: post.cover } : {}),
        id: post.id,
        publishedAt: post.publishedAt,
        readingTimeMinutes: post.readingTimeMinutes,
        slug: post.slug,
        summary: post.summary,
        tags: post.tags.map((tag) => tag.name),
        title: post.title,
      })),
      pagination: response.pagination,
    }
  }

  const listProjects = async (signal?: AbortSignal) => {
    const response = await request<RawCollection<RawProject>>('/projects', {
      query: { page: 1, page_size: 100 },
      signal,
    })
    return {
      data: response.data.map((project) => toProject(project, resolveMediaUrl)),
      pagination: pagination(response.pagination),
    }
  }

  const listHomepageProjects = async (signal?: AbortSignal) => {
    const response = await listProjects(signal)
    const data = response.data
      .filter((project) => project.featured)
      .map((project) => ({
        demoUrl: project.demoUrl,
        description: project.description,
        githubUrl: project.githubUrl,
        id: project.id,
        name: project.name,
        selected: project.featured,
        stack: project.stack,
        status: project.status,
      }))
    return {
      data,
      pagination: {
        ...response.pagination,
        total: data.length,
        totalPages: data.length ? 1 : 0,
      },
    }
  }

  const listHomepageMoments = async (signal?: AbortSignal) => {
    const response = await listMoments({ page: 1, pageSize: 3 }, signal)
    return {
      data: response.data.map((moment) => ({
        body: moment.body,
        id: moment.id,
        ...(moment.location ? { location: moment.location } : {}),
        ...(moment.mood ? { mood: moment.mood } : {}),
        publishedAt: moment.publishedAt,
        tags: moment.tags?.map((tag) => tag.name) ?? [],
      })),
      pagination: response.pagination,
    }
  }

  const listHomepageChatter = async (signal?: AbortSignal) => {
    const response = await listChatter({ page: 1, pageSize: 3 }, signal)
    return {
      data: response.data.map((chatter) => ({
        id: chatter.id,
        ...(chatter.mood ? { mood: chatter.mood } : {}),
        lead: chatter.lead ?? chatter.body,
        publishedAt: chatter.publishedAt,
        tags: chatter.tags.map((tag) => tag.name),
        title: chatter.title,
      })),
      pagination: response.pagination,
    }
  }

  const getPostBySlug = async (slug: string, signal?: AbortSignal) => {
    try {
      const response = await request<RawApiResponse<RawPost>>(
        `/posts/${encodeURIComponent(slug)}`,
        { signal },
      )
      const summary = toPostSummary(response.data, resolveMediaUrl)
      return {
        ...summary,
        body: response.data.body ?? '',
      }
    } catch (error: unknown) {
      if (error instanceof BlogApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  const getSettings = async (signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawSiteSettings>>(
      '/settings',
      {
        signal,
      },
    )
    return toSiteSettings(response.data, resolveMediaUrl)
  }

  const getAbout = async (signal?: AbortSignal) =>
    toAbout(await getSettings(signal))

  const listMusicTracks = async (signal?: AbortSignal) => {
    const response = await request<RawCollection<RawMusicTrack>>(
      '/music-tracks',
      {
        query: { page: 1, page_size: 100 },
        signal,
      },
    )
    return {
      data: response.data.map((track) => toTrack(track, resolveMediaUrl)),
      pagination: pagination(response.pagination),
    }
  }

  const listFriends = async (signal?: AbortSignal) => {
    const response = await request<RawCollection<RawFriend>>('/friends', {
      query: { page: 1, page_size: 100 },
      signal,
    })
    return {
      data: response.data.map((friend) => ({
        ...(friend.avatar_url
          ? {
              avatar: {
                alt: friend.avatar_alt || `${friend.name} 网站头像`,
                height: 160,
                src: resolveMediaUrl(friend.avatar_url),
                width: 160,
              },
            }
          : {}),
        description: friend.description,
        id: String(friend.id),
        name: friend.name,
        url: friend.url,
      })),
      pagination: pagination(response.pagination),
    }
  }

  return {
    getAbout,
    getPostBySlug,
    getSettings,
    listCategories,
    listChatter,
    listChatterTags,
    listFriends,
    listHomepageChatter,
    listHomepageMoments,
    listHomepagePosts,
    listHomepageProjects,
    listMoments,
    listMomentTags,
    listMusicTracks,
    listPosts,
    listProjects,
    listTags,
  }
}

function isAbortError(error: unknown) {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError')
  )
}

function normalizeApiError(error: unknown): BlogApiError {
  if (error instanceof BlogApiError) {
    return error
  }

  const response =
    typeof error === 'object' && error !== null && 'response' in error
      ? (error.response as { _data?: unknown; status?: number } | undefined)
      : undefined
  const payload = response?._data
  const envelope =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? (payload.error as Record<string, unknown>)
      : undefined
  const status = response?.status ?? getNumber(error, 'statusCode') ?? 0

  return new BlogApiError(
    typeof envelope?.message === 'string'
      ? envelope.message
      : status >= 500
        ? '内容服务暂时无法响应，请稍后重试。'
        : '内容暂时无法加载，请稍后重试。',
    {
      code: typeof envelope?.code === 'string' ? envelope.code : 'api_error',
      details: envelope?.details,
      status,
    },
  )
}

function getNumber(value: unknown, key: string) {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return undefined
  }
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'number' ? candidate : undefined
}
