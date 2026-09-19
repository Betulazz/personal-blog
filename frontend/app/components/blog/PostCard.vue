<script setup lang="ts">
import { ArrowUpRight, Pin } from 'lucide-vue-next'

import type { PostSummary } from '~/types/posts'

defineProps<{
  post: PostSummary
}>()

const formatPostDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
</script>

<template>
  <UiGlassCard
    as="article"
    class="post-card"
    :media="Boolean(post.cover)"
    padding="none"
    hoverable
  >
    <template v-if="post.cover" #media>
      <img
        class="post-card__cover"
        :src="post.cover.src"
        :alt="post.cover.alt"
        :width="post.cover.width"
        :height="post.cover.height"
        loading="lazy"
        decoding="async"
      />
    </template>
    <div class="post-card__body">
      <div class="post-card__meta">
        <NuxtLink
          class="post-card__category"
          :to="`/categories/${post.category.slug}`"
        >
          {{ post.category.name }}
        </NuxtLink>
        <div class="post-card__date">
          <span v-if="post.pinned" class="post-card__pinned">
            <Pin :size="14" aria-hidden="true" />
            置顶
          </span>
          <time :datetime="post.publishedAt">{{
            formatPostDate(post.publishedAt)
          }}</time>
          <span v-if="post.updatedAt">
            更新 {{ formatPostDate(post.updatedAt) }}
          </span>
        </div>
      </div>

      <h2 class="post-card__title">
        <a :href="`/posts/${post.slug}`">{{ post.title }}</a>
      </h2>
      <p class="post-card__summary">{{ post.summary }}</p>

      <div class="post-card__tags" aria-label="文章标签">
        <NuxtLink
          v-for="tag in post.tags"
          :key="tag.slug"
          class="post-card__tag"
          :to="`/tags/${tag.slug}`"
        >
          {{ tag.name }}
        </NuxtLink>
      </div>

      <div class="post-card__footer">
        <span>
          {{ post.readingTimeMinutes }} 分钟阅读 ·
          {{ post.readingCount.toLocaleString('zh-CN') }} 次阅读
        </span>
        <a
          class="post-card__read-more"
          :href="`/posts/${post.slug}`"
          :aria-label="`阅读：${post.title}`"
        >
          阅读
          <ArrowUpRight :size="17" aria-hidden="true" />
        </a>
      </div>
    </div>
  </UiGlassCard>
</template>

<style scoped>
.post-card {
  min-width: 0;
  height: 100%;
}

.post-card__body {
  display: flex;
  min-height: 18rem;
  height: 100%;
  flex-direction: column;
  padding: var(--space-6);
}

.post-card__cover {
  display: block;
  width: 100%;
  aspect-ratio: 2.25;
  object-fit: cover;
  opacity: 0.7;
  filter: saturate(0.78) brightness(0.68);
}

.post-card__meta,
.post-card__date,
.post-card__pinned,
.post-card__read-more {
  display: inline-flex;
  align-items: center;
}

.post-card__meta {
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.post-card__category {
  color: var(--color-accent-soft);
  font-weight: var(--font-weight-semibold);
}

.post-card__date {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
  white-space: nowrap;
}

.post-card__pinned {
  gap: var(--space-1);
  color: var(--color-secondary);
}

.post-card__title {
  margin: var(--space-5) 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
  text-wrap: balance;
}

.post-card__title a {
  transition: color var(--motion-duration-fast) var(--motion-ease-standard);
}

.post-card__title a:hover {
  color: var(--color-accent-soft);
}

.post-card__summary {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: var(--leading-body);
}

.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.post-card__tag {
  padding: var(--space-1) var(--space-2);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-standard),
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    background-color var(--motion-duration-fast) var(--motion-ease-standard);
}

.post-card__tag:hover {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-8);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.post-card__read-more {
  min-height: 2.75rem;
  gap: var(--space-1);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

@media (width <= 30rem) {
  .post-card__body {
    padding: var(--space-5);
  }

  .post-card__meta,
  .post-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .post-card__date {
    justify-content: flex-start;
  }

  .post-card__footer {
    gap: var(--space-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-card__title a,
  .post-card__tag {
    transition: none;
  }
}
</style>
