<script setup lang="ts">
import { computed } from 'vue'

import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity } = await usePublicSiteSettings()

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const categorySlug = computed(() =>
  typeof route.params.slug === 'string' ? route.params.slug : '',
)
const {
  categories,
  error: taxonomyError,
  pending: taxonomyPending,
  refresh: refreshTaxonomy,
  tags,
} = await usePostTaxonomy()
const {
  data,
  error: discoveryError,
  pending,
  query,
  refresh,
} = await usePostDiscovery({ categorySlug })
const category = computed(() =>
  categories.value.find((item) => item.slug === categorySlug.value),
)
const pageError = computed(
  () => taxonomyError.value ?? discoveryError.value ?? undefined,
)
const notFound = computed(
  () => !taxonomyPending.value && !pageError.value && !category.value,
)
const refreshAll = async () => {
  await Promise.all([refresh(), refreshTaxonomy()])
}
const basePath = computed(() => `/categories/${categorySlug.value}`)
const title = computed(() =>
  category.value ? `分类：${category.value.name}` : '分类未找到',
)
const description = computed(() =>
  category.value
    ? `浏览「${category.value.name}」下的公开文章，筛选状态会保留在当前链接中。`
    : '这个分类链接暂时没有对应的公开内容。',
)

useSeoMeta({
  title: computed(() => `${title.value} · ${identity.value.name}`),
  description,
  ogDescription: description,
  ogTitle: computed(() => `${title.value} · ${identity.value.name}`),
  ogType: 'website',
  ogUrl: computed(() => `${siteUrl}${basePath.value}`),
  twitterCard: 'summary',
  twitterDescription: description,
  twitterTitle: computed(() => `${title.value} · ${identity.value.name}`),
})

useHead({
  link: [
    { href: computed(() => `${siteUrl}${basePath.value}`), rel: 'canonical' },
  ],
})
</script>

<template>
  <BlogPostDiscoveryView
    :base-path="basePath"
    :categories="categories"
    category-is-path
    :description="description"
    empty-recovery-href="/categories"
    :error="pageError"
    eyebrow="CATEGORY"
    :not-found="notFound"
    not-found-label="分类"
    :pending="pending"
    :query="query"
    :response="data"
    :show-category-filter="false"
    :tags="tags"
    :taxonomy-pending="taxonomyPending"
    :title="title"
    @retry="refreshAll"
  />
</template>
