<script setup lang="ts">
import type { PostCategory, PostTag } from '~/types/posts'

type TaxonomyItem = PostCategory | PostTag

defineProps<{
  description: string
  error?: unknown
  items: TaxonomyItem[]
  itemLabel: string
  itemPath: string
  pending: boolean
  title: string
}>()

const errorMessage = '分类和标签暂时无法加载，请稍后重试。'

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="post-taxonomy-index">
    <UiPageContainer
      as="section"
      class="post-taxonomy-index__intro"
      width="wide"
    >
      <UiSectionHeader
        :description="description"
        eyebrow="POST DISCOVERY"
        :title="title"
        :heading-level="1"
      />
    </UiPageContainer>

    <UiPageContainer
      as="section"
      class="post-taxonomy-index__content"
      width="wide"
      :aria-label="itemLabel"
    >
      <div
        v-if="pending"
        class="post-taxonomy-index__state"
        role="status"
        aria-busy="true"
      >
        <span>正在加载{{ itemLabel }}…</span>
        <div class="post-taxonomy-index__skeleton-grid" aria-hidden="true">
          <div
            v-for="index in 3"
            :key="index"
            class="post-taxonomy-index__skeleton"
          >
            <span />
            <span />
          </div>
        </div>
      </div>
      <div v-else-if="error" class="post-taxonomy-index__state" role="alert">
        <strong>暂时无法加载{{ itemLabel }}</strong>
        <p>{{ errorMessage }}</p>
        <UiButton variant="secondary" @click="emit('retry')">重新加载</UiButton>
      </div>
      <div
        v-else-if="items.length === 0"
        class="post-taxonomy-index__state"
        role="status"
      >
        还没有可浏览的{{ itemLabel }}。
      </div>
      <ul v-else class="post-taxonomy-index__grid">
        <li v-for="item in items" :key="item.slug">
          <UiGlassCard as="article" class="post-taxonomy-index__card" hoverable>
            <NuxtLink
              class="post-taxonomy-index__link"
              :to="`${itemPath}/${item.slug}`"
            >
              <span class="post-taxonomy-index__name">{{ item.name }}</span>
              <span class="post-taxonomy-index__count">
                {{ item.postCount }} 篇文章
              </span>
            </NuxtLink>
          </UiGlassCard>
        </li>
      </ul>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.post-taxonomy-index__intro {
  padding-top: clamp(10rem, 17vw, 14rem);
  padding-bottom: var(--space-12);
}

.post-taxonomy-index__content {
  padding-bottom: var(--space-section);
}

.post-taxonomy-index__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-taxonomy-index__card {
  height: 100%;
}

.post-taxonomy-index__link {
  display: flex;
  min-height: 8rem;
  align-items: flex-start;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-6);
}

.post-taxonomy-index__name {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
}

.post-taxonomy-index__count {
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.post-taxonomy-index__state {
  display: grid;
  min-height: 16rem;
  place-items: center;
  gap: var(--space-2);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  text-align: center;
}

.post-taxonomy-index__state strong {
  color: var(--color-text);
}

.post-taxonomy-index__state p {
  margin: 0;
}

.post-taxonomy-index__skeleton-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
  margin-top: var(--space-4);
}

.post-taxonomy-index__skeleton {
  display: grid;
  min-height: 8rem;
  align-content: start;
  gap: var(--space-4);
  padding: var(--space-5);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: linear-gradient(
    110deg,
    var(--glass-card-bg) 30%,
    var(--glass-bg-hover) 45%,
    var(--glass-card-bg) 60%
  );
  background-size: 220% 100%;
  animation: taxonomy-skeleton-shimmer 1.8s linear infinite;
}

.post-taxonomy-index__skeleton span {
  display: block;
  height: 0.9rem;
  border-radius: var(--radius-round);
  background: rgb(191 205 255 / 12%);
}

.post-taxonomy-index__skeleton span:last-child {
  width: 58%;
}

@keyframes taxonomy-skeleton-shimmer {
  to {
    background-position: -120% 0;
  }
}

@media (width <= 48rem) {
  .post-taxonomy-index__intro {
    padding-top: 9rem;
    padding-bottom: var(--space-10);
  }

  .post-taxonomy-index__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .post-taxonomy-index__skeleton-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 30rem) {
  .post-taxonomy-index__grid {
    grid-template-columns: 1fr;
  }

  .post-taxonomy-index__skeleton-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-taxonomy-index__skeleton {
    animation: none;
  }
}
</style>
