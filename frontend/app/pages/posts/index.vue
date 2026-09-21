<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity } = await usePublicSiteSettings()

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const {
  data,
  error: discoveryError,
  pending,
  query,
  refresh,
} = await usePostDiscovery()
const {
  categories,
  error: taxonomyError,
  pending: taxonomyPending,
  refresh: refreshTaxonomy,
  tags,
} = await usePostTaxonomy()
const pageError = computed(
  () => discoveryError.value ?? taxonomyError.value ?? undefined,
)
const refreshAll = async () => {
  await Promise.all([refresh(), refreshTaxonomy()])
}

useSeoMeta({
  title: `文章 · ${identity.value.name}`,
  description: '按时间、分类、标签和关键词发现这里的公开文章。',
  ogDescription: '按时间、分类、标签和关键词发现这里的公开文章。',
  ogTitle: `文章 · ${identity.value.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/posts`,
  twitterCard: 'summary',
  twitterDescription: '按时间、分类、标签和关键词发现这里的公开文章。',
  twitterTitle: `文章 · ${identity.value.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/posts`, rel: 'canonical' }],
})
</script>

<template>
  <BlogPostDiscoveryView
    base-path="/posts"
    :categories="categories"
    description="正式写作、技术实践和那些值得过一段时间再读的记录。"
    eyebrow="LATEST WRITING"
    :error="pageError"
    :pending="pending"
    :query="query"
    :response="data"
    :tags="tags"
    :taxonomy-pending="taxonomyPending"
    title="文章"
    @retry="refreshAll"
  />
</template>
