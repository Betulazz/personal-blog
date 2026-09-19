export interface SiteSocialLink {
  href: string
  kind: 'code' | 'social'
  label: string
}

export interface SiteIdentity {
  description: string
  footerNote: string
  name: string
  socialLinks: SiteSocialLink[]
  tagline: string
}

export const siteIdentity: SiteIdentity = {
  name: '夜航手记',
  tagline: '在夜色里，写下仍然发光的事',
  description: '关于技术、生活与缓慢生长的个人记录。',
  footerNote: '一个安静的个人出版空间。',
  socialLinks: [
    { href: 'https://github.com/', kind: 'code', label: 'GitHub' },
    { href: 'https://mastodon.social/', kind: 'social', label: 'Mastodon' },
  ],
}

export const publicNavigation = [
  { label: '首页', href: '/' },
  { label: '文章', href: '/posts' },
  { label: '动态', href: '/moments' },
  { label: '项目', href: '/projects' },
  { label: '关于', href: '/about' },
] as const
