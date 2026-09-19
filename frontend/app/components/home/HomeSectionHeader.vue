<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'

defineProps<{
  description: string
  eyebrow: string
  linkLabel: string
  title: string
  titleId: string
  to: string
}>()
</script>

<template>
  <div class="home-section__header">
    <UiSectionHeader
      :eyebrow="eyebrow"
      :title="title"
      :description="description"
      :title-id="titleId"
      :heading-level="2"
    />
    <a class="home-section__link" :href="to">
      {{ linkLabel }}
      <ArrowUpRight :size="17" aria-hidden="true" />
    </a>
  </div>
</template>

<style scoped>
.home-section__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-8);
  margin-bottom: var(--space-8);
}

.home-section__link {
  display: inline-flex;
  min-height: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-standard),
    transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.home-section__link:hover {
  color: var(--color-text);
  transform: translateX(var(--motion-distance-small));
}

@media (width <= 48rem) {
  .home-section__header {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-section__link:hover {
    transform: none;
  }
}
</style>
