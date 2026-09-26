<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity, settings } = await usePublicSiteSettings()

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const canonicalUrl = `${siteUrl}/`

useSeoMeta({
  title: () => identity.value.name,
  description: () => identity.value.description,
  ogDescription: () => identity.value.description,
  ogImage: () => settings.value.avatarUrl,
  ogTitle: () => identity.value.name,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterDescription: () => identity.value.description,
  twitterImage: () => settings.value.avatarUrl,
  twitterTitle: () => identity.value.name,
})

useHead(() => ({
  link: [{ href: canonicalUrl, rel: 'canonical' }],
  script: [
    {
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        description: identity.value.description,
        name: identity.value.name,
        url: canonicalUrl,
      }),
      type: 'application/ld+json' as 'application/json',
    },
  ],
}))
</script>

<template>
  <VisualFoundationPage />
</template>
