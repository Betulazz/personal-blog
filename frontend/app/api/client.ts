import type {
  AdminChatter,
  AdminChatterInput,
  AdminMoment,
  AdminMomentInput,
  AdminResourceApi,
} from '~/types/admin-notes'
import type { AdminMusicTrack, AdminMusicTrackInput } from '~/types/admin-music'
import type { Chatter, ChatterCollectionResponse } from '~/types/chatter'
import type {
  AdminDashboard,
  AdminPost,
  AdminPostCollection,
  AdminPostInput,
  AdminPostQuery,
  AdminRecentActivity,
  AdminTaxonomy,
  AdminTaxonomyInput,
  AdminUser,
} from '~/types/admin'
import type {
  AdminFriendLink,
  AdminFriendLinkCollection,
  AdminFriendLinkInput,
  AdminFriendLinkQuery,
  AdminProject,
  AdminProjectCollection,
  AdminProjectInput,
  AdminProjectQuery,
  AdminSiteSettings,
  AdminSiteSettingsInput,
} from '~/types/admin-portfolio'
import type {
  AdminMediaAsset,
  AdminMediaCollection,
  AdminMediaDeleteResult,
  AdminMediaPolicy,
  AdminMediaQuery,
  AdminMediaReference,
} from '~/types/admin-media'
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

interface RawAdminUser {
  created_at: string
  email: string | null
  id: number
  is_active: boolean
  username: string
}

interface RawAdminDashboard {
  counts: {
    chatter: number
    draft_posts: number
    friends: number
    moments: number
    posts: number
    projects: number
    published_posts: number
    total_reading_count: number
  }
  recent_activity: Array<{
    id: number
    status: string
    title: string
    type: AdminRecentActivity['type']
    updated_at: string
  }>
}

interface RawTaxonomy {
  created_at?: string | null
  id: number
  name: string
  post_count: number
  slug: string
  updated_at?: string | null
}

