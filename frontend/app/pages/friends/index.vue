<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, refresh } = await useFriends()

useSeoMeta({
  title: `友链 · ${siteIdentity.name}`,
  description: '人工整理的个人网站链接，以及本站友链申请说明。',
  ogDescription: '人工整理的个人网站链接，以及本站友链申请说明。',
  ogTitle: `友链 · ${siteIdentity.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/friends`,
  twitterCard: 'summary',
  twitterDescription: '人工整理的个人网站链接，以及本站友链申请说明。',
  twitterTitle: `友链 · ${siteIdentity.name}`,
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
    @retry="refresh"
  />
</template>
