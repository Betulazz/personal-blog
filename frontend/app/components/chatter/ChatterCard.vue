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
    padding="compact"
  >
    <div class="chatter-card__topline">
      <UiBadge tone="accent">{{ chatter.mood || '杂谈' }}</UiBadge>
      <time :datetime="chatter.publishedAt">{{
        formatPublicDate(chatter.publishedAt)
      }}</time>
    </div>
    <h2 v-if="chatter.title">{{ chatter.title }}</h2>
    <p :id="`chatter-body-${chatter.id}`">{{ body }}</p>
    <UiButton
      v-if="isLong"
      variant="ghost"
      :aria-expanded="expanded"
      :aria-controls="`chatter-body-${chatter.id}`"
      @click="expanded = !expanded"
      >{{ expanded ? '收起' : '展开全文' }}</UiButton
    >
    <div v-if="chatter.images.length" class="chatter-card__images">
      <template v-for="(image, index) in chatter.images" :key="index"
        ><p
          v-if="failedImages[image.src]"
          role="img"
          :aria-label="`${image.alt} · 媒体暂不可用`"
        >
          媒体暂不可用
        </p>
        <img
          v-else
          :src="image.src"
          :alt="image.alt"
          :width="image.width"
          :height="image.height"
          loading="lazy"
          decoding="async"
          @error="failedImages[image.src] = true"
      /></template>
    </div>
    <NuxtLink
      :to="{
        path: '/chatter',
        query: { entry: chatter.id },
        hash: `#chatter-${chatter.id}`,
      }"
      class="chatter-card__link"
      >杂谈 #{{ chatter.id }}</NuxtLink
    >
  </UiGlassCard>
</template>
<style scoped>
.chatter-card {
  min-width: 0;
  scroll-margin-top: 7rem;
}
.chatter-card__topline {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}
h2 {
  margin: var(--space-5) 0 0;
  font-size: var(--text-h3);
  overflow-wrap: anywhere;
}
p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
}
.chatter-card__images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.chatter-card__images img {
  width: 100%;
  height: auto;
  border-radius: var(--radius-medium);
}
.chatter-card__link {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  margin-top: var(--space-3);
  color: var(--color-accent-soft);
}
</style>
