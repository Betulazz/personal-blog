<script setup lang="ts">
import { computed } from 'vue'

import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity } = await usePublicSiteSettings()

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const tagSlug = computed(() =>
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
} = await usePostDiscovery({ tagSlug })
const tag = computed(() =>
  tags.value.find((item) => item.slug === tagSlug.value),
)
const pageError = computed(
  () => taxonomyError.value ?? discoveryError.value ?? undefined,
)
const notFound = computed(
  () => !taxonomyPending.value && !pageError.value && !tag.value,
)
const refreshAll = async () => {
  await Promise.all([refresh(), refreshTaxonomy()])
}
const basePath = computed(() => `/tags/${tagSlug.value}`)
const title = computed(() =>
  tag.value ? `标签：${tag.value.name}` : '标签未找到',
)
const description = computed(() =>
  tag.value
    ? `浏览带有「${tag.value.name}」标签的公开文章，筛选状态会保留在当前链接中。`
    : '这个标签链接暂时没有对应的公开内容。',
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
    :description="description"
    empty-recovery-href="/tags"
    :error="pageError"
    eyebrow="TAG"
    :not-found="notFound"
    not-found-label="标签"
    :pending="pending"
    :query="query"
    :response="data"
    :show-tag-filter="false"
    :tags="tags"
    :taxonomy-pending="taxonomyPending"
    :tag-is-path="true"
    :title="title"
    @retry="refreshAll"
  />
</template>
