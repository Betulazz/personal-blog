<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')

useSeoMeta({
  title: siteIdentity.name,
  description: siteIdentity.description,
  ogDescription: siteIdentity.description,
  ogTitle: siteIdentity.name,
  ogType: 'website',
  ogUrl: siteUrl,
  twitterCard: 'summary',
  twitterDescription: siteIdentity.description,
  twitterTitle: siteIdentity.name,
})

useHead({
  link: [{ href: `${siteUrl}/`, rel: 'canonical' }],
  script: [
    {
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        description: siteIdentity.description,
        name: siteIdentity.name,
        url: `${siteUrl}/`,
      }),
      type: 'application/ld+json' as 'application/json',
    },
  ],
})
</script>

<template>
  <VisualFoundationPage />
</template>
