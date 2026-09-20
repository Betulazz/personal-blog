<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, refresh } = await useAbout()

useSeoMeta({
  title: `关于 · ${siteIdentity.name}`,
  description: '了解这个个人出版空间、它的写作方向和正在生长的故事。',
  ogDescription: '了解这个个人出版空间、它的写作方向和正在生长的故事。',
  ogTitle: `关于 · ${siteIdentity.name}`,
  ogType: 'profile',
  ogUrl: `${siteUrl}/about`,
  twitterCard: 'summary',
  twitterDescription: '了解这个个人出版空间、它的写作方向和正在生长的故事。',
  twitterTitle: `关于 · ${siteIdentity.name}`,
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
