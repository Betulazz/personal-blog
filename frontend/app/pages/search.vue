<script setup lang="ts">
import { computed } from 'vue'

import { siteIdentity } from '~/config/siteIdentity'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const searchEnabled = computed(() => {
  const value = route.query.q
  const category = route.query.category
  const tag = route.query.tag
  return [value, category, tag].some(
    (item) => typeof item === 'string' && item.trim().length > 0,
  )
})
const {
  data,
  error: discoveryError,
  pending,
  query,
  refresh,
} = await usePostDiscovery({
  enabled: searchEnabled,
})
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
const title = computed(() =>
  query.value.q ? `搜索：${query.value.q}` : '搜索文章',
)

useSeoMeta({
  title: computed(() => `${title.value} · ${siteIdentity.name}`),
  description: '搜索文章标题、摘要、正文和标签。',
  ogDescription: '搜索文章标题、摘要、正文和标签。',
  ogTitle: computed(() => `${title.value} · ${siteIdentity.name}`),
  ogType: 'website',
  ogUrl: `${siteUrl}/search`,
  twitterCard: 'summary',
  twitterDescription: '搜索文章标题、摘要、正文和标签。',
  twitterTitle: computed(() => `${title.value} · ${siteIdentity.name}`),
})

useHead({
  link: [{ href: `${siteUrl}/search`, rel: 'canonical' }],
})
</script>

<template>
  <BlogPostDiscoveryView
    base-path="/search"
    :categories="categories"
    description="输入一个关键词，搜索标题、摘要、正文和标签；搜索词会保留在当前链接中。"
    empty-recovery-href="/posts"
    :error="pageError"
    eyebrow="SEARCH"
    :pending="pending"
    :query="query"
    :response="data"
    :show-category-filter="true"
    :show-tag-filter="true"
    :tags="tags"
    :taxonomy-pending="taxonomyPending"
    :title="title"
    @retry="refreshAll"
  />
</template>
