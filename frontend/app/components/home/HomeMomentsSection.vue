<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'

import { siteIdentity } from '~/config/siteIdentity'
import { formatHomepageDate } from '~/utils/homepage'
import type { HomepageMoment, HomepageSection } from '~/types/homepage'

const props = defineProps<{
  section: HomepageSection<HomepageMoment>
}>()

defineEmits<{
  retry: []
}>()

const monogram = siteIdentity.name.slice(0, 1)
</script>

<template>
  <section
    class="home-section home-moments"
    aria-labelledby="home-moments-title"
  >
    <HomeSectionHeader
      eyebrow="SMALL MOMENTS"
      title="最近动态"
      description="轻一点的记录，也值得被好好保存。"
      link-label="更多动态"
      title-id="home-moments-title"
      to="/moments"
    />

    <HomeSectionState
      :label="'最近动态'"
      :status="props.section.status"
      :error-message="props.section.error?.message"
      @retry="$emit('retry')"
    >
      <ol class="home-moments__list">
        <li v-for="moment in props.section.items" :key="moment.id">
          <article class="home-moment-card">
            <div class="home-moment-card__rail" aria-hidden="true">
              <span class="home-moment-card__avatar">{{ monogram }}</span>
              <span class="home-moment-card__line" />
            </div>
            <div class="home-moment-card__content">
              <header class="home-moment-card__header">
                <div>
                  <strong>{{ siteIdentity.name }}</strong>
                  <time :datetime="moment.publishedAt">{{
                    formatHomepageDate(moment.publishedAt)
                  }}</time>
                </div>
                <UiBadge v-if="moment.mood" tone="accent">{{
                  moment.mood
                }}</UiBadge>
              </header>
              <p>{{ moment.body }}</p>
              <footer class="home-moment-card__footer">
                <span v-if="moment.location" class="home-moment-card__location">
                  <MapPin :size="14" aria-hidden="true" />
                  {{ moment.location }}
                </span>
                <ul aria-label="动态标签">
                  <li v-for="tag in moment.tags" :key="tag">#{{ tag }}</li>
                </ul>
              </footer>
            </div>
          </article>
        </li>
      </ol>
    </HomeSectionState>
  </section>
</template>

<style scoped>
.home-moments__list {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-moment-card {
  display: flex;
  min-width: 0;
  gap: var(--space-4);
  padding: var(--space-5);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-card-bg);
  box-shadow: var(--glass-highlight);
  transition:
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard),
    transform var(--motion-duration-normal) var(--motion-ease-emphasized);
}

.home-moment-card:hover {
  border-color: var(--glass-border-hover);
  background: var(--glass-bg-hover);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

.home-moment-card__rail {
  display: flex;
  flex: 0 0 2.25rem;
  flex-direction: column;
  align-items: center;
}

.home-moment-card__avatar {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
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

.home-moment-card__line {
  width: var(--border-hairline);
  height: 100%;
  margin-top: var(--space-2);
  background: linear-gradient(var(--glass-border-hover), transparent);
}

.home-moment-card__content {
  min-width: 0;
  flex: 1;
}

.home-moment-card__header,
.home-moment-card__header > div,
.home-moment-card__footer,
.home-moment-card__location {
  display: flex;
  align-items: center;
}

.home-moment-card__header {
  justify-content: space-between;
  gap: var(--space-3);
}

.home-moment-card__header > div {
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
}

.home-moment-card__header strong {
  color: var(--color-text);
  font-size: var(--text-small);
}

.home-moment-card__header time {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-moment-card p {
  max-width: 64ch;
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
}

.home-moment-card__footer {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-5);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-moment-card__location {
  gap: var(--space-1);
}

.home-moment-card__footer ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (prefers-reduced-motion: reduce) {
  .home-moment-card:hover {
    transform: none;
  }
}
</style>
