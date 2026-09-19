<script setup lang="ts">
import { ArrowUpRight, MessageCircle } from 'lucide-vue-next'

import { formatHomepageDate } from '~/utils/homepage'
import type { HomepageChatter, HomepageSection } from '~/types/homepage'

const props = defineProps<{
  section: HomepageSection<HomepageChatter>
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <section
    class="home-section home-chatter"
    aria-labelledby="home-chatter-title"
  >
    <HomeSectionHeader
      eyebrow="CHATTER"
      title="最近杂谈"
      description="比动态更完整，比文章更轻盈的想法。"
      link-label="进入杂谈"
      title-id="home-chatter-title"
      to="/chatter"
    />

    <HomeSectionState
      :label="'最近杂谈'"
      :status="props.section.status"
      :error-message="props.section.error?.message"
      @retry="$emit('retry')"
    >
      <div class="home-chatter__grid">
        <UiGlassCard
          v-for="chatter in props.section.items"
          :key="chatter.id"
          as="article"
          class="home-chatter-card"
          padding="compact"
          hoverable
        >
          <a class="home-chatter-card__link" href="/chatter">
            <div class="home-chatter-card__topline">
              <UiBadge v-if="chatter.mood" tone="accent">{{
                chatter.mood
              }}</UiBadge>
              <time :datetime="chatter.publishedAt">{{
                formatHomepageDate(chatter.publishedAt)
              }}</time>
            </div>
            <h3>{{ chatter.title }}</h3>
            <p>{{ chatter.lead }}</p>
            <footer>
              <span>
                <MessageCircle :size="15" aria-hidden="true" />
                杂谈记录
              </span>
              <ul aria-label="杂谈标签">
                <li v-for="tag in chatter.tags" :key="tag">#{{ tag }}</li>
              </ul>
              <ArrowUpRight :size="17" aria-hidden="true" />
            </footer>
          </a>
        </UiGlassCard>
      </div>
    </HomeSectionState>
  </section>
</template>

<style scoped>
.home-chatter__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--space-5);
}

.home-chatter-card {
  min-width: 0;
  height: 100%;
}

.home-chatter-card__link {
  display: flex;
  height: 100%;
  min-height: 13.5rem;
  flex-direction: column;
}

.home-chatter-card__topline,
.home-chatter-card__topline time,
.home-chatter-card footer,
.home-chatter-card footer span {
  display: flex;
  align-items: center;
}

.home-chatter-card__topline {
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-chatter-card h3 {
  margin: var(--space-8) 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
  text-wrap: balance;
}

.home-chatter-card p {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: var(--leading-body);
}

.home-chatter-card footer {
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-8);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-chatter-card footer span {
  gap: var(--space-2);
}

.home-chatter-card footer ul {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  color: var(--color-text-subtle);
  list-style: none;
}

@media (width <= 64rem) {
  .home-chatter__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 48rem) {
  .home-chatter__grid {
    grid-template-columns: 1fr;
  }
}
</style>
