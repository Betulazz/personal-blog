import type { AboutSettings, PublicSiteSettings, SiteSocialLink } from './site'

export type AdminProjectStatus = 'active' | 'archived' | 'developing'

export interface AdminProject {
  createdAt: string
  demoUrl: string | null
  description: string
  displayOrder: number
  featured: boolean
  id: string
  logoAlt: string | null
  logoUrl: string | null
  name: string
  sourceUrl: string | null
  stack: string[]
  status: AdminProjectStatus
  timeSpan: string
  updatedAt: string
}

export interface AdminProjectInput {
  demo_url: string | null
  description: string
  display_order: number
  featured: boolean
  logo_alt: string | null
  logo_url: string | null
  name: string
  source_url: string | null
  status: AdminProjectStatus
  technology: string[]
  time_span: string
}

export interface AdminProjectQuery {
  page: number
  pageSize: number
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

export interface AdminSiteSettings extends PublicSiteSettings {
  createdAt: string
  id: string
  updatedAt: string
}

export interface AdminSiteSettingsInput {
  about?: AboutSettings
  avatar_alt: string | null
  avatar_url: string | null
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
  seo_defaults: {
    canonical_url: string | null
    description: string
    keywords: string[]
    og_image_url: string | null
    title: string
    twitter_card: 'summary' | 'summary_large_image'
  }
  social_links: SiteSocialLink[]
  tagline: string
}
