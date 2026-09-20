<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { data, error, pending, refresh } = await useProjects()

useSeoMeta({
  title: `项目 · ${siteIdentity.name}`,
  description: '浏览正在做、曾经做过，以及仍然值得回看的个人项目。',
  ogDescription: '浏览正在做、曾经做过，以及仍然值得回看的个人项目。',
  ogTitle: `项目 · ${siteIdentity.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/projects`,
  twitterCard: 'summary',
  twitterDescription: '浏览正在做、曾经做过，以及仍然值得回看的个人项目。',
  twitterTitle: `项目 · ${siteIdentity.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/projects`, rel: 'canonical' }],
})
</script>

<template>
  <PortfolioProjectsView
    :error="error"
    :pending="pending"
    :response="data ?? null"
    @retry="refresh"
  />
</template>
