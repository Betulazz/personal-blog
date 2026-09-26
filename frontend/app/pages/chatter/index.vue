<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, query, refresh } = await useChatter()
const { identity, settings } = await usePublicSiteSettings()

const pageDescription = '浏览比动态更完整、比文章更轻盈的技术与生活短篇记录。'

useSeoMeta({
  title: () => `杂谈 · ${identity.value.name}`,
  description: pageDescription,
  ogDescription: pageDescription,
  ogImage: () => settings.value.avatarUrl,
  ogTitle: () => `杂谈 · ${identity.value.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/chatter`,
  twitterCard: 'summary_large_image',
  twitterDescription: pageDescription,
  twitterImage: () => settings.value.avatarUrl,
  twitterTitle: () => `杂谈 · ${identity.value.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/chatter`, rel: 'canonical' }],
})
</script>

<template>
  <ChatterView
    :error="error"
    :pending="pending"
    :query="query"
    :response="data"
    @retry="refresh"
  />
</template>
