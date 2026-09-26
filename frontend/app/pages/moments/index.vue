<script setup lang="ts">
import { useApiClient } from '~/api/client'
import {
  buildPublicFeedQuery,
  buildPublicFeedRouteQuery,
  isPublicFeedPageOutOfRange,
} from '~/utils/public-content'
const api = useApiClient()
const route = useRoute()
const router = useRouter()
const query = computed(() =>
  buildPublicFeedQuery({ ...route.query, entry: undefined }),
)
const { data, error, pending, refresh } = await useAsyncData(
  () => `timeline:${JSON.stringify(query.value)}`,
  (_app, { signal }) => api.listTimeline(query.value, signal),
  { deep: false },
)
const status = computed(() =>
  error.value
    ? 'error'
    : pending.value || !data.value
      ? 'loading'
      : isPublicFeedPageOutOfRange(
            query.value.page,
            data.value.pagination.totalPages,
          )
        ? 'out-of-range'
        : data.value.pagination.total === 0
          ? 'empty'
          : 'ready',
)
const pageHref = (page: number) =>
  router.resolve({
    path: '/moments',
    query: buildPublicFeedRouteQuery({ ...query.value, page }),
  }).href
const { identity, settings } = await usePublicSiteSettings()
const siteUrl = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
const title = computed(() => `动态 · ${identity.value.name}`)
const description = '沿着时间线，浏览文章与随手记录的杂谈。'
useSeoMeta({
  title,
  description,
  ogDescription: description,
  ogImage: () => settings.value.avatarUrl,
  ogTitle: title,
  ogType: 'website',
  ogUrl: `${siteUrl}/moments`,
  twitterCard: 'summary_large_image',
  twitterDescription: description,
  twitterImage: () => settings.value.avatarUrl,
  twitterTitle: title,
})
useHead({ link: [{ href: `${siteUrl}/moments`, rel: 'canonical' }] })
</script>
<template>
  <UiPageContainer
    as="section"
    width="wide"
    class="timeline-page"
    data-timeline-page
  >
    <UiSectionHeader
      title="动态"
      eyebrow="ACTIVITY TIMELINE"
      description="文章与杂谈，沿着首次发布的时间留下足迹。"
      :heading-level="1"
    />
    <PublicFeedControls
      base-path="/moments"
      content-label="动态"
      placeholder="搜索文章与杂谈"
      :query="query"
    />
    <PublicCollectionState
      label="动态"
      :status="status"
      :recovery-href="pageHref(1)"
      @retry="refresh()"
    >
      <ol class="timeline" aria-label="文章与杂谈时间轴">
        <li
          v-for="(entry, index) in data?.data"
          :key="`${entry.kind}-${entry.content.id}`"
          :data-kind="entry.kind"
          :style="{ gridRow: index + 1 }"
          class="timeline__entry"
        >
          <BlogPostCard v-if="entry.kind === 'post'" :post="entry.content" />
          <ChatterCard v-else :chatter="entry.content" />
        </li>
      </ol>
      <PublicFeedPagination
        v-if="data"
        label="动态分页"
        :page-href="pageHref"
        :pagination="data.pagination"
      />
    </PublicCollectionState>
  </UiPageContainer>
</template>
<style scoped>
.timeline-page {
  padding-top: var(--public-heading-offset);
  padding-bottom: var(--space-section);
  display: grid;
  gap: var(--space-8);
}
.timeline {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 4rem;
  row-gap: var(--space-6);
}
.timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: var(--glass-border-hover);
}
.timeline__entry {
  position: relative;
  min-width: 0;
  grid-column: 1;
}
.timeline__entry:nth-child(even) {
  grid-column: 2;
}
.timeline__entry::before {
  content: '';
  position: absolute;
  top: 2rem;
  right: -2.4rem;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background: var(--color-accent-soft);
}
.timeline__entry:nth-child(even)::before {
  right: auto;
  left: -2.4rem;
}
@media (width <= 48rem) {
  .timeline {
    grid-template-columns: minmax(0, 1fr);
    padding-left: 1.5rem;
  }
  .timeline::before {
    left: 0;
  }
  .timeline__entry,
  .timeline__entry:nth-child(even) {
    grid-column: 1;
  }
  .timeline__entry::before,
  .timeline__entry:nth-child(even)::before {
    left: -1.85rem;
    right: auto;
  }
}
</style>
