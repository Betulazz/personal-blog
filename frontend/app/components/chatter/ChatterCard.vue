<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Chatter } from '~/types/chatter'
import { formatPublicDate } from '~/utils/public-content'

const props = defineProps<{ chatter: Chatter }>()
const expanded = ref(false)
const failedImages = ref<Record<string, boolean>>({})
const isLong = computed(() => props.chatter.body.length > 280)
const body = computed(() =>
  isLong.value && !expanded.value
    ? `${props.chatter.body.slice(0, 280)}…`
    : props.chatter.body,
)
</script>

<template>
  <UiGlassCard
    :id="`chatter-${chatter.id}`"
    as="article"
    class="chatter-card"
    :media="Boolean(chatter.images.length)"
    padding="none"
  >
    <template v-if="chatter.images.length" #media>
      <div class="chatter-card__images" :data-count="chatter.images.length">
        <template v-for="(image, index) in chatter.images" :key="index">
          <div
            v-if="failedImages[image.src]"
            class="chatter-card__image-fallback"
            role="img"
            :aria-label="`${image.alt} · 媒体暂不可用`"
          >
            媒体暂不可用
          </div>
          <img
            v-else
            :src="image.src"
            :alt="image.alt"
            :width="image.width"
            :height="image.height"
            loading="lazy"
            decoding="async"
            @error="failedImages[image.src] = true"
          />
        </template>
      </div>
    </template>

    <div class="chatter-card__body">
      <div class="chatter-card__topline">
        <span class="chatter-card__chapter"
          >NOTE / {{ String(chatter.id).padStart(3, '0') }}</span
        >
        <time :datetime="chatter.publishedAt">{{
          formatPublicDate(chatter.publishedAt)
        }}</time>
      </div>
      <p v-if="chatter.mood" class="chatter-card__mood">{{ chatter.mood }}</p>
      <h2 v-if="chatter.title">{{ chatter.title }}</h2>
      <p :id="`chatter-body-${chatter.id}`" class="chatter-card__text">
        {{ body }}
      </p>
      <UiButton
        v-if="isLong"
        variant="ghost"
        :aria-expanded="expanded"
        :aria-controls="`chatter-body-${chatter.id}`"
        @click="expanded = !expanded"
        >{{ expanded ? '收起' : '展开全文' }}</UiButton
      >
      <NuxtLink :to="`/chatter/${chatter.id}`" class="chatter-card__link"
        >查看这条记录 ↗</NuxtLink
      >
    </div>
  </UiGlassCard>
</template>

<style scoped>
.chatter-card {
  min-width: 0;
  scroll-margin-top: 7rem;
}

.chatter-card__images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px;
  background: var(--color-text);
}

.chatter-card__images img,
.chatter-card__image-fallback {
  display: block;
  width: 100%;
  height: 9rem;
  object-fit: cover;
  background: var(--color-canvas);
}

.chatter-card__images img:first-child,
.chatter-card__images .chatter-card__image-fallback:first-child {
  grid-column: 1 / -1;
  height: clamp(13rem, 24vw, 18rem);
}

.chatter-card__images[data-count='1'] img {
  height: clamp(13rem, 24vw, 18rem);
}

.chatter-card__image-fallback {
  display: grid;
  place-items: center;
  color: var(--color-text-subtle);
}

.chatter-card__body {
  display: flex;
  min-height: 15rem;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--space-6);
}

.chatter-card__topline {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.chatter-card__chapter {
  color: var(--color-accent-strong);
}

.chatter-card__mood {
  margin: var(--space-4) 0 0;
  color: var(--color-secondary);
  font-size: var(--text-caption);
}

.chatter-card h2 {
  margin: var(--space-3) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-h3);
  overflow-wrap: anywhere;
}

.chatter-card__text {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chatter-card__link {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  margin-top: auto;
  padding-top: var(--space-5);
  border-bottom: 1px solid var(--color-text);
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: 700;
}
</style>