interface RawPost {
  body?: string
  canonical_url: string | null
  category: RawTaxonomy | null
  cover_alt: string | null
  cover_url: string | null
  created_at: string
  id: number
  is_pinned: boolean
  og_image_url: string | null
  published_at: string | null
  reading_count: number
  reading_time_minutes: number
  seo_description: string | null
  seo_title: string | null
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

interface RawAdminProject extends RawProject {
  created_at: string
  updated_at: string
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

interface RawAdminFriend extends RawFriend {
  created_at: string
  updated_at: string
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

interface RawAdminSiteSettings extends RawSiteSettings {
  created_at: string
  id: number
  updated_at: string
}

interface RawMusicTrack {
  artist: string
  display_order: number
  duration_seconds: number | null
  id: number
  source_url: string
  title: string
}

interface RawAdminMusicTrack {
  album: string | null
  artist: string
  artwork_alt: string | null
  artwork_url: string | null
  created_at: string
  display_order: number
  duration_seconds: number | null
  id: number
  is_enabled: boolean
  source_strategy: 'local_media' | 'remote_url' | 's3_media'
  source_url: string
  title: string
  updated_at: string
}

interface RawAdminMediaAsset {
  content_type: string
  created_at: string
  height: number | null
  id: number
  key: string
  media_kind: AdminMediaAsset['mediaKind']
  original_filename: string
  size_bytes: number
  storage_strategy: AdminMediaAsset['storageStrategy']
  url: string
  width: number | null
}

interface RawAdminMediaPolicy {
  accepted_audio_types: string[]
  accepted_image_types: string[]
  image_max_dimension: number
  image_max_pixels: number
  image_max_upload_bytes: number
  max_upload_bytes: number
}

interface RawAdminMediaReference {
  field: string
  resource_id: number
  resource_type: string
}

interface RawAdminMediaDeleteResult {
  bytes_missing?: boolean
  deleted: boolean
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
  createAdminFriend: (input: AdminFriendLinkInput) => Promise<AdminFriendLink>
  createAdminMusicTrack: (
    input: AdminMusicTrackInput,
  ) => Promise<AdminMusicTrack>
  createAdminProject: (input: AdminProjectInput) => Promise<AdminProject>
  adminMoments: AdminResourceApi<AdminMoment, AdminMomentInput>
  adminChatter: AdminResourceApi<AdminChatter, AdminChatterInput>
  getAdminDashboard: (signal?: AbortSignal) => Promise<AdminDashboard>
  getAdminFriend: (id: string, signal?: AbortSignal) => Promise<AdminFriendLink>
  getAdminMusicTrack: (
    id: string,
    signal?: AbortSignal,
  ) => Promise<AdminMusicTrack>
  getAdminMediaPolicy: (signal?: AbortSignal) => Promise<AdminMediaPolicy>
  getAdminMediaReferences: (
    id: string,
    signal?: AbortSignal,
  ) => Promise<AdminMediaReference[]>
  listAdminMedia: (
    query: AdminMediaQuery,
    signal?: AbortSignal,
  ) => Promise<AdminMediaCollection>
  uploadAdminMedia: (
    file: File,
    options?: { onProgress?: (ratio: number) => void },
  ) => Promise<AdminMediaAsset>
  deleteAdminMedia: (
    id: string,
    options?: { purgeMetadata?: boolean },
  ) => Promise<AdminMediaDeleteResult>
  getAdminProject: (id: string, signal?: AbortSignal) => Promise<AdminProject>
  getAdminSettings: (signal?: AbortSignal) => Promise<AdminSiteSettings>
  getAdminPost: (id: string, signal?: AbortSignal) => Promise<AdminPost>
  getCurrentUser: () => Promise<AdminUser>
  getPostBySlug: (
    slug: string,
    signal?: AbortSignal,
  ) => Promise<PostDetail | null>
  getAbout: (signal?: AbortSignal) => Promise<AboutProfile>
  getSettings: (signal?: AbortSignal) => Promise<PublicSiteSettings>
  login: (identifier: string, password: string) => Promise<AdminUser>
  logout: () => Promise<void>
  createAdminPost: (input: AdminPostInput) => Promise<AdminPost>
  updateAdminPost: (
    id: string,
    input: Partial<AdminPostInput>,
  ) => Promise<AdminPost>
  previewAdminPost: (
    id: string,
    input?: Partial<AdminPostInput>,
  ) => Promise<AdminPost>
  publishAdminPost: (id: string) => Promise<AdminPost>
  unpublishAdminPost: (id: string) => Promise<AdminPost>
  deleteAdminPost: (id: string) => Promise<void>
  listAdminPosts: (
    query: AdminPostQuery,
    signal?: AbortSignal,
  ) => Promise<AdminPostCollection>
  listAdminFriends: (
    query: AdminFriendLinkQuery,
    signal?: AbortSignal,
  ) => Promise<AdminFriendLinkCollection>
  listAdminMusicTracks: (signal?: AbortSignal) => Promise<AdminMusicTrack[]>
  listAdminProjects: (
    query: AdminProjectQuery,
    signal?: AbortSignal,
  ) => Promise<AdminProjectCollection>
  listAdminCategories: (signal?: AbortSignal) => Promise<AdminTaxonomy[]>
  listAdminTags: (signal?: AbortSignal) => Promise<AdminTaxonomy[]>
  createAdminCategory: (input: AdminTaxonomyInput) => Promise<AdminTaxonomy>
  updateAdminCategory: (
    id: string,
    input: Partial<AdminTaxonomyInput>,
  ) => Promise<AdminTaxonomy>
  deleteAdminCategory: (id: string) => Promise<void>
  createAdminTag: (input: AdminTaxonomyInput) => Promise<AdminTaxonomy>
  updateAdminTag: (
    id: string,
    input: Partial<AdminTaxonomyInput>,
  ) => Promise<AdminTaxonomy>
  deleteAdminTag: (id: string) => Promise<void>
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
  deleteAdminFriend: (id: string) => Promise<void>
  deleteAdminMusicTrack: (id: string) => Promise<void>
  deleteAdminProject: (id: string) => Promise<void>
  refreshSession: () => Promise<AdminUser>
  reorderAdminMusicTracks: (trackIds: string[]) => Promise<AdminMusicTrack[]>
  setAdminMusicTrackEnabled: (
    id: string,
    enabled: boolean,
  ) => Promise<AdminMusicTrack>
  updateAdminFriend: (
    id: string,
    input: Partial<AdminFriendLinkInput>,
  ) => Promise<AdminFriendLink>
  updateAdminMusicTrack: (
    id: string,
    input: Partial<AdminMusicTrackInput>,
  ) => Promise<AdminMusicTrack>
  updateAdminProject: (
    id: string,
    input: Partial<AdminProjectInput>,
  ) => Promise<AdminProject>
  updateAdminSettings: (
    input: Partial<AdminSiteSettingsInput>,
  ) => Promise<AdminSiteSettings>
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

const toAdminTaxonomy = (value: RawTaxonomy): AdminTaxonomy => ({
  ...(value.created_at ? { createdAt: value.created_at } : {}),
  id: String(value.id),
  name: value.name,
  postCount: value.post_count,
  slug: value.slug,
  ...(value.updated_at ? { updatedAt: value.updated_at } : {}),
})

const toAdminPost = (
  value: RawPost,
  resolveMediaUrl: MediaUrlResolver,
): AdminPost => ({
  body: value.body ?? '',
  canonicalUrl: value.canonical_url ?? undefined,
  category: value.category ? toAdminTaxonomy(value.category) : null,
  categoryId: value.category ? String(value.category.id) : undefined,
  coverAlt: value.cover_alt ?? undefined,
  coverUrl: value.cover_url ? resolveMediaUrl(value.cover_url) : undefined,
  createdAt: value.created_at,
  id: String(value.id),
  isPinned: value.is_pinned,
  ogImageUrl: value.og_image_url
    ? resolveMediaUrl(value.og_image_url)
    : undefined,
  publishedAt: value.published_at ?? undefined,
  readingCount: value.reading_count,
  readingTimeMinutes: value.reading_time_minutes,
  seoDescription: value.seo_description ?? undefined,
  seoTitle: value.seo_title ?? undefined,
  slug: value.slug,
  status: value.status === 'published' ? 'published' : 'draft',
  summary: value.summary,
  tagIds: value.tags.map((tag) => String(tag.id)),
  tags: value.tags.map(toAdminTaxonomy),
  title: value.title,
  updatedAt: value.updated_at,
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

const toAdminProject = (value: RawAdminProject): AdminProject => ({
  createdAt: value.created_at,
  demoUrl: value.demo_url,
  description: value.description,
  displayOrder: value.display_order,
  featured: value.featured,
  id: String(value.id),
  logoAlt: value.logo_alt,
  logoUrl: value.logo_url,
  name: value.name,
  sourceUrl: value.source_url,
  stack: value.technology,
  status: value.status,
  timeSpan: value.time_span,
  updatedAt: value.updated_at,
})

const toAdminFriend = (value: RawAdminFriend): AdminFriendLink => ({
  avatarAlt: value.avatar_alt,
  avatarUrl: value.avatar_url,
  createdAt: value.created_at,
  description: value.description,
  displayOrder: value.display_order,
  id: String(value.id),
  isActive: value.is_active,
  name: value.name,
  updatedAt: value.updated_at,
  url: value.url,
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

const toAdminSiteSettings = (
  value: RawAdminSiteSettings,
): AdminSiteSettings => ({
  ...toSiteSettings(value, (url) => url),
  createdAt: value.created_at,
  id: String(value.id),
  updatedAt: value.updated_at,
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

const toAdminMusicTrack = (
  value: RawAdminMusicTrack,
  resolveMediaUrl: MediaUrlResolver,
): AdminMusicTrack => ({
  album: value.album,
  artist: value.artist,
  artworkAlt: value.artwork_alt,
  artworkPreviewUrl: value.artwork_url
    ? resolveMediaUrl(value.artwork_url)
    : null,
  artworkUrl: value.artwork_url,
  createdAt: value.created_at,
  displayOrder: value.display_order,
  durationSeconds: value.duration_seconds,
  id: String(value.id),
  isEnabled: value.is_enabled,
  sourceStrategy: value.source_strategy,
  sourceUrl: value.source_url,
  title: value.title,
  updatedAt: value.updated_at,
})

const toAdminMediaAsset = (
  value: RawAdminMediaAsset,
  resolveMediaUrl: MediaUrlResolver,
): AdminMediaAsset => ({
  contentType: value.content_type,
  createdAt: value.created_at,
  height: value.height,
  id: String(value.id),
  key: value.key,
  mediaKind: value.media_kind,
  originalFilename: value.original_filename,
  reference: value.url,
  sizeBytes: value.size_bytes,
  storageStrategy: value.storage_strategy,
  url: resolveMediaUrl(value.url),
  width: value.width,
})

const toAdminMediaPolicy = (value: RawAdminMediaPolicy): AdminMediaPolicy => ({
  acceptedAudioTypes: value.accepted_audio_types,
  acceptedImageTypes: value.accepted_image_types,
  imageMaxDimension: value.image_max_dimension,
  imageMaxPixels: value.image_max_pixels,
  imageMaxUploadBytes: value.image_max_upload_bytes,
  maxUploadBytes: value.max_upload_bytes,
})

const toAdminMediaReference = (
  value: RawAdminMediaReference,
): AdminMediaReference => ({
  field: value.field,
  resourceId: value.resource_id,
  resourceType: value.resource_type,
})

const toAdminUser = (value: RawAdminUser): AdminUser => ({
  createdAt: value.created_at,
  ...(value.email ? { email: value.email } : {}),
  id: String(value.id),
  isActive: value.is_active,
  username: value.username,
})

const toAdminDashboard = (value: RawAdminDashboard): AdminDashboard => ({
  counts: {
    chatter: value.counts.chatter,
    draftPosts: value.counts.draft_posts,
    friends: value.counts.friends,
    moments: value.counts.moments,
    posts: value.counts.posts,
    projects: value.counts.projects,
    publishedPosts: value.counts.published_posts,
    totalReadingCount: value.counts.total_reading_count,
  },
  recentActivity: value.recent_activity.map((activity) => ({
    id: String(activity.id),
    status: activity.status,
    title: activity.title,
    type: activity.type,
    updatedAt: activity.updated_at,
  })),
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
      body?: Record<string, unknown>
      headers?: Record<string, string>
      method?: 'DELETE' | 'GET' | 'PATCH' | 'POST'
      query?: Record<string, string | number | undefined>
      signal?: AbortSignal
    } = {},
  ): Promise<T> => {
    try {
      return await $fetch<T>(path, {
        baseURL,
        body: options.body,
        credentials: 'include',
        headers: { ...serverHeaders, ...options.headers },
        method: options.method,
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

  const csrfToken = async () => {
    const response =
      await request<RawApiResponse<{ token: string }>>('/auth/csrf')
    return response.data.token
  }

  const mutateWithCsrf = async <T>(
    path: string,
    method: 'DELETE' | 'PATCH' | 'POST',
    body?: Record<string, unknown>,
  ) => {
    const token = await csrfToken()
    return request<T>(path, {
      body,
      headers: { 'X-CSRF-Token': token },
      method,
    })
  }

  const getCurrentUser = async () => {
    const response = await request<RawApiResponse<RawAdminUser>>('/auth/me')
    return toAdminUser(response.data)
  }

  const login = async (identifier: string, password: string) => {
    const response = await mutateWithCsrf<
      RawApiResponse<{ user: RawAdminUser }>
    >('/auth/login', 'POST', { identifier, password })
    return toAdminUser(response.data.user)
  }

  const refreshSession = async () => {
    const response = await mutateWithCsrf<
      RawApiResponse<{ user: RawAdminUser }>
    >('/auth/refresh', 'POST')
    return toAdminUser(response.data.user)
  }

  const logout = async () => {
    await mutateWithCsrf<RawApiResponse<{ logged_out: boolean }>>(
      '/auth/logout',
      'POST',
    )
  }

  const adminResource = <T, Input extends object>(
    resource: 'moments' | 'chatter',
  ): AdminResourceApi<T, Input> => {
    const path = `/admin/${resource}`
    const mutate = async (
      suffix: string,
      method: 'POST' | 'PATCH',
      input?: Input,
    ) => {
      const response = await mutateWithCsrf<RawApiResponse<T>>(
        `${path}${suffix}`,
        method,
        input ? Object.fromEntries(Object.entries(input)) : undefined,
      )
      clearNuxtData(
        (key) =>
          key.startsWith(`${resource}:`) ||
          key === `${resource}-tags` ||
          key === `homepage-${resource}`,
      )
      return response.data
    }
    return {
      list: async (query, signal) => {
        const response = await request<RawCollection<T>>(path, {
          query: { ...query, page_size: 10 },
          signal,
        })
        return {
          data: response.data,
          pagination: pagination(response.pagination),
        }
      },
      get: async (id, signal) =>
        (
          await request<RawApiResponse<T>>(
            `${path}/${encodeURIComponent(id)}`,
            { signal },
          )
        ).data,
      create: (input) => mutate('', 'POST', input),
      update: (id, input) =>
        mutate(`/${encodeURIComponent(id)}`, 'PATCH', input),
      publish: (id) => mutate(`/${encodeURIComponent(id)}/publish`, 'POST'),
      unpublish: (id) => mutate(`/${encodeURIComponent(id)}/unpublish`, 'POST'),
      delete: async (id) => {
        await mutateWithCsrf(`${path}/${encodeURIComponent(id)}`, 'DELETE')
        clearNuxtData(
          (key) =>
            key.startsWith(`${resource}:`) ||
            key === `${resource}-tags` ||
            key === `homepage-${resource}`,
        )
      },
    }
  }

  const clearPortfolioData = (...keys: string[]) => {
    clearNuxtData((key) => keys.includes(key))
  }

  const listAdminProjects = async (
    query: AdminProjectQuery,
    signal?: AbortSignal,
  ): Promise<AdminProjectCollection> => {
    const response = await request<RawCollection<RawAdminProject>>(
      '/admin/projects',
      {
        query: {
          page: query.page,
          page_size: query.pageSize,
          q: query.q,
          status: query.status,
        },
        signal,
      },
    )
    return {
      data: response.data.map(toAdminProject),
      pagination: pagination(response.pagination),
    }
  }

  const getAdminProject = async (id: string, signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawAdminProject>>(
      `/admin/projects/${encodeURIComponent(id)}`,
      { signal },
    )
    return toAdminProject(response.data)
  }

  const createAdminProject = async (input: AdminProjectInput) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminProject>>(
      '/admin/projects',
      'POST',
      Object.fromEntries(Object.entries(input)),
    )
    clearPortfolioData('public-projects', 'homepage-projects')
    return toAdminProject(response.data)
  }

  const updateAdminProject = async (
    id: string,
    input: Partial<AdminProjectInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminProject>>(
      `/admin/projects/${encodeURIComponent(id)}`,
      'PATCH',
      Object.fromEntries(Object.entries(input)),
    )
    clearPortfolioData('public-projects', 'homepage-projects')
    return toAdminProject(response.data)
  }

  const deleteAdminProject = async (id: string) => {
    await mutateWithCsrf<RawApiResponse<{ deleted: boolean }>>(
      `/admin/projects/${encodeURIComponent(id)}`,
      'DELETE',
    )
    clearPortfolioData('public-projects', 'homepage-projects')
  }

  const listAdminFriends = async (
    query: AdminFriendLinkQuery,
    signal?: AbortSignal,
  ): Promise<AdminFriendLinkCollection> => {
    const response = await request<RawCollection<RawAdminFriend>>(
      '/admin/friends',
      {
        query: {
          active:
            query.active === 'all'
              ? undefined
              : query.active === 'active'
                ? 'true'
                : 'false',
          page: query.page,
          page_size: query.pageSize,
          q: query.q,
        },
        signal,
      },
    )
    return {
      data: response.data.map(toAdminFriend),
      pagination: pagination(response.pagination),
    }
  }

  const getAdminFriend = async (id: string, signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawAdminFriend>>(
      `/admin/friends/${encodeURIComponent(id)}`,
      { signal },
    )
    return toAdminFriend(response.data)
  }

  const createAdminFriend = async (input: AdminFriendLinkInput) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminFriend>>(
      '/admin/friends',
      'POST',
      Object.fromEntries(Object.entries(input)),
    )
    clearPortfolioData('public-friends')
    return toAdminFriend(response.data)
  }

  const updateAdminFriend = async (
    id: string,
    input: Partial<AdminFriendLinkInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminFriend>>(
      `/admin/friends/${encodeURIComponent(id)}`,
      'PATCH',
      Object.fromEntries(Object.entries(input)),
    )
    clearPortfolioData('public-friends')
    return toAdminFriend(response.data)
  }

  const deleteAdminFriend = async (id: string) => {
    await mutateWithCsrf<RawApiResponse<{ deleted: boolean }>>(
      `/admin/friends/${encodeURIComponent(id)}`,
      'DELETE',
    )
    clearPortfolioData('public-friends')
  }

  const clearPublicMusicData = () => {
    clearNuxtData('public-music-tracks')
  }

  const listAdminMusicTracks = async (signal?: AbortSignal) => {
    const tracks: AdminMusicTrack[] = []
    let page = 1
    let totalPages = 1
    while (page <= totalPages) {
      const response = await request<RawCollection<RawAdminMusicTrack>>(
        '/admin/music-tracks',
        { query: { page, page_size: 100 }, signal },
      )
      totalPages = Math.max(1, response.pagination.total_pages)
      tracks.push(
        ...response.data.map((track) =>
          toAdminMusicTrack(track, resolveMediaUrl),
        ),
      )
      page += 1
    }
    return tracks
  }

  const getAdminMusicTrack = async (id: string, signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawAdminMusicTrack>>(
      `/admin/music-tracks/${encodeURIComponent(id)}`,
      { signal },
    )
    return toAdminMusicTrack(response.data, resolveMediaUrl)
  }

  const createAdminMusicTrack = async (input: AdminMusicTrackInput) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminMusicTrack>>(
      '/admin/music-tracks',
      'POST',
      Object.fromEntries(Object.entries(input)),
    )
    clearPublicMusicData()
    return toAdminMusicTrack(response.data, resolveMediaUrl)
  }

  const updateAdminMusicTrack = async (
    id: string,
    input: Partial<AdminMusicTrackInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminMusicTrack>>(
      `/admin/music-tracks/${encodeURIComponent(id)}`,
      'PATCH',
      Object.fromEntries(Object.entries(input)),
    )
    clearPublicMusicData()
    return toAdminMusicTrack(response.data, resolveMediaUrl)
  }

  const reorderAdminMusicTracks = async (trackIds: string[]) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminMusicTrack[]>>(
      '/admin/music-tracks/reorder',
      'POST',
      {
        track_ids: trackIds.map((id) => Number(id)),
      },
    )
    clearPublicMusicData()
    return response.data.map((track) =>
      toAdminMusicTrack(track, resolveMediaUrl),
    )
  }

  const setAdminMusicTrackEnabled = async (id: string, enabled: boolean) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminMusicTrack>>(
      `/admin/music-tracks/${encodeURIComponent(id)}/${enabled ? 'enable' : 'disable'}`,
      'POST',
    )
    clearPublicMusicData()
    return toAdminMusicTrack(response.data, resolveMediaUrl)
  }

  const deleteAdminMusicTrack = async (id: string) => {
    await mutateWithCsrf<RawApiResponse<{ deleted: boolean }>>(
      `/admin/music-tracks/${encodeURIComponent(id)}`,
      'DELETE',
    )
    clearPublicMusicData()
  }

  const listAdminMedia = async (
    query: AdminMediaQuery,
    signal?: AbortSignal,
  ): Promise<AdminMediaCollection> => {
    const response = await request<RawCollection<RawAdminMediaAsset>>(
      '/admin/media',
      {
        query: {
          kind: query.kind,
          page: query.page,
          page_size: query.pageSize,
        },
        signal,
      },
    )
    return {
      data: response.data.map((asset) =>
        toAdminMediaAsset(asset, resolveMediaUrl),
      ),
      pagination: pagination(response.pagination),
    }
  }

  const getAdminMediaPolicy = async (signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawAdminMediaPolicy>>(
      '/admin/media/policy',
      { signal },
    )
    return toAdminMediaPolicy(response.data)
  }

  const getAdminMediaReferences = async (id: string, signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawAdminMediaReference[]>>(
      `/admin/media/${encodeURIComponent(id)}/references`,
      { signal },
    )
    return response.data.map(toAdminMediaReference)
  }

  const uploadAdminMedia = async (
    file: File,
    options: { onProgress?: (ratio: number) => void } = {},
  ) => {
    const token = await csrfToken()
    const body = new FormData()
    body.append('file', file, file.name)
    const response = await uploadWithProgress<
      RawApiResponse<RawAdminMediaAsset>
    >({
      baseURL,
      body,
      headers: { 'X-CSRF-Token': token },
      onProgress: options.onProgress,
      path: '/admin/media',
    })
    return toAdminMediaAsset(response.data, resolveMediaUrl)
  }

  const deleteAdminMedia = async (
    id: string,
    options: { purgeMetadata?: boolean } = {},
  ) => {
    const purge = options.purgeMetadata ? '?purge_metadata=true' : ''
    const response = await mutateWithCsrf<
      RawApiResponse<RawAdminMediaDeleteResult>
    >(`/admin/media/${encodeURIComponent(id)}${purge}`, 'DELETE')
    return {
      bytesMissing: Boolean(response.data.bytes_missing),
      deleted: response.data.deleted,
    }
  }

  const getAdminSettings = async (signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawAdminSiteSettings>>(
      '/admin/settings',
      { signal },
    )
    return toAdminSiteSettings(response.data)
  }

  const updateAdminSettings = async (
    input: Partial<AdminSiteSettingsInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminSiteSettings>>(
      '/admin/settings',
      'PATCH',
      Object.fromEntries(Object.entries(input)),
    )
    clearPortfolioData('public-site-settings', 'public-about')
    return toAdminSiteSettings(response.data)
  }

  const getAdminDashboard = async (signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawAdminDashboard>>(
      '/admin/dashboard',
      { signal },
    )
    return toAdminDashboard(response.data)
  }

  const listAdminPosts = async (
    query: AdminPostQuery,
    signal?: AbortSignal,
  ): Promise<AdminPostCollection> => {
    const response = await request<RawCollection<RawPost>>('/admin/posts', {
      query: {
        category: query.category,
        page: query.page,
        page_size: query.pageSize,
        q: query.q,
        status: query.status,
        tag: query.tag,
      },
      signal,
    })
    return {
      data: response.data.map((post) => toAdminPost(post, resolveMediaUrl)),
      pagination: pagination(response.pagination),
    }
  }

  const getAdminPost = async (id: string, signal?: AbortSignal) => {
    const response = await request<RawApiResponse<RawPost>>(
      `/admin/posts/${encodeURIComponent(id)}`,
      { signal },
    )
    return toAdminPost(response.data, resolveMediaUrl)
  }

  const createAdminPost = async (input: AdminPostInput) => {
    const response = await mutateWithCsrf<RawApiResponse<RawPost>>(
      '/admin/posts',
      'POST',
      { ...input },
    )
    return toAdminPost(response.data, resolveMediaUrl)
  }

  const updateAdminPost = async (
    id: string,
    input: Partial<AdminPostInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawPost>>(
      `/admin/posts/${encodeURIComponent(id)}`,
      'PATCH',
      { ...input },
    )
    return toAdminPost(response.data, resolveMediaUrl)
  }

  const previewAdminPost = async (
    id: string,
    input?: Partial<AdminPostInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawPost>>(
      `/admin/posts/${encodeURIComponent(id)}/preview`,
      'POST',
      input ? Object.fromEntries(Object.entries(input)) : undefined,
    )
    return toAdminPost(response.data, resolveMediaUrl)
  }

  const publishAdminPost = async (id: string) => {
    const response = await mutateWithCsrf<RawApiResponse<RawPost>>(
      `/admin/posts/${encodeURIComponent(id)}/publish`,
      'POST',
    )
    return toAdminPost(response.data, resolveMediaUrl)
  }

  const unpublishAdminPost = async (id: string) => {
    const response = await mutateWithCsrf<RawApiResponse<RawPost>>(
      `/admin/posts/${encodeURIComponent(id)}/unpublish`,
      'POST',
    )
    return toAdminPost(response.data, resolveMediaUrl)
  }

  const deleteAdminPost = async (id: string) => {
    await mutateWithCsrf<RawApiResponse<{ deleted: boolean }>>(
      `/admin/posts/${encodeURIComponent(id)}`,
      'DELETE',
    )
  }

  const listAdminTaxonomy = async (
    path: '/admin/categories' | '/admin/tags',
    signal?: AbortSignal,
  ) => {
    const response = await request<{ data: RawTaxonomy[] }>(path, { signal })
    return response.data.map(toAdminTaxonomy)
  }

  const listAdminCategories = (signal?: AbortSignal) =>
    listAdminTaxonomy('/admin/categories', signal)

  const listAdminTags = (signal?: AbortSignal) =>
    listAdminTaxonomy('/admin/tags', signal)

  const createAdminTaxonomy = async (
    path: '/admin/categories' | '/admin/tags',
    input: AdminTaxonomyInput,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawTaxonomy>>(
      path,
      'POST',
      { ...input },
    )
    return toAdminTaxonomy(response.data)
  }

  const updateAdminTaxonomy = async (
    path: '/admin/categories' | '/admin/tags',
    id: string,
    input: Partial<AdminTaxonomyInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawTaxonomy>>(
      `${path}/${encodeURIComponent(id)}`,
      'PATCH',
      { ...input },
    )
    return toAdminTaxonomy(response.data)
  }

  const deleteAdminTaxonomy = async (
    path: '/admin/categories' | '/admin/tags',
    id: string,
  ) => {
    await mutateWithCsrf<RawApiResponse<{ deleted: boolean }>>(
      `${path}/${encodeURIComponent(id)}`,
      'DELETE',
    )
  }

  const createAdminCategory = (input: AdminTaxonomyInput) =>
    createAdminTaxonomy('/admin/categories', input)
  const updateAdminCategory = (
    id: string,
    input: Partial<AdminTaxonomyInput>,
  ) => updateAdminTaxonomy('/admin/categories', id, input)
  const deleteAdminCategory = (id: string) =>
    deleteAdminTaxonomy('/admin/categories', id)
  const createAdminTag = (input: AdminTaxonomyInput) =>
    createAdminTaxonomy('/admin/tags', input)
  const updateAdminTag = (id: string, input: Partial<AdminTaxonomyInput>) =>
    updateAdminTaxonomy('/admin/tags', id, input)
  const deleteAdminTag = (id: string) => deleteAdminTaxonomy('/admin/tags', id)

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
        ...(response.data.canonical_url
          ? { canonicalUrl: response.data.canonical_url }
          : {}),
        ...(response.data.og_image_url
          ? { ogImageUrl: resolveMediaUrl(response.data.og_image_url) }
          : {}),
        ...(response.data.seo_description
          ? { seoDescription: response.data.seo_description }
          : {}),
        ...(response.data.seo_title
          ? { seoTitle: response.data.seo_title }
          : {}),
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
    adminMoments: adminResource<AdminMoment, AdminMomentInput>('moments'),
    adminChatter: adminResource<AdminChatter, AdminChatterInput>('chatter'),
    createAdminFriend,
    createAdminMusicTrack,
    createAdminProject,
    createAdminCategory,
    createAdminPost,
    createAdminTag,
    deleteAdminCategory,
    deleteAdminFriend,
    deleteAdminMedia,
    deleteAdminMusicTrack,
    deleteAdminPost,
    deleteAdminProject,
    deleteAdminTag,
    getAdminDashboard,
    getAdminFriend,
    getAdminMediaPolicy,
    getAdminMediaReferences,
    getAdminMusicTrack,
    getAdminPost,
    getAdminProject,
    getAdminSettings,
    getCurrentUser,
    getAbout,
    getPostBySlug,
    getSettings,
    login,
    logout,
    listCategories,
    listAdminCategories,
    listAdminFriends,
    listAdminMedia,
    listAdminMusicTracks,
    listAdminPosts,
    listAdminProjects,
    listAdminTags,
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
    previewAdminPost,
    publishAdminPost,
    refreshSession,
    reorderAdminMusicTracks,
    setAdminMusicTrackEnabled,
    unpublishAdminPost,
    updateAdminCategory,
    updateAdminFriend,
    updateAdminMusicTrack,
    updateAdminPost,
    updateAdminProject,
    updateAdminSettings,
    updateAdminTag,
    uploadAdminMedia,
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

function uploadWithProgress<T>(options: {
  baseURL: string
  body: FormData
  headers: Record<string, string>
  onProgress?: (ratio: number) => void
  path: string
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${options.baseURL}${options.path}`)
    request.responseType = 'text'
    request.withCredentials = true
    for (const [name, value] of Object.entries(options.headers)) {
      request.setRequestHeader(name, value)
    }
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(Math.min(1, event.loaded / event.total))
      }
    })
    request.addEventListener('abort', () => {
      reject(new DOMException('Upload aborted', 'AbortError'))
    })
    request.addEventListener('error', () => {
      reject(
        new BlogApiError('网络连接中断，上传未完成，请重试。', { status: 0 }),
      )
    })
    request.addEventListener('load', () => {
      const payload = parseJson(request.responseText)
      if (
        request.status >= 200 &&
        request.status < 300 &&
        typeof payload === 'object' &&
        payload !== null
      ) {
        resolve(payload as T)
        return
      }
      reject(apiErrorFromPayload(request.status, payload))
    })
    request.send(options.body)
  })
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function apiErrorFromPayload(status: number, payload: unknown): BlogApiError {
  const envelope =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? ((payload as { error: unknown }).error as Record<string, unknown>)
      : undefined

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

function normalizeApiError(error: unknown): BlogApiError {
  if (error instanceof BlogApiError) {
    return error
  }

  const response =
    typeof error === 'object' && error !== null && 'response' in error
      ? (error.response as { _data?: unknown; status?: number } | undefined)
      : undefined
  const status = response?.status ?? getNumber(error, 'statusCode') ?? 0

  return apiErrorFromPayload(status, response?._data)
}

function getNumber(value: unknown, key: string) {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return undefined
  }
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'number' ? candidate : undefined
}
