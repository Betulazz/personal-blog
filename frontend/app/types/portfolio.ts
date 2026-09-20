import type { SiteSocialLink } from '../config/siteIdentity'

export interface PortfolioMedia {
  alt: string
  height: number
  src: string
  width: number
}

export type ProjectStatus = 'active' | 'archived' | 'developing'

export interface Project {
  demoUrl?: string
  description: string
  featured: boolean
  githubUrl?: string
  id: string
  logo?: PortfolioMedia
  name: string
  highlights?: string[]
  sourceUrl?: string
  stack: string[]
  status: ProjectStatus
  timeSpan: string
}

export interface ProjectCollectionResponse {
  data: Project[]
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
  contact: {
    email: string
    note: string
  }
  interests: string[]
  name: string
  profile: string
  skills: AboutSkillGroup[]
  socialLinks: SiteSocialLink[]
  story: string[]
  tagline: string
  timeline: AboutTimelineItem[]
}

export interface PortfolioProvider {
  getAbout: () => Promise<AboutProfile>
  listFriends: () => Promise<FriendCollectionResponse>
  listProjects: () => Promise<ProjectCollectionResponse>
}
