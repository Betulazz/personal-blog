import type {
  AboutBannerFocalPoint,
  AboutSettings,
  AdminBackgroundGalleryImage,
  PublicSiteSettings,
  SiteSocialLink,
} from './site'

export type AdminProjectStatus = 'active' | 'archived' | 'developing'

interface AdminProjectBase {
  createdAt: string
  description: string
  displayOrder: number
  featured: boolean
  id: string
  logoAlt: string | null
  logoUrl: string | null
  name: string
  updatedAt: string
}

export interface AdminPersonalProject extends AdminProjectBase {
  demoUrl: string | null
  projectType: 'personal'
  sourceUrl: string | null
  stack: string[]
  status: AdminProjectStatus
  timeSpan: string
}

export interface AdminGithubOpenSourceProject extends AdminProjectBase {
  projectType: 'github_open_source'
  repositoryUrl: string
}

export type AdminProject = AdminPersonalProject | AdminGithubOpenSourceProject

interface AdminProjectInputBase {
  description: string
  display_order: number
  featured: boolean
  logo_alt: string | null
  logo_url: string | null
  name: string
}

export interface AdminPersonalProjectInput extends AdminProjectInputBase {
  demo_url: string | null
  project_type: 'personal'
  source_url: string | null
  status: AdminProjectStatus
  technology: string[]
  time_span: string
}

export interface AdminGithubOpenSourceProjectInput extends AdminProjectInputBase {
  project_type: 'github_open_source'
  repository_url: string
}

export type AdminProjectInput =
  AdminPersonalProjectInput | AdminGithubOpenSourceProjectInput

export interface AdminProjectQuery {
  page: number
  pageSize: number
  projectType?: 'personal' | 'github_open_source'
  q?: string
  status?: AdminProjectStatus
}

export interface AdminProjectCollection {
  data: AdminProject[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminFriendLink {
  avatarAlt: string | null
  avatarUrl: string | null
  createdAt: string
  description: string
  displayOrder: number
  id: string
  isActive: boolean
  name: string
  updatedAt: string
  url: string
}

export interface AdminFriendLinkInput {
  avatar_alt: string | null
  avatar_url: string | null
  description: string
  display_order: number
  is_active: boolean
  name: string
  url: string
}

export interface AdminFriendLinkQuery {
  active?: 'all' | 'active' | 'inactive'
  page: number
  pageSize: number
  q?: string
}

export interface AdminFriendLinkCollection {
  data: AdminFriendLink[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminSiteSettings extends Omit<
  PublicSiteSettings,
  'about' | 'backgroundGallery'
> {
  about: AdminAboutSettings
  backgroundGallery: AdminBackgroundGalleryImage[]
  createdAt: string
  id: string
  updatedAt: string
}

export interface AdminAboutSettings extends AboutSettings {
  bannerReference?: string
}

export interface AdminSiteSettingsInput {
  about?: Partial<AboutSettings> & {
    banner_focal_point?: AboutBannerFocalPoint
    banner_url?: string | null
  }
  avatar_alt: string | null
  avatar_url: string | null
  background_gallery: Array<{ alt: string; url: string }>
  contact: {
    email: string
    note: string
  }
  description: string
  favicon_url: string | null
  footer: {
    copyright: string
    icp: string
    note: string
  }
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
  social_links: SiteSocialLink[]
  tagline: string
}
