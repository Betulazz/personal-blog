<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, refresh } = await useAbout()
const { identity, settings } = await usePublicSiteSettings()

useSeoMeta({
  title: () => `关于 · ${identity.value.name}`,
  description: '了解这个个人出版空间、它的写作方向和正在生长的故事。',
  ogDescription: '了解这个个人出版空间、它的写作方向和正在生长的故事。',
  ogImage: () => settings.value.avatarUrl,
  ogTitle: () => `关于 · ${identity.value.name}`,
  ogType: 'profile',
  ogUrl: `${siteUrl}/about`,
  twitterCard: 'summary_large_image',
  twitterDescription: '了解这个个人出版空间、它的写作方向和正在生长的故事。',
  twitterImage: () => settings.value.avatarUrl,
  twitterTitle: () => `关于 · ${identity.value.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/about`, rel: 'canonical' }],
})
</script>

<template>
  <PortfolioAboutView
    :error="error"
    :pending="pending"
    :profile="data ?? null"
    @retry="refresh"
  />
</template>
