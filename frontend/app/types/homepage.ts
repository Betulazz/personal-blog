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
  category: {
    name: string
    slug: string
  }
  cover?: HomepageCover
  id: string
  publishedAt: string
  readingTimeMinutes: number
  slug: string
  summary: string
  tags: string[]
  title: string
}

export interface HomepageMoment {
  body: string
  id: string
  location?: string
  mood?: string
  publishedAt: string
  tags: string[]
}

export interface HomepageChatter {
  id: string
  lead: string
  mood?: string
  publishedAt: string
  tags: string[]
  title: string
}

export type HomepageProjectStatus = 'active' | 'archived' | 'developing'

export interface HomepageProject {
  demoUrl?: string
  description: string
  githubUrl?: string
  id: string
  name: string
  selected: boolean
  stack: string[]
  status: HomepageProjectStatus
}

export interface HomepageStat {
  detail: string
  label: string
  value: string
}

export interface HomepageContent {
  chatter: HomepageSection<HomepageChatter>
  moments: HomepageSection<HomepageMoment>
  posts: HomepageSection<HomepagePost>
  projects: HomepageSection<HomepageProject>
  stats: HomepageStat[]
}

export interface HomepageFixtureContent {
  chatter: HomepageCollectionResponse<HomepageChatter>
  moments: HomepageCollectionResponse<HomepageMoment>
  posts: HomepageCollectionResponse<HomepagePost>
  projects: HomepageCollectionResponse<HomepageProject>
  stats: HomepageStat[]
}

export type HomepageSectionKey = keyof Pick<
  HomepageContent,
  'chatter' | 'moments' | 'posts' | 'projects'
>
