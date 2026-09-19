<script setup lang="ts">
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'

import type { PostPagination as Pagination } from '~/types/posts'

const props = defineProps<{
  pagination: Pagination
  pageHref: (page: number) => string
}>()

const pages = computed(() =>
  Array.from({ length: props.pagination.totalPages }, (_, index) => index + 1),
)
</script>

<template>
  <nav
    v-if="pagination.totalPages > 1"
    class="post-pagination"
    aria-label="文章分页"
  >
    <NuxtLink
      v-if="pagination.page > 1"
      class="post-pagination__arrow"
      :to="pageHref(pagination.page - 1)"
      aria-label="上一页"
    >
      <ArrowLeft :size="17" aria-hidden="true" />
      <span>上一页</span>
    </NuxtLink>
    <span
      v-else
      class="post-pagination__arrow post-pagination__arrow--disabled"
    >
      <ArrowLeft :size="17" aria-hidden="true" />
      <span>上一页</span>
    </span>

    <div class="post-pagination__pages">
      <NuxtLink
        v-for="page in pages"
        :key="page"
        class="post-pagination__page"
        :class="{ 'post-pagination__page--current': page === pagination.page }"
        :to="pageHref(page)"
        :aria-current="page === pagination.page ? 'page' : undefined"
      >
        {{ page }}
      </NuxtLink>
    </div>

    <NuxtLink
      v-if="pagination.page < pagination.totalPages"
      class="post-pagination__arrow"
      :to="pageHref(pagination.page + 1)"
      aria-label="下一页"
    >
      <span>下一页</span>
      <ArrowRight :size="17" aria-hidden="true" />
    </NuxtLink>
    <span
      v-else
      class="post-pagination__arrow post-pagination__arrow--disabled"
    >
      <span>下一页</span>
      <ArrowRight :size="17" aria-hidden="true" />
    </span>
  </nav>
</template>

<style scoped>
.post-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-10);
}

.post-pagination__pages {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.post-pagination__page,
.post-pagination__arrow {
  display: inline-flex;
  min-width: 2.75rem;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding-inline: var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-standard),
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    background-color var(--motion-duration-fast) var(--motion-ease-standard);
}

.post-pagination__page:hover,
.post-pagination__arrow:hover {
  border-color: var(--glass-border-hover);
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.post-pagination__page--current {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.post-pagination__arrow--disabled {
  opacity: 0.45;
}

@media (width <= 30rem) {
  .post-pagination {
    gap: var(--space-2);
  }

  .post-pagination__arrow span {
    display: none;
  }

  .post-pagination__arrow {
    width: 2.75rem;
    padding: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-pagination__page,
  .post-pagination__arrow {
    transition: none;
  }
}
</style>
