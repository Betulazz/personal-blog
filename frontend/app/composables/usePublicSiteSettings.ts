import { computed } from 'vue'

import { toPublicSiteIdentity, useApiClient } from '~/api/client'
import { siteIdentity } from '~/config/siteIdentity'
import type { PublicSiteSettings, SiteIdentityView } from '~/types/site'

const fallbackSettings: PublicSiteSettings = {
  about: {
    interests: [],
    skills: [],
    story: [],
    timeline: [],
  },
  contact: { email: '', note: '' },
  description: siteIdentity.description,
  footer: { copyright: '', icp: '', note: siteIdentity.footerNote },
  homepageVisibility: {
    chatter: true,
    friends: true,
    music: true,
    moments: true,
    posts: true,
    projects: true,
  },
  name: siteIdentity.name,
  profile: '',
  seoDefaults: {
    description: siteIdentity.description,
    keywords: [],
    title: siteIdentity.name,
    twitterCard: 'summary',
  },
  socialLinks: siteIdentity.socialLinks,
  tagline: siteIdentity.tagline,
}

export async function usePublicSiteSettings() {
  const client = useApiClient()
  const result = await useAsyncData<PublicSiteSettings>(
    'public-site-settings',
    (_nuxtApp, { signal }) => client.getSettings(signal),
    {
      deep: false,
      default: () => fallbackSettings,
    },
  )

  const settings = computed(() => result.data.value ?? fallbackSettings)
  const identity = computed<SiteIdentityView>(() =>
    toPublicSiteIdentity(settings.value),
  )

  return {
    ...result,
    identity,
    settings,
  }
}
