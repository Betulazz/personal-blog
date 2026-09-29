export interface SiteSocialLink {
  href: string
  kind: 'code' | 'social'
  label: string
}

export interface HomepageVisibility {
  chatter: boolean
  friends: boolean
  music: boolean
  moments: boolean
  posts: boolean
  projects: boolean
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

export interface AboutSettings {
  interestsHeading: string
  interestsIntroduction: string
  interests: string[]
  skillsHeading: string
  skillsIntroduction: string
  skills: AboutSkillGroup[]
  storyHeading: string
  storyIntroduction: string
  story: string[]
  timelineHeading: string
  timelineIntroduction: string
  timeline: AboutTimelineItem[]
}

export interface BackgroundGalleryImage {
  alt: string
  url: string
}

export interface AdminBackgroundGalleryImage extends BackgroundGalleryImage {
  reference: string
}

export interface PublicSiteSettings {
  avatarAlt?: string
  avatarUrl?: string
  about: AboutSettings
  backgroundGallery: BackgroundGalleryImage[]
  contact: {
    email: string
    note: string
  }
  description: string
  faviconUrl?: string
  footer: {
    copyright: string
    icp: string
    note: string
  }
  homepageVisibility: HomepageVisibility
  name: string
  profile: string
  socialLinks: SiteSocialLink[]
  tagline: string
}

export interface SiteIdentityView {
  description: string
  footerNote: string
  name: string
  socialLinks: SiteSocialLink[]
  tagline: string
}
