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
