import { computed } from 'vue'

import { toPublicSiteIdentity, useApiClient } from '~/api/client'
import { siteIdentity } from '~/config/siteIdentity'
import type { PublicSiteSettings, SiteIdentityView } from '~/types/site'
import {
  DEFAULT_ABOUT_INTERESTS_HEADING,
  DEFAULT_ABOUT_INTERESTS_INTRODUCTION,
  DEFAULT_ABOUT_SKILLS_HEADING,
  DEFAULT_ABOUT_SKILLS_INTRODUCTION,
  DEFAULT_ABOUT_STORY_HEADING,
  DEFAULT_ABOUT_STORY_INTRODUCTION,
  DEFAULT_ABOUT_TIMELINE_HEADING,
  DEFAULT_ABOUT_TIMELINE_INTRODUCTION,
} from '~/utils/about-content'

const fallbackSettings: PublicSiteSettings = {
  about: {
    bannerFocalPoint: { x: 50, y: 50 },
    interestsHeading: DEFAULT_ABOUT_INTERESTS_HEADING,
    interestsIntroduction: DEFAULT_ABOUT_INTERESTS_INTRODUCTION,
    interests: [],
    skillsHeading: DEFAULT_ABOUT_SKILLS_HEADING,
    skillsIntroduction: DEFAULT_ABOUT_SKILLS_INTRODUCTION,
    skills: [],
    storyHeading: DEFAULT_ABOUT_STORY_HEADING,
    storyIntroduction: DEFAULT_ABOUT_STORY_INTRODUCTION,
    story: [],
    timelineHeading: DEFAULT_ABOUT_TIMELINE_HEADING,
    timelineIntroduction: DEFAULT_ABOUT_TIMELINE_INTRODUCTION,
    timeline: [],
  },
  backgroundGallery: [],
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
