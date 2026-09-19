<script setup lang="ts">
import { ArrowUpRight, Clock3 } from 'lucide-vue-next'

import { formatHomepageDate } from '~/utils/homepage'
import type { HomepageSection, HomepagePost } from '~/types/homepage'

const props = defineProps<{
  section: HomepageSection<HomepagePost>
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <section class="home-section home-posts" aria-labelledby="home-posts-title">
    <HomeSectionHeader
      eyebrow="LATEST WRITING"
      title="最新文章"
      description="把值得慢慢读的想法，留在这里。"
      link-label="查看全部文章"
      title-id="home-posts-title"
      to="/posts"
    />

    <HomeSectionState
      :label="'最新文章'"
      :status="props.section.status"
      :error-message="props.section.error?.message"
      @retry="$emit('retry')"
    >
      <div class="home-posts__grid">
        <UiGlassCard
          v-for="post in props.section.items"
          :key="post.id"
          as="article"
          class="home-post-card"
          :class="{
            'home-post-card--featured': post === props.section.items[0],
          }"
          :media="Boolean(post.cover)"
          padding="none"
          hoverable
        >
          <template v-if="post.cover" #media>
            <img
              class="home-post-card__image"
              :src="post.cover.src"
              :alt="post.cover.alt"
              :width="post.cover.width"
              :height="post.cover.height"
              loading="lazy"
              decoding="async"
            />
          </template>
          <a class="home-post-card__link" :href="`/posts/${post.slug}`">
            <div class="home-post-card__body">
              <div class="home-post-card__meta" aria-label="文章元数据">
                <UiBadge tone="accent">{{ post.category.name }}</UiBadge>
                <time :datetime="post.publishedAt">{{
                  formatHomepageDate(post.publishedAt)
                }}</time>
              </div>
              <h3>{{ post.title }}</h3>
              <p>{{ post.summary }}</p>
              <div class="home-post-card__footer">
                <span class="home-post-card__reading-time">
                  <Clock3 :size="15" aria-hidden="true" />
                  {{ post.readingTimeMinutes }} 分钟阅读
                </span>
                <span class="home-post-card__arrow" aria-hidden="true">
                  <ArrowUpRight :size="17" />
                </span>
              </div>
            </div>
          </a>
        </UiGlassCard>
      </div>
    </HomeSectionState>
  </section>
</template>

<style scoped>
.home-section {
  min-width: 0;
}

.home-posts__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
}

.home-post-card {
  min-width: 0;
  height: 100%;
}

.home-post-card--featured {
  grid-column: span 2;
}

.home-post-card__image {
  display: block;
  width: 100%;
  aspect-ratio: 2 / 1;
  object-fit: cover;
  filter: saturate(0.78) brightness(0.68);
  transition: transform var(--motion-duration-slow)
    var(--motion-ease-emphasized);
}

.home-post-card:hover .home-post-card__image {
  transform: scale(1.04);
}

.home-post-card__link {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.home-post-card__body {
  display: flex;
  min-height: 15rem;
  height: 100%;
  flex-direction: column;
  padding: var(--space-6);
}

.home-post-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-post-card__meta time {
  white-space: nowrap;
}

.home-post-card h3 {
  margin: var(--space-5) 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
  text-wrap: balance;
}

.home-post-card p {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: var(--leading-body);
}

.home-post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-8);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-post-card__reading-time {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.home-post-card__arrow {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-muted);
}

@media (width <= 64rem) {
  .home-posts__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-post-card--featured {
    grid-column: span 2;
  }
}

@media (width <= 48rem) {
  .home-posts__grid {
    grid-template-columns: 1fr;
  }

  .home-post-card--featured {
    grid-column: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-post-card:hover .home-post-card__image {
    transform: none;
  }
}
</style>
