<script setup lang="ts">
import { ref, watch } from 'vue'

import type { PublicFeedQuery, PublicTag } from '~/types/public-content'
import { buildPublicFeedRouteQuery } from '~/utils/public-content'

const props = defineProps<{
  basePath: string
  contentLabel: string
  placeholder: string
  query: PublicFeedQuery
  tags: PublicTag[]
}>()

const searchValue = ref(props.query.q ?? '')
const router = useRouter()

watch(
  () => props.query.q,
  (value) => {
    searchValue.value = value ?? ''
  },
)

const tagHref = (tag?: string) =>
  router.resolve({
    path: props.basePath,
    query: buildPublicFeedRouteQuery({
      ...props.query,
      page: 1,
      ...(tag ? { tag } : { tag: undefined }),
    }),
  }).href
</script>

<template>
  <UiGlassPanel
    as="section"
    class="public-feed-controls"
    :aria-label="`${props.contentLabel}筛选`"
    padding="default"
    tone="subtle"
  >
    <form
      class="public-feed-controls__search"
      :action="props.basePath"
      method="get"
      role="search"
    >
      <UiInput
        :id="`${props.contentLabel}-search`"
        v-model="searchValue"
        :label="`搜索${props.contentLabel}`"
        name="q"
        :placeholder="props.placeholder"
        type="search"
      />
      <input
        v-if="props.query.tag"
        type="hidden"
        name="tag"
        :value="props.query.tag"
      />
      <UiButton type="submit" size="large" variant="secondary">搜索</UiButton>
    </form>

    <nav
      class="public-feed-controls__tags"
      :aria-label="`${props.contentLabel}标签`"
    >
      <span class="public-feed-controls__label">按标签浏览</span>
      <NuxtLink
        class="public-feed-controls__tag"
        :class="{ 'public-feed-controls__tag--active': !props.query.tag }"
        :to="tagHref()"
        :aria-current="!props.query.tag ? 'page' : undefined"
      >
        全部
      </NuxtLink>
      <NuxtLink
        v-for="tag in props.tags"
        :key="tag.slug"
        class="public-feed-controls__tag"
        :class="{
          'public-feed-controls__tag--active': props.query.tag === tag.slug,
        }"
        :to="tagHref(tag.slug)"
        :aria-current="props.query.tag === tag.slug ? 'page' : undefined"
      >
        {{ tag.name }}
      </NuxtLink>
    </nav>
  </UiGlassPanel>
</template>

<style scoped>
.public-feed-controls {
  display: grid;
  gap: var(--space-5);
}

.public-feed-controls__search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-4);
}

.public-feed-controls__search :deep(.field) {
  min-width: 0;
}

.public-feed-controls__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.public-feed-controls__label {
  margin-inline-end: var(--space-2);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.public-feed-controls__tag {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  transition:
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    background-color var(--motion-duration-fast) var(--motion-ease-standard),
    color var(--motion-duration-fast) var(--motion-ease-standard);
}

.public-feed-controls__tag:hover,
.public-feed-controls__tag--active {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

@media (width <= 36rem) {
  .public-feed-controls__search {
    grid-template-columns: 1fr;
  }

  .public-feed-controls__search :deep(.button) {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .public-feed-controls__tag {
    transition: none;
  }
}
</style>
