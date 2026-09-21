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

export interface PublicSiteSettings {
  avatarAlt?: string
  avatarUrl?: string
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
  seoDefaults: {
    canonicalUrl?: string
    description: string
    keywords: string[]
    ogImageUrl?: string
    title: string
    twitterCard: 'summary' | 'summary_large_image'
  }
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
