export interface AdminUser {
  createdAt: string
  email?: string
  id: string
  isActive: boolean
  username: string
}

export interface AdminDashboardCounts {
  chatter: number
  draftPosts: number
  friends: number
  moments: number
  posts: number
  projects: number
  publishedPosts: number
  totalReadingCount: number
}

export type AdminActivityType =
  'chatter' | 'friend' | 'moment' | 'post' | 'project'

export interface AdminRecentActivity {
  id: string
  status: string
  title: string
  type: AdminActivityType
  updatedAt: string
}

export interface AdminDashboard {
  counts: AdminDashboardCounts
  recentActivity: AdminRecentActivity[]
}

export interface AdminTaxonomy {
  createdAt?: string
  id: string
  name: string
  postCount: number
  slug: string
  updatedAt?: string
}

export interface AdminPost {
  body: string
  canonicalUrl?: string
  category: AdminTaxonomy | null
  categoryId?: string
  coverAlt?: string
  coverUrl?: string
  createdAt: string
  id: string
  isPinned: boolean
  ogImageUrl?: string
  publishedAt?: string
  readingCount: number
  readingTimeMinutes: number
  seoDescription?: string
  seoTitle?: string
  slug: string
  status: 'draft' | 'published'
  summary: string
  tagIds: string[]
  tags: AdminTaxonomy[]
  title: string
  updatedAt: string
}

export interface AdminPostQuery {
  category?: string
  page: number
  pageSize: number
  q?: string
  status?: 'draft' | 'published'
  tag?: string
}

export interface AdminPostCollection {
  data: AdminPost[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminPostInput {
  body: string
  canonical_url?: string | null
  category_id?: number | null
  cover_alt?: string | null
  cover_url?: string | null
  is_pinned?: boolean
  og_image_url?: string | null
  reading_time_minutes?: number
  seo_description?: string | null
  seo_title?: string | null
  slug: string
  summary: string
  tag_ids?: number[]
  title: string
}

export interface AdminTaxonomyInput {
  name: string
  slug: string
}
