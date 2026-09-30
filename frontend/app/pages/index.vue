<script setup lang="ts">
import { useApiClient } from '~/api/client'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity, settings } = await usePublicSiteSettings()
const api = useApiClient()
const { data: runtimeStatus, error: runtimeStatusError } = await useAsyncData(
  'homepage-runtime-uptime',
  (_nuxtApp, { signal }) => api.getRuntimeUptime(signal),
)
const runtimeUptimeSeconds = runtimeStatus.value?.uptimeSeconds ?? null
const runtimeUptimeFailed = Boolean(runtimeStatusError.value)

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
  <VisualFoundationPage
    :runtime-uptime-seconds="runtimeUptimeSeconds"
    :runtime-uptime-failed="runtimeUptimeFailed"
  />
</template>
