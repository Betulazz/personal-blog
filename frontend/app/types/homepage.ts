export type HomepageSectionStatus =
  'empty' | 'error' | 'loading' | 'partial-error' | 'ready'

export interface HomepageSectionError {
  message: string
}

export interface HomepageSection<T> {
  error?: HomepageSectionError
  items: T[]
  status: HomepageSectionStatus
}

export interface HomepagePagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface HomepageCollectionResponse<T> {
  data: T[]
  pagination: HomepagePagination
}

export interface HomepageCover {
  alt: string
  height: number
  src: string
  width: number
}

export interface HomepagePost {
  cover?: HomepageCover
  id: string
  publishedAt: string
  readingTimeMinutes: number
  slug: string
  summary: string
  tags: string[]
  title: string
}

export type HomepageChatter = import('./chatter').Chatter

export type HomepageProjectStatus = 'active' | 'archived' | 'developing'

interface HomepageProjectBase {
  description: string
  id: string
  name: string
  selected: boolean
}

export interface HomepagePersonalProject extends HomepageProjectBase {
  demoUrl?: string
  projectType: 'personal'
  sourceUrl?: string
  stack: string[]
  status: HomepageProjectStatus
}

export interface HomepageGithubOpenSourceProject extends HomepageProjectBase {
  projectType: 'github_open_source'
  repositoryUrl: string
}

export type HomepageProject =
  HomepagePersonalProject | HomepageGithubOpenSourceProject

export interface HomepageStat {
  detail: string
  label: string
  value: string
}

export interface HomepageContent {
  chatter: HomepageSection<HomepageChatter>
  posts: HomepageSection<HomepagePost>
  projects: HomepageSection<HomepageProject>
  stats: HomepageStat[]
}

export type HomepageSectionKey = keyof Pick<
  HomepageContent,
  'chatter' | 'posts' | 'projects'
>
