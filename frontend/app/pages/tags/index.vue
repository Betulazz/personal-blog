<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { error, pending, refresh, tags } = await usePostTaxonomy()

useSeoMeta({
  title: `标签 · ${siteIdentity.name}`,
  description: '沿着可复用的主题线索，找到相互关联的文章。',
  ogDescription: '沿着可复用的主题线索，找到相互关联的文章。',
  ogTitle: `标签 · ${siteIdentity.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/tags`,
  twitterCard: 'summary',
  twitterDescription: '沿着可复用的主题线索，找到相互关联的文章。',
  twitterTitle: `标签 · ${siteIdentity.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/tags`, rel: 'canonical' }],
})
</script>

<template>
  <BlogPostTaxonomyIndex
    description="Tag 是可复用的主题线索，适合从一个关键词跳到另一篇文章。"
    :error="error"
    :items="tags"
    item-label="标签"
    item-path="/tags"
    :pending="pending"
    title="文章标签"
    @retry="refresh"
  />
</template>
