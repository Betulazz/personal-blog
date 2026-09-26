import type { SiteIdentityView, SiteSocialLink } from '~/types/site'

export type { SiteIdentityView as SiteIdentity, SiteSocialLink }

export const siteIdentity: SiteIdentityView = {
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
  { label: '音乐', href: '/music' },
  { label: '动态', href: '/moments' },
  { label: '杂谈', href: '/chatter' },
  { label: '项目', href: '/projects' },
  { label: '友链', href: '/friends' },
  { label: '关于', href: '/about' },
] as const
