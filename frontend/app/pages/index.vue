<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity, settings } = await usePublicSiteSettings()

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const seoDefaults = computed(() => settings.value.seoDefaults)
const canonicalUrl = computed(
  () => seoDefaults.value.canonicalUrl || `${siteUrl}/`,
)
const openGraphUrl = computed(() => seoDefaults.value.canonicalUrl || siteUrl)

useSeoMeta({
  title: () => seoDefaults.value.title || identity.value.name,
  description: () =>
    seoDefaults.value.description || identity.value.description,
  ogDescription: () =>
    seoDefaults.value.description || identity.value.description,
  ogImage: () => seoDefaults.value.ogImageUrl,
  ogTitle: () => seoDefaults.value.title || identity.value.name,
  ogType: 'website',
  ogUrl: () => openGraphUrl.value,
  twitterCard: () => seoDefaults.value.twitterCard,
  twitterDescription: () =>
    seoDefaults.value.description || identity.value.description,
  twitterTitle: () => seoDefaults.value.title || identity.value.name,
})

useHead(() => ({
  meta: [
    {
      content: seoDefaults.value.keywords.join(', '),
      name: 'keywords',
    },
  ],
  link: [{ href: canonicalUrl.value, rel: 'canonical' }],
  script: [
    {
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        description:
          seoDefaults.value.description || identity.value.description,
        name: identity.value.name,
        url: canonicalUrl.value,
      }),
      type: 'application/ld+json' as 'application/json',
    },
  ],
}))
</script>

<template>
  <VisualFoundationPage />
</template>
