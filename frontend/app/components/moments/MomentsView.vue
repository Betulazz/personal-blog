<script setup lang="ts">
import { computed } from 'vue'

import type { MomentCollectionResponse } from '~/types/moments'
import type { PublicFeedQuery, PublicTag } from '~/types/public-content'
import { isPublicFeedPageOutOfRange } from '~/utils/public-content'

const props = defineProps<{
  error?: unknown
  pending: boolean
  query: PublicFeedQuery
  response: MomentCollectionResponse | null
  tags: PublicTag[]
}>()

const emit = defineEmits<{
  retry: []
}>()

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
  return `${total} 条公开动态`
})
</script>

<template>
  <div class="moments-page" data-moments-page>
    <UiPageContainer as="section" class="moments-page__intro" width="wide">
      <div class="moments-page__intro-copy">
        <UiSectionHeader
          description="轻一点的记录，也值得被好好保存。按时间浏览生活里正在发生的事。"
          eyebrow="SMALL MOMENTS"
          title="动态"
          :heading-level="1"
        />
        <div class="moments-page__summary">
          <UiBadge tone="accent">{{ resultDescription }}</UiBadge>
          <span v-if="query.q || query.tag">筛选状态已保存在当前链接中</span>
        </div>
      </div>
    </UiPageContainer>

    <UiPageContainer
      as="section"
      class="moments-page__content"
      width="reading"
      aria-label="公开动态"
    >
      <PublicFeedControls
        base-path="/moments"
        content-label="动态"
        placeholder="搜索正文、地点、心情或标签"
        :query="query"
        :tags="tags"
      />

      <PublicCollectionState
        label="动态"
        recovery-href="/moments"
        :status="status"
        @retry="emit('retry')"
      >
        <ol class="moments-page__list">
          <li v-for="moment in response?.data" :key="moment.id">
            <MomentsMomentCard :moment="moment" />
          </li>
        </ol>
      </PublicCollectionState>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.moments-page {
  min-height: 100%;
}

.moments-page__intro {
  padding-top: clamp(10rem, 17vw, 14rem);
  padding-bottom: var(--space-12);
}

.moments-page__intro-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-8);
}

.moments-page__summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  text-align: end;
}

.moments-page__content {
  display: grid;
  gap: var(--space-8);
  padding-bottom: var(--space-section);
}

.moments-page__list {
  display: grid;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (width <= 48rem) {
  .moments-page__intro {
    padding-top: 9rem;
    padding-bottom: var(--space-10);
  }

  .moments-page__intro-copy {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .moments-page__summary {
    justify-content: flex-start;
    text-align: start;
  }
}
</style>
