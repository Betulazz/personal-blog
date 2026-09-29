import type { TimelineCollectionResponse } from '~/types/timeline'
import type {
  AdminChatter,
  AdminChatterInput,
  AdminResourceApi,
} from '~/types/admin-notes'
import type {
  AdminMusicTrack,
  AdminMusicTrackInput,
  AdminMusicTrackUpdateInput,
} from '~/types/admin-music'
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
  HomepagePost,
  HomepageProject,
} from '~/types/homepage'
import type {
  MusicLyrics,
  MusicTrack,
  MusicTrackCollectionResponse,
  MusicTrackPlaybackResolution,
  MusicTrackPreview,
} from '~/types/music'
import type {
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
  ProjectListQuery,
} from '~/types/portfolio'
import type {
  PublicCollectionPagination,
  PublicFeedQuery,
} from '~/types/public-content'
import type {
  AboutSettings,
  PublicSiteSettings,
  SiteIdentityView,
} from '~/types/site'
import {
  DEFAULT_ABOUT_INTERESTS_HEADING,
  DEFAULT_ABOUT_INTERESTS_INTRODUCTION,
  DEFAULT_ABOUT_SKILLS_HEADING,
  DEFAULT_ABOUT_SKILLS_INTRODUCTION,
  DEFAULT_ABOUT_STORY_HEADING,
  DEFAULT_ABOUT_STORY_INTRODUCTION,
  DEFAULT_ABOUT_TIMELINE_HEADING,
  DEFAULT_ABOUT_TIMELINE_INTRODUCTION,
} from '~/utils/about-content'

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
    posts: number
    projects: number
    published_posts: number
    total_reading_count: number
  }
  recent_activity: Array<{
    id: number
    status: string | null
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

interface RawProjectBase {
  description: string
  display_order: number
  featured: boolean
  id: number
  logo_alt: string | null
  logo_url: string | null
  name: string
}

interface RawPersonalProject extends RawProjectBase {
  project_type: 'personal'
  demo_url: string | null
  source_url: string | null
  status: 'active' | 'archived' | 'developing'
  technology: string[]
  time_span: string
}

interface RawGithubOpenSourceProject extends RawProjectBase {
  project_type: 'github_open_source'
  repository_url: string
}

type RawProject = RawPersonalProject | RawGithubOpenSourceProject
type RawAdminProject = RawProject & {
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
    banner_focal_point?: { x: number; y: number }
    banner_url?: string | null
    interests_heading?: string
    interests_introduction?: string
    interests: string[]
    skills_heading?: string
    skills_introduction?: string
    skills: AboutSkillGroup[]
    story_heading?: string
    story_introduction?: string
    story: string[]
    timeline_heading?: string
    timeline_introduction?: string
    timeline: AboutTimelineItem[]
  }
  background_gallery: Array<{ alt: string; url: string }>
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
  album: string | null
  artist: string
  artwork_alt: string | null
  artwork_url: string | null
  display_order: number
  duration_seconds: number | null
  id: number
  netease_song_id: string
  provider_url: string
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
  netease_song_id: string
  provider_url: string
  title: string
  updated_at: string
}

interface RawMusicTrackPreview {
  album: string | null
  already_added: boolean
  artist: string
  artwork_url: string | null
  duration_seconds: number | null
  netease_song_id: string
  provider_url: string
  title: string
}

interface RawMusicTrackPlayback {
  media_url: string
  netease_song_id: string
  provider_url: string
  track_id: number
}

