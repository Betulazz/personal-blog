<script setup lang="ts">
import type { PostQuery, PostTag } from '~/types/posts'

const props = defineProps<{
  query: PostQuery
  searchAction: string
  showSearch: boolean
  showTag: boolean
  tags: PostTag[]
}>()

const allFilterValue = '__all__'
const router = useRouter()
const selectedTag = ref(props.query.tag ?? allFilterValue)

watch(
  () => props.query.tag,
  (value) => {
    selectedTag.value = value ?? allFilterValue
  },
)

watch(selectedTag, (value) => {
  const query = {
    ...(props.query.q ? { q: props.query.q } : {}),
    ...(value !== allFilterValue ? { tag: value } : {}),
  }
  void router.push({ path: props.searchAction, query })
})

const emit = defineEmits<{
  search: [value: string]
}>()

const searchValue = ref(props.query.q ?? '')

watch(
  () => props.query.q,
  (value) => {
    searchValue.value = value ?? ''
  },
)
</script>

<template>
  <UiGlassPanel
    as="section"
    class="post-discovery-controls"
    aria-label="文章筛选"
    padding="none"
    tone="subtle"
  >
    <form
      v-if="showSearch"
      class="post-discovery-controls__search"
      :action="searchAction"
      method="get"
      role="search"
      @submit.prevent="emit('search', searchValue)"
    >
      <UiInput
        id="post-search"
        v-model="searchValue"
        label="搜索文章"
        name="q"
        placeholder="搜索标题、摘要、正文或标签"
        type="search"
        maxlength="80"
      />
      <input v-if="query.tag" type="hidden" name="tag" :value="query.tag" />
      <UiButton type="submit" size="small" variant="secondary">搜索</UiButton>
    </form>

    <label
      v-if="showTag"
      class="post-discovery-controls__tag-filter"
      for="post-tag-filter"
    >
      <span>按标签筛选</span>
      <select id="post-tag-filter" v-model="selectedTag" class="field__control">
        <option :value="allFilterValue">全部标签</option>
        <option v-for="tag in tags" :key="tag.slug" :value="tag.slug">
          {{ tag.name }} · {{ tag.postCount }}
        </option>
      </select>
    </label>
  </UiGlassPanel>
</template>

<style scoped>
.post-discovery-controls.glass-panel[data-tone] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 12rem;
  align-items: end;
  gap: var(--space-5);
  max-width: 48rem;
  margin-left: auto;
  border: 0;
  border-block: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-2) 0;
  background: transparent;
  box-shadow: none;
}

.post-discovery-controls__search {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-2);
}

.post-discovery-controls__search :deep(.field) {
  min-width: 0;
}

.post-discovery-controls__tag-filter {
  display: grid;
  min-width: 12rem;
  max-width: 12rem;
  gap: var(--space-2);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.post-discovery-controls__filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

@media (width <= 36rem) {
  .post-discovery-controls.glass-panel[data-tone] {
    grid-template-columns: minmax(0, 1fr);
  }

  .post-discovery-controls__search {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .post-discovery-controls__tag-filter {
    display: grid;
    max-width: none;
    gap: var(--space-2);
    color: var(--color-text-subtle);
    font-size: var(--text-caption);
  }

  .post-discovery-controls__filters {
    grid-template-columns: 1fr;
  }
}
</style>
