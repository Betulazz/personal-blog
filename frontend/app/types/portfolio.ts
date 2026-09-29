import type { PublicCollectionPagination } from './public-content'
import type { SiteSocialLink } from './site'

export interface PortfolioMedia {
  alt: string
  height: number
  src: string
  width: number
}

export type ProjectStatus = 'active' | 'archived' | 'developing'

export interface PersonalProject {
  demoUrl?: string
  description: string
  featured: boolean
  id: string
  logo?: PortfolioMedia
  name: string
  highlights?: string[]
  projectType: 'personal'
  sourceUrl?: string
  stack: string[]
  status: ProjectStatus
  timeSpan: string
}

export interface GithubOpenSourceProject {
  description: string
  featured: boolean
  id: string
  logo?: PortfolioMedia
  name: string
  projectType: 'github_open_source'
  repositoryUrl: string
}

export type Project = PersonalProject | GithubOpenSourceProject
export type ProjectType = Project['projectType']

export interface ProjectListQuery {
  page?: number
  pageSize?: number
  projectType?: ProjectType
}

export interface ProjectCollectionResponse {
  data: Project[]
  pagination: PublicCollectionPagination
}

export interface FriendLink {
  avatar?: PortfolioMedia
  description: string
  id: string
  name: string
  tags?: string[]
  url: string
}

export interface FriendCollectionResponse {
  data: FriendLink[]
  pagination: PublicCollectionPagination
}

export interface AboutSkillGroup {
  items: string[]
  name: string
}

export interface AboutTimelineItem {
  description: string
  period: string
  title: string
}

export interface AboutProfile {
  avatar?: PortfolioMedia
  contact: {
    email: string
    note: string
  }
  interestsHeading: string
  interestsIntroduction: string
  interests: string[]
  name: string
  profile: string
  skillsHeading: string
  skillsIntroduction: string
  skills: AboutSkillGroup[]
  socialLinks: SiteSocialLink[]
  storyHeading: string
  storyIntroduction: string
  story: string[]
  tagline: string
  timelineHeading: string
  timelineIntroduction: string
  timeline: AboutTimelineItem[]
}

export interface PortfolioProvider {
  getAbout: (signal?: AbortSignal) => Promise<AboutProfile>
  listFriends: (signal?: AbortSignal) => Promise<FriendCollectionResponse>
  listProjects: (
    signal?: AbortSignal,
    query?: ProjectListQuery,
  ) => Promise<ProjectCollectionResponse>
}
