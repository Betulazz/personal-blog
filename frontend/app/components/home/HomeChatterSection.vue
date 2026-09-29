<script setup lang="ts">
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
      eyebrow="02 / CHATTER"
      title="最近杂谈"
      description="随手记下的想法与生活片段。"
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
        <ChatterCard
          v-for="chatter in props.section.items"
          :key="chatter.id"
          :chatter="chatter"
        />
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
