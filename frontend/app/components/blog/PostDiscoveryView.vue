<script setup lang="ts">
import { computed } from 'vue'

import {
  buildPostRouteQuery,
  isPostQueryPageOutOfRange,
} from '~/utils/post-discovery'
import type {
  PostCategory,
  PostCollectionResponse,
  PostQuery,
  PostTag,
} from '~/types/posts'

type QueryChange = Partial<Pick<PostQuery, 'category' | 'page' | 'q' | 'tag'>>

const props = withDefaults(
  defineProps<{
    basePath: string
    categories: PostCategory[]
    categoryIsPath?: boolean
    description: string
    emptyRecoveryHref?: string
    error?: unknown
    eyebrow: string
    notFound?: boolean
    notFoundLabel?: string
    query: PostQuery
    response: PostCollectionResponse | null
    showCategoryFilter?: boolean
    showSearch?: boolean
    showTagFilter?: boolean
    tagIsPath?: boolean
    title: string
    taxonomyPending?: boolean
    tags: PostTag[]
    pending: boolean
  }>(),
  {
    categoryIsPath: false,
    emptyRecoveryHref: '/posts',
    error: undefined,
    notFound: false,
    notFoundLabel: '文章集合',
    showCategoryFilter: true,
    showSearch: true,
    showTagFilter: true,
    tagIsPath: false,
    taxonomyPending: false,
  },
)

const emit = defineEmits<{
  retry: []
}>()

const route = useRoute()
const router = useRouter()

const routeOptions = computed(() => ({
  categoryIsPath: props.categoryIsPath,
  tagIsPath: props.tagIsPath,
}))

const hrefForQuery = (query: PostQuery) =>
  router.resolve({
    path: props.basePath,
    query: buildPostRouteQuery(query, routeOptions.value),
  }).href

const navigateWith = async (changes: QueryChange) => {
  const nextQuery = { ...props.query, ...changes }
  await router.push({
    path: props.basePath,
    query: buildPostRouteQuery(nextQuery, routeOptions.value),
  })
}

const status = computed(() => {
  if (props.notFound) {
    return 'not-found' as const
  }
  if (props.error) {
    return 'error' as const
  }
  if (props.pending || props.taxonomyPending || !props.response) {
    return 'loading' as const
  }
  if (
    isPostQueryPageOutOfRange(
      props.query.page,
      props.response.pagination.totalPages,
    )
  ) {
    return 'out-of-range' as const
  }
  if (props.response.pagination.total === 0) {
    return 'empty' as const
  }

  return 'ready' as const
})

const collectionLabel = computed(() => {
  if (props.notFound) {
    return props.notFoundLabel
  }
  if (props.query.q) {
    return '搜索结果'
  }

  return '文章'
})

const outOfRangeHref = computed(() => {
  const totalPages = props.response?.pagination.totalPages ?? 1
  return hrefForQuery({ ...props.query, page: Math.max(totalPages, 1) })
})

const statusRecoveryHref = computed(() =>
  status.value === 'out-of-range'
    ? outOfRangeHref.value
    : props.emptyRecoveryHref,
)

const resultsDescription = computed(() => {
  const total = props.response?.pagination.total ?? 0
  return `${total} 篇公开文章`
})

const routeHasExtraState = computed(() =>
  Boolean(route.query.q || route.query.category || route.query.tag),
)
</script>

<template>
  <div class="post-discovery-page">
    <UiPageContainer
      as="section"
      class="post-discovery-page__intro"
      width="wide"
    >
      <div class="post-discovery-page__intro-copy">
        <UiSectionHeader
          :description="description"
          :eyebrow="eyebrow"
          :title="title"
          :heading-level="1"
        />
        <div class="post-discovery-page__summary">
          <UiBadge tone="accent">{{ resultsDescription }}</UiBadge>
          <span v-if="routeHasExtraState">筛选状态已保存在当前链接中</span>
        </div>
      </div>
    </UiPageContainer>

    <UiPageContainer
      as="section"
      class="post-discovery-page__content"
      width="wide"
      aria-label="文章发现"
    >
      <BlogPostDiscoveryControls
        :categories="categories"
        :query="query"
        search-action="/search"
        :show-category="showCategoryFilter"
        :show-search="showSearch"
        :show-tag="showTagFilter"
        :tags="tags"
        @update-category="navigateWith({ category: $event, page: 1 })"
        @update-tag="navigateWith({ page: 1, tag: $event })"
      />

      <BlogPostCollectionState
        :label="collectionLabel"
        :recovery-href="statusRecoveryHref"
        :status="status"
        @retry="emit('retry')"
      >
        <div class="post-discovery-page__results">
          <div class="post-discovery-page__grid">
            <BlogPostCard
              v-for="post in response?.data"
              :key="post.id"
              :post="post"
            />
          </div>
          <BlogPostPagination
            :page-href="(page) => hrefForQuery({ ...query, page })"
            :pagination="response!.pagination"
          />
        </div>
      </BlogPostCollectionState>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.post-discovery-page {
  min-height: 100%;
}

.post-discovery-page__intro {
  padding-top: clamp(10rem, 17vw, 14rem);
  padding-bottom: var(--space-12);
}

.post-discovery-page__intro-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-8);
}

.post-discovery-page__summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  text-align: end;
}

.post-discovery-page__content {
  display: grid;
  gap: var(--space-8);
  padding-bottom: var(--space-section);
}

.post-discovery-page__results {
  min-width: 0;
}

.post-discovery-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

@media (width <= 48rem) {
  .post-discovery-page__intro {
    padding-top: 9rem;
    padding-bottom: var(--space-10);
  }

  .post-discovery-page__intro-copy {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .post-discovery-page__summary {
    justify-content: flex-start;
    text-align: start;
  }
}

@media (width <= 36rem) {
  .post-discovery-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
