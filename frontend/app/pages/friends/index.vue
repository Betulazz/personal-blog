<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, refresh } = await useFriends()
const { identity, settings } = await usePublicSiteSettings()

useSeoMeta({
  title: () => `友链 · ${identity.value.name}`,
  description: '人工整理的个人网站链接，以及本站友链申请说明。',
  ogDescription: '人工整理的个人网站链接，以及本站友链申请说明。',
  ogImage: () => settings.value.avatarUrl,
  ogTitle: () => `友链 · ${identity.value.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/friends`,
  twitterCard: 'summary_large_image',
  twitterDescription: '人工整理的个人网站链接，以及本站友链申请说明。',
  twitterImage: () => settings.value.avatarUrl,
  twitterTitle: () => `友链 · ${identity.value.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/friends`, rel: 'canonical' }],
})
</script>

<template>
  <PortfolioFriendsView
    :error="error"
    :pending="pending"
    :response="data ?? null"
    :settings="settings"
    @retry="refresh"
  />
</template>
