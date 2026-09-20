<script setup lang="ts">
import { ArrowUpRight, MessageCircle } from 'lucide-vue-next'

import type { Chatter } from '~/types/chatter'
import { formatPublicDate } from '~/utils/public-content'

const props = defineProps<{
  chatter: Chatter
}>()
</script>

<template>
  <UiGlassCard as="article" class="chatter-card" padding="compact" hoverable>
    <div class="chatter-card__topline">
      <UiBadge v-if="props.chatter.mood" tone="accent">
        {{ props.chatter.mood }}
      </UiBadge>
      <time :datetime="props.chatter.publishedAt">
        {{ formatPublicDate(props.chatter.publishedAt) }}
      </time>
    </div>
    <h2>{{ props.chatter.title }}</h2>
    <p>{{ props.chatter.body }}</p>
    <footer>
      <span class="chatter-card__kind">
        <MessageCircle :size="15" aria-hidden="true" />
        杂谈记录
      </span>
      <ul aria-label="杂谈标签">
        <li v-for="tag in props.chatter.tags" :key="tag.slug">
          <NuxtLink :to="{ path: '/chatter', query: { tag: tag.slug } }">
            #{{ tag.name }}
          </NuxtLink>
        </li>
      </ul>
      <ArrowUpRight :size="17" aria-hidden="true" />
    </footer>
  </UiGlassCard>
</template>

<style scoped>
.chatter-card {
  height: 100%;
}

.chatter-card__topline,
.chatter-card__topline time,
.chatter-card footer,
.chatter-card__kind {
  display: flex;
  align-items: center;
}

.chatter-card__topline {
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.chatter-card h2 {
  margin: var(--space-8) 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
  text-wrap: balance;
}

.chatter-card p {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.chatter-card footer {
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-8);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.chatter-card__kind {
  flex: 0 0 auto;
  gap: var(--space-2);
}

.chatter-card footer ul {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chatter-card footer a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  color: var(--color-text-subtle);
}

.chatter-card footer a:hover {
  color: var(--color-accent-soft);
}

@media (width <= 36rem) {
  .chatter-card footer {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .chatter-card footer ul {
    order: 3;
    width: 100%;
  }
}
</style>
