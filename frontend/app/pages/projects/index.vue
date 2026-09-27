<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'

import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import type { ProjectListQuery, ProjectType } from '~/types/portfolio'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const hasValidTypeQuery = computed(
  () =>
    route.query.type === 'personal' ||
    route.query.type === 'github_open_source',
)
const projectType = computed<ProjectType>(() =>
  route.query.type === 'personal' ? 'personal' : 'github_open_source',
)
const page = computed(() =>
  route.query.type !== undefined && !hasValidTypeQuery.value
    ? 1
    : parseProjectPage(route.query.page),
)
const projectQuery = computed<ProjectListQuery>(() => ({
  page: page.value,
  pageSize: 20,
  projectType: projectType.value,
}))
const { data, error, pending, refresh } = await useProjects(projectQuery)
const { identity, settings } = await usePublicSiteSettings()

function parseProjectPage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : 1
}

function routeQuery(type: ProjectType, selectedPage = 1) {
  return {
    type,
    ...(selectedPage > 1 ? { page: String(selectedPage) } : {}),
  }
}

function normalizeProjectRoute() {
  const query = route.query
  const selectedType = projectType.value
  const selectedPage = page.value
  const isCanonical =
    query.type === selectedType &&
    (selectedPage === 1
      ? query.page === undefined
      : query.page === String(selectedPage)) &&
    Object.keys(query).every((key) => key === 'type' || key === 'page')

  if (!isCanonical) {
    void router.replace({
      path: route.path,
      query: routeQuery(selectedType, selectedPage),
    })
  }
}

onMounted(normalizeProjectRoute)
watch(() => route.fullPath, normalizeProjectRoute, { flush: 'post' })

function selectProjectType(type: ProjectType) {
  if (type === projectType.value) return
  void router.push({ path: route.path, query: routeQuery(type) })
}

function selectPage(selectedPage: number) {
  if (selectedPage === page.value) return
  void router.push({
    path: route.path,
    query: routeQuery(projectType.value, selectedPage),
  })
}

const recoveryHref = computed(
  () =>
    router.resolve({ path: route.path, query: routeQuery(projectType.value) })
      .href,
)

useSeoMeta({
  title: () => `项目 · ${identity.value.name}`,
  description: '浏览正在做、曾经做过，以及仍然值得回看的个人项目。',
  ogDescription: '浏览正在做、曾经做过，以及仍然值得回看的个人项目。',
  ogImage: () => settings.value.avatarUrl,
  ogTitle: () => `项目 · ${identity.value.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/projects`,
  twitterCard: 'summary_large_image',
  twitterDescription: '浏览正在做、曾经做过，以及仍然值得回看的个人项目。',
  twitterImage: () => settings.value.avatarUrl,
  twitterTitle: () => `项目 · ${identity.value.name}`,
})

useHead({
  link: [{ href: `${siteUrl}/projects`, rel: 'canonical' }],
})
</script>

<template>
  <PortfolioProjectsView
    :error="error"
    :page="page"
    :page-count="data?.pagination.totalPages ?? 0"
    :pending="pending"
    :project-type="projectType"
    :recovery-href="recoveryHref"
    :response="data ?? null"
    @retry="refresh"
    @select-page="selectPage"
    @select-type="selectProjectType"
  />
</template>