interface RawMusicLyrics {
  lines: Array<{ text: string; time_ms: number; translation: string | null }>
  status: 'available' | 'missing'
  track_id: number
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

interface RawChatter {
  body: string
  id: number
  images: Array<{ alt: string; height: number; src: string; width: number }>
  mood: string | null
  published_at: string
  title: string | null
}

interface RawFeedCollection<T> extends RawCollection<T> {
  filters: Record<string, string>
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
  listTimeline: (
    query: PublicFeedQuery,
    signal?: AbortSignal,
  ) => Promise<TimelineCollectionResponse>
  createAdminFriend: (input: AdminFriendLinkInput) => Promise<AdminFriendLink>
  createAdminMusicTrack: (
    input: AdminMusicTrackInput,
  ) => Promise<AdminMusicTrack>
  previewAdminMusicTrack: (songId: string) => Promise<MusicTrackPreview>
  createAdminProject: (input: AdminProjectInput) => Promise<AdminProject>
  adminChatter: AdminResourceApi<AdminChatter, AdminChatterInput>
  getAdminDashboard: (signal?: AbortSignal) => Promise<AdminDashboard>
  getAdminFriend: (id: string, signal?: AbortSignal) => Promise<AdminFriendLink>
  getAdminMusicTrack: (
    id: string,
    signal?: AbortSignal,
  ) => Promise<AdminMusicTrack>
  getMusicTrackLyrics: (
    id: string,
    signal?: AbortSignal,
  ) => Promise<MusicLyrics>
  getMusicTrackPlayback: (
    id: string,
    signal?: AbortSignal,
  ) => Promise<MusicTrackPlaybackResolution>
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
  listAdminTags: (signal?: AbortSignal) => Promise<AdminTaxonomy[]>
  createAdminTag: (input: AdminTaxonomyInput) => Promise<AdminTaxonomy>
  updateAdminTag: (
    id: string,
    input: Partial<AdminTaxonomyInput>,
  ) => Promise<AdminTaxonomy>
  deleteAdminTag: (id: string) => Promise<void>
  listChatter: (
    query: PublicFeedQuery,
    signal?: AbortSignal,
  ) => Promise<ChatterCollectionResponse>
  listFriends: (signal?: AbortSignal) => Promise<FriendCollectionResponse>
  listHomepageChatter: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageChatter>>
  listHomepagePosts: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepagePost>>
  listHomepageProjects: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageProject>>
  listMusicTracks: (
    signal?: AbortSignal,
  ) => Promise<MusicTrackCollectionResponse>
  listPosts: (
    query: PostQuery,
    signal?: AbortSignal,
  ) => Promise<PostCollectionResponse>
  listProjects: (
    signal?: AbortSignal,
    query?: ProjectListQuery,
  ) => Promise<ProjectCollectionResponse>
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
    input: Partial<AdminMusicTrackUpdateInput>,
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
  coverAlt: value.cover_alt ?? undefined,
  coverUrl: value.cover_url ? resolveMediaUrl(value.cover_url) : undefined,
  createdAt: value.created_at,
  id: String(value.id),
  isPinned: value.is_pinned,
  publishedAt: value.published_at ?? undefined,
  readingCount: value.reading_count,
  readingTimeMinutes: value.reading_time_minutes,
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
): Project => {
  const shared = {
    description: value.description,
    featured: value.featured,
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
  }
  if (value.project_type === 'github_open_source') {
    return {
      ...shared,
      projectType: 'github_open_source',
      repositoryUrl: value.repository_url,
    }
  }
  return {
    ...shared,
    demoUrl: value.demo_url ?? undefined,
    projectType: 'personal',
    sourceUrl: value.source_url ?? undefined,
    stack: value.technology,
    status: value.status,
    timeSpan: value.time_span,
  }
}

const toAdminProject = (value: RawAdminProject): AdminProject => {
  const shared = {
    createdAt: value.created_at,
    description: value.description,
    displayOrder: value.display_order,
    featured: value.featured,
    id: String(value.id),
    logoAlt: value.logo_alt,
    logoUrl: value.logo_url,
    name: value.name,
    updatedAt: value.updated_at,
  }
  if (value.project_type === 'github_open_source') {
    return {
      ...shared,
      projectType: 'github_open_source',
      repositoryUrl: value.repository_url,
    }
  }
  return {
    ...shared,
    demoUrl: value.demo_url,
    projectType: 'personal',
    sourceUrl: value.source_url,
    stack: value.technology,
    status: value.status,
    timeSpan: value.time_span,
  }
}

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

const toChatter = (
  value: RawChatter,
  resolveMediaUrl: MediaUrlResolver,
): Chatter => ({
  body: value.body,
  id: String(value.id),
  mood: value.mood ?? undefined,
  publishedAt: value.published_at,
  title: value.title ?? undefined,
  images: value.images.map((image) => ({
    ...image,
    src: resolveMediaUrl(image.src),
  })),
})

const toSiteSettings = (
  value: RawSiteSettings,
  resolveMediaUrl: MediaUrlResolver,
): PublicSiteSettings => ({
  about: toAboutSettings(value.about, resolveMediaUrl),
  backgroundGallery: value.background_gallery.map((image) => ({
    alt: image.alt,
    url: resolveMediaUrl(image.url),
  })),
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
  socialLinks: value.social_links,
  tagline: value.tagline,
})

const toAboutSettings = (
  value: RawSiteSettings['about'],
  resolveMediaUrl: MediaUrlResolver,
): AboutSettings => ({
  bannerFocalPoint: value.banner_focal_point ?? { x: 50, y: 50 },
  ...(value.banner_url ? { bannerUrl: resolveMediaUrl(value.banner_url) } : {}),
  interestsHeading:
    value.interests_heading?.trim() || DEFAULT_ABOUT_INTERESTS_HEADING,
  interestsIntroduction:
    value.interests_introduction ?? DEFAULT_ABOUT_INTERESTS_INTRODUCTION,
  interests: value.interests ?? [],
  skillsHeading: value.skills_heading?.trim() || DEFAULT_ABOUT_SKILLS_HEADING,
  skillsIntroduction:
    value.skills_introduction ?? DEFAULT_ABOUT_SKILLS_INTRODUCTION,
  skills: value.skills ?? [],
  storyHeading: value.story_heading?.trim() || DEFAULT_ABOUT_STORY_HEADING,
  storyIntroduction:
    value.story_introduction ?? DEFAULT_ABOUT_STORY_INTRODUCTION,
  story: value.story ?? [],
  timelineHeading:
    value.timeline_heading?.trim() || DEFAULT_ABOUT_TIMELINE_HEADING,
  timelineIntroduction:
    value.timeline_introduction ?? DEFAULT_ABOUT_TIMELINE_INTRODUCTION,
  timeline: value.timeline ?? [],
})

const toAdminSiteSettings = (
  value: RawAdminSiteSettings,
  resolveMediaUrl: MediaUrlResolver,
): AdminSiteSettings => {
  const settings = toSiteSettings(value, resolveMediaUrl)
  return {
    ...settings,
    about: {
      ...settings.about,
      ...(value.about.banner_url
        ? { bannerReference: value.about.banner_url }
        : {}),
    },
    backgroundGallery: value.background_gallery.map((image) => ({
      alt: image.alt,
      reference: image.url,
      url: resolveMediaUrl(image.url),
    })),
    createdAt: value.created_at,
    id: String(value.id),
    updatedAt: value.updated_at,
  }
}

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
  ...(value.about.bannerUrl
    ? {
        banner: {
          focalPoint: value.about.bannerFocalPoint,
          src: value.about.bannerUrl,
        },
      }
    : {}),
  avatar: avatarUrl
    ? {
        alt: value.avatarAlt || `${value.name}头像`,
        height: 240,
        src: avatarUrl,
        width: 240,
      }
    : undefined,
  contact: value.contact,
  interestsHeading: value.about.interestsHeading,
  interestsIntroduction: value.about.interestsIntroduction,
  interests: value.about.interests,
  name: value.name,
  profile: value.profile || value.description,
  skillsHeading: value.about.skillsHeading,
  skillsIntroduction: value.about.skillsIntroduction,
  skills: value.about.skills,
  socialLinks: value.socialLinks,
  storyHeading: value.about.storyHeading,
  storyIntroduction: value.about.storyIntroduction,
  story: value.about.story,
  tagline: value.tagline,
  timelineHeading: value.about.timelineHeading,
  timelineIntroduction: value.about.timelineIntroduction,
  timeline: value.about.timeline,
})

