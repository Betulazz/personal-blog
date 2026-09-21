<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, query, refresh, tags } = await useChatter()
const { identity } = await usePublicSiteSettings()

const pageDescription = '浏览比动态更完整、比文章更轻盈的技术与生活短篇记录。'

useSeoMeta({
  title: () => `杂谈 · ${identity.value.name}`,
  description: pageDescription,
  ogDescription: pageDescription,
  ogTitle: () => `杂谈 · ${identity.value.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/chatter`,
  twitterCard: 'summary',
  twitterDescription: pageDescription,
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
    :tags="tags"
    @retry="refresh"
  />
</template>
