<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { categories, error, pending, refresh } = await usePostTaxonomy()

useSeoMeta({
  title: `分类 · ${siteIdentity.name}`,
  description: '按主要编辑主题浏览公开文章。',
  ogDescription: '按主要编辑主题浏览公开文章。',
  ogTitle: `分类 · ${siteIdentity.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/categories`,
  twitterCard: 'summary',
  twitterDescription: '按主要编辑主题浏览公开文章。',
  twitterTitle: `分类 · ${siteIdentity.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/categories`, rel: 'canonical' }],
})
</script>

<template>
  <BlogPostTaxonomyIndex
    :description="'Category 是文章的主要编辑分组；从一个主题开始，继续读下去。'"
    :error="error"
    :items="categories"
    item-label="分类"
    item-path="/categories"
    :pending="pending"
    title="文章分类"
    @retry="refresh"
  />
</template>