const toTrack = (
  value: RawMusicTrack,
  resolveMediaUrl: MediaUrlResolver,
): MusicTrack => ({
  album: value.album,
  artist: value.artist,
  artworkAlt: value.artwork_alt,
  artworkUrl: value.artwork_url ? resolveMediaUrl(value.artwork_url) : null,
  durationSeconds: value.duration_seconds,
  id: String(value.id),
  neteaseSongId: value.netease_song_id,
  providerUrl: value.provider_url,
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
  neteaseSongId: value.netease_song_id,
  providerUrl: value.provider_url,
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
      return (await $fetch<T>(path, {
        baseURL,
        body: options.body,
        credentials: 'include',
        headers: { ...serverHeaders, ...options.headers },
        method: options.method,
        query: options.query,
        signal: options.signal,
      })) as T
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
    resource: 'chatter',
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
          project_type: query.projectType,
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

  const previewAdminMusicTrack = async (songId: string) => {
    const response = await mutateWithCsrf<RawApiResponse<RawMusicTrackPreview>>(
      '/admin/music-tracks/preview',
      'POST',
      { netease_song_id: songId },
    )
    return {
      album: response.data.album,
      alreadyAdded: response.data.already_added,
      artist: response.data.artist,
      artworkUrl: response.data.artwork_url
        ? resolveMediaUrl(response.data.artwork_url)
        : null,
      durationSeconds: response.data.duration_seconds,
      neteaseSongId: response.data.netease_song_id,
      providerUrl: response.data.provider_url,
      title: response.data.title,
    }
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
    input: Partial<AdminMusicTrackUpdateInput>,
  ) => {
    const response = await mutateWithCsrf<RawApiResponse<RawAdminMusicTrack>>(
      `/admin/music-tracks/${encodeURIComponent(id)}`,
      'PATCH',
      Object.fromEntries(Object.entries(input)),
    )
    clearPublicMusicData()
    return toAdminMusicTrack(response.data, resolveMediaUrl)
  }

  const getMusicTrackPlayback = async (
    id: string,
    signal?: AbortSignal,
  ): Promise<MusicTrackPlaybackResolution> => {
    const response = await request<RawApiResponse<RawMusicTrackPlayback>>(
      `/music-tracks/${encodeURIComponent(id)}/playback`,
      { signal },
    )
    return {
      mediaUrl: response.data.media_url,
      providerUrl: response.data.provider_url,
      songId: response.data.netease_song_id,
      trackId: String(response.data.track_id),
    }
  }

  const getMusicTrackLyrics = async (
    id: string,
    signal?: AbortSignal,
  ): Promise<MusicLyrics> => {
    const response = await request<RawApiResponse<RawMusicLyrics>>(
      `/music-tracks/${encodeURIComponent(id)}/lyrics`,
      { signal },
    )
    return {
      lines: response.data.lines.map((line) => ({
        text: line.text,
        timeMs: line.time_ms,
        translation: line.translation,
      })),
      status: response.data.status,
      trackId: String(response.data.track_id),
    }
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
    return toAdminSiteSettings(response.data, resolveMediaUrl)
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
    return toAdminSiteSettings(response.data, resolveMediaUrl)
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
    path: '/admin/tags',
    signal?: AbortSignal,
  ) => {
    const response = await request<{ data: RawTaxonomy[] }>(path, { signal })
    return response.data.map(toAdminTaxonomy)
  }

  const listAdminTags = (signal?: AbortSignal) =>
    listAdminTaxonomy('/admin/tags', signal)

  const createAdminTaxonomy = async (
    path: '/admin/tags',
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
    path: '/admin/tags',
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

  const deleteAdminTaxonomy = async (path: '/admin/tags', id: string) => {
    await mutateWithCsrf<RawApiResponse<{ deleted: boolean }>>(
      `${path}/${encodeURIComponent(id)}`,
      'DELETE',
    )
  }

  const createAdminTag = (input: AdminTaxonomyInput) =>
    createAdminTaxonomy('/admin/tags', input)
  const updateAdminTag = (id: string, input: Partial<AdminTaxonomyInput>) =>
    updateAdminTaxonomy('/admin/tags', id, input)
  const deleteAdminTag = (id: string) => deleteAdminTaxonomy('/admin/tags', id)

  const listPosts = async (query: PostQuery, signal?: AbortSignal) => {
    const response = await request<RawPostCollection>('/posts', {
      query: {
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

  const listAllTaxonomy = async (path: '/tags', signal?: AbortSignal) => {
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

  const listTags = async (signal?: AbortSignal) => {
    const response = await listAllTaxonomy('/tags', signal)
    return {
      data: response.data,
      pagination: response.pagination,
    }
  }

  const listTimeline = async (
    query: PublicFeedQuery,
    signal?: AbortSignal,
  ): Promise<TimelineCollectionResponse> => {
    const response = await request<
      RawFeedCollection<
        | { kind: 'post'; content: RawPost }
        | { kind: 'chatter'; content: RawChatter }
      >
    >('/moments', {
      query: { page: query.page, page_size: query.pageSize, q: query.q },
      signal,
    })
    return {
      data: response.data.map((entry) =>
        entry.kind === 'post'
          ? {
              kind: 'post',
              content: toPostSummary(entry.content, resolveMediaUrl),
            }
          : {
              kind: 'chatter',
              content: toChatter(entry.content, resolveMediaUrl),
            },
      ),
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
        entry: query.entry,
      },
      signal,
    })
    return {
      data: response.data.map((value) => toChatter(value, resolveMediaUrl)),
      filters: response.filters,
      pagination: pagination(response.pagination),
    }
  }

  const listHomepagePosts = async (signal?: AbortSignal) => {
    const response = await listPosts({ page: 1, pageSize: 3 }, signal)
    return {
      data: response.data.map((post) => ({
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

  const listProjects = async (
    signal?: AbortSignal,
    query?: ProjectListQuery,
  ) => {
    const response = await request<RawCollection<RawProject>>('/projects', {
      query: {
        page: query?.page ?? 1,
        page_size: query?.pageSize ?? 100,
        ...(query?.projectType ? { project_type: query.projectType } : {}),
      },
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
      .map((project) =>
        project.projectType === 'github_open_source'
          ? {
              description: project.description,
              id: project.id,
              name: project.name,
              projectType: 'github_open_source' as const,
              repositoryUrl: project.repositoryUrl,
              selected: project.featured,
            }
          : {
              demoUrl: project.demoUrl,
              description: project.description,
              id: project.id,
              name: project.name,
              projectType: 'personal' as const,
              selected: project.featured,
              sourceUrl: project.sourceUrl,
              stack: project.stack,
              status: project.status,
            },
      )
    return {
      data,
      pagination: {
        ...response.pagination,
        total: data.length,
        totalPages: data.length ? 1 : 0,
      },
    }
  }

  const listHomepageChatter = async (signal?: AbortSignal) => {
    const response = await listChatter({ page: 1, pageSize: 3 }, signal)
    return {
      data: response.data.map((chatter) => ({
        id: chatter.id,
        ...(chatter.mood ? { mood: chatter.mood } : {}),
        body: chatter.body,
        publishedAt: chatter.publishedAt,
        title: chatter.title,
        images: chatter.images,
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
    adminChatter: adminResource<AdminChatter, AdminChatterInput>('chatter'),
    createAdminFriend,
    createAdminMusicTrack,
    createAdminProject,
    createAdminPost,
    createAdminTag,
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
    listAdminFriends,
    listAdminMedia,
    listAdminMusicTracks,
    listAdminPosts,
    listAdminProjects,
    listAdminTags,
    listChatter,
    listTimeline,
    listFriends,
    listHomepageChatter,
    listHomepagePosts,
    listHomepageProjects,
    listMusicTracks,
    getMusicTrackLyrics,
    getMusicTrackPlayback,
    listPosts,
    listProjects,
    listTags,
    previewAdminPost,
    previewAdminMusicTrack,
    publishAdminPost,
    refreshSession,
    reorderAdminMusicTracks,
    setAdminMusicTrackEnabled,
    unpublishAdminPost,
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
