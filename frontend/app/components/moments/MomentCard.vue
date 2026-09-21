<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { Moment } from '../../types/moments'
import { formatPublicDate } from '../../utils/public-content'

const props = defineProps<{
  moment: Moment
  siteName?: string
}>()

const failedImages = ref(new Set<string>())
const displayName = computed(() => props.siteName || '动态作者')
const monogram = computed(() => displayName.value.slice(0, 1))

const markImageUnavailable = (src: string) => {
  failedImages.value = new Set(failedImages.value).add(src)
}

const imageIsUnavailable = (src: string) => failedImages.value.has(src)
</script>

<template>
  <article class="moment-card" data-moment-card>
    <div class="moment-card__rail" aria-hidden="true">
      <span class="moment-card__avatar">{{ monogram }}</span>
      <span class="moment-card__line" />
    </div>

    <div class="moment-card__content">
      <header class="moment-card__header">
        <div class="moment-card__identity">
          <strong>{{ displayName }}</strong>
          <time :datetime="props.moment.publishedAt">
            {{ formatPublicDate(props.moment.publishedAt) }}
          </time>
        </div>
        <UiBadge v-if="props.moment.mood" tone="accent">
          {{ props.moment.mood }}
        </UiBadge>
      </header>

      <p class="moment-card__body">{{ props.moment.body }}</p>

      <div
        v-if="props.moment.images?.length"
        class="moment-card__media-grid"
        aria-label="动态图片"
      >
        <figure v-for="media in props.moment.images" :key="media.src">
          <img
            v-if="!imageIsUnavailable(media.src)"
            :src="media.src"
            :alt="media.alt"
            :width="media.width"
            :height="media.height"
            loading="lazy"
            decoding="async"
            @error="markImageUnavailable(media.src)"
          />
          <div
            v-else
            class="moment-card__media-fallback"
            role="img"
            :aria-label="`${media.alt}：媒体暂不可用`"
          >
            <span aria-hidden="true">◇</span>
            <span>媒体暂不可用</span>
          </div>
          <figcaption v-if="imageIsUnavailable(media.src)">
            {{ media.alt }}
          </figcaption>
        </figure>
      </div>

      <footer class="moment-card__footer">
        <span v-if="props.moment.location" class="moment-card__location">
          <MapPin :size="15" aria-hidden="true" />
          {{ props.moment.location }}
        </span>
        <ul v-if="props.moment.tags?.length" aria-label="动态标签">
          <li v-for="tag in props.moment.tags" :key="tag.slug">
            <NuxtLink :to="{ path: '/moments', query: { tag: tag.slug } }">
              #{{ tag.name }}
            </NuxtLink>
          </li>
        </ul>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.moment-card {
  display: flex;
  min-width: 0;
  gap: var(--space-4);
  padding: var(--space-6);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-card-bg);
  box-shadow: var(--shadow-card), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-card))
    saturate(var(--glass-saturation));
  transition:
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard),
    transform var(--motion-duration-normal) var(--motion-ease-emphasized);
}

.moment-card:hover {
  border-color: var(--glass-border-hover);
  background: var(--glass-bg-hover);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

.moment-card__rail {
  display: flex;
  flex: 0 0 2.5rem;
  flex-direction: column;
  align-items: center;
}

.moment-card__avatar {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-round);
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-small);
  font-weight: var(--font-weight-bold);
}

.moment-card__line {
  width: var(--border-hairline);
  height: 100%;
  margin-top: var(--space-2);
  background: linear-gradient(var(--glass-border-hover), transparent);
}

.moment-card__content {
  min-width: 0;
  flex: 1;
}

.moment-card__header,
.moment-card__identity,
.moment-card__footer,
.moment-card__location {
  display: flex;
  align-items: center;
}

.moment-card__header {
  justify-content: space-between;
  gap: var(--space-3);
}

.moment-card__identity {
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
}

.moment-card__identity strong {
  color: var(--color-text);
  font-size: var(--text-small);
}

.moment-card__identity time {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.moment-card__body {
  max-width: 66ch;
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.moment-card__media-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.moment-card__media-grid figure {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--color-canvas-raised);
}

.moment-card__media-grid img,
.moment-card__media-fallback {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.moment-card__media-grid img {
  opacity: 0.78;
}

.moment-card__media-fallback {
  display: grid;
  min-height: 9rem;
  place-items: center;
  align-content: center;
  gap: var(--space-2);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  text-align: center;
}

.moment-card__media-fallback span:first-child {
  color: var(--color-accent-soft);
  font-size: var(--text-h3);
}

.moment-card__media-grid figcaption {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.moment-card__footer {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-5);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.moment-card__location {
  gap: var(--space-1);
}

.moment-card__footer ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.moment-card__footer a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  color: var(--color-text-subtle);
}

.moment-card__footer a:hover {
  color: var(--color-accent-soft);
}

@media (width <= 30rem) {
  .moment-card {
    padding: var(--space-5);
  }

  .moment-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .moment-card__media-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .moment-card:hover {
    transform: none;
  }
}
</style>
