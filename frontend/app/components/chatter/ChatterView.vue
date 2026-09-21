<script setup lang="ts">
import { computed } from 'vue'

import type { ChatterCollectionResponse } from '~/types/chatter'
import type { PublicFeedQuery, PublicTag } from '~/types/public-content'
import {
  buildPublicFeedRouteQuery,
  isPublicFeedPageOutOfRange,
} from '~/utils/public-content'

const props = defineProps<{
  error?: unknown
  pending: boolean
  query: PublicFeedQuery
  response: ChatterCollectionResponse | null
  tags: PublicTag[]
}>()

const emit = defineEmits<{
  retry: []
}>()

const router = useRouter()

const pageHref = (page: number) =>
  router.resolve({
    path: '/chatter',
    query: buildPublicFeedRouteQuery({ ...props.query, page }),
  }).href

const status = computed(() => {
  if (props.pending) {
    return 'loading' as const
  }
  if (props.error) {
    return 'error' as const
  }
  if (!props.response) {
    return 'loading' as const
  }
  if (
    isPublicFeedPageOutOfRange(
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

const resultDescription = computed(() => {
  const total = props.response?.pagination.total ?? 0
  return `${total} 条公开杂谈`
})
</script>

<template>
  <div class="chatter-page" data-chatter-page>
    <UiPageContainer as="section" class="chatter-page__intro" width="wide">
      <div class="chatter-page__intro-copy">
        <UiSectionHeader
          description="比动态更完整，比文章更轻盈的想法。这里收纳可以慢慢读完的短篇记录。"
          eyebrow="COMPOSED NOTES"
          title="杂谈"
          :heading-level="1"
        />
        <div class="chatter-page__summary">
          <UiBadge tone="accent">{{ resultDescription }}</UiBadge>
          <span v-if="query.q || query.tag">筛选状态已保存在当前链接中</span>
        </div>
      </div>
    </UiPageContainer>

    <UiPageContainer
      as="section"
      class="chatter-page__content"
      width="wide"
      aria-label="公开杂谈"
    >
      <PublicFeedControls
        base-path="/chatter"
        content-label="杂谈"
        placeholder="搜索标题、正文、心情或标签"
        :query="query"
        :tags="tags"
      />

      <PublicCollectionState
        label="杂谈"
        recovery-href="/chatter"
        :status="status"
        @retry="emit('retry')"
      >
        <div class="chatter-page__grid">
          <ChatterCard
            v-for="chatter in response?.data"
            :key="chatter.id"
            :chatter="chatter"
          />
        </div>
        <PublicFeedPagination
          label="杂谈分页"
          :page-href="pageHref"
          :pagination="response!.pagination"
        />
      </PublicCollectionState>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.chatter-page {
  min-height: 100%;
}

.chatter-page__intro {
  padding-top: clamp(10rem, 17vw, 14rem);
  padding-bottom: var(--space-12);
}

.chatter-page__intro-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-8);
}

.chatter-page__summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  text-align: end;
}

.chatter-page__content {
  display: grid;
  gap: var(--space-8);
  padding-bottom: var(--space-section);
}

.chatter-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--space-5);
}

@media (width <= 48rem) {
  .chatter-page__intro {
    padding-top: 9rem;
    padding-bottom: var(--space-10);
  }

  .chatter-page__intro-copy {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .chatter-page__summary {
    justify-content: flex-start;
    text-align: start;
  }
}

@media (width <= 36rem) {
  .chatter-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
