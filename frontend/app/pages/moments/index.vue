<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, query, refresh, tags } = await useMoments()

const pageDescription = '按时间浏览关于生活、工作与正在发生之事的轻量记录。'

useSeoMeta({
  title: `动态 · ${siteIdentity.name}`,
  description: pageDescription,
  ogDescription: pageDescription,
  ogTitle: `动态 · ${siteIdentity.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/moments`,
  twitterCard: 'summary',
  twitterDescription: pageDescription,
  twitterTitle: `动态 · ${siteIdentity.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/moments`, rel: 'canonical' }],
})
</script>

<template>
  <MomentsView
    :error="error"
    :pending="pending"
    :query="query"
    :response="data"
    :tags="tags"
    @retry="refresh"
  />
</template>
