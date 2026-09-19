<script setup lang="ts">
import type { PostCategory, PostQuery, PostTag } from '~/types/posts'

const props = defineProps<{
  categories: PostCategory[]
  query: PostQuery
  searchAction: string
  showCategory: boolean
  showSearch: boolean
  showTag: boolean
  tags: PostTag[]
}>()

const allFilterValue = '__all__'

const emit = defineEmits<{
  'update-category': [value: string | undefined]
  'update-tag': [value: string | undefined]
}>()

const searchValue = ref(props.query.q ?? '')

watch(
  () => props.query.q,
  (value) => {
    searchValue.value = value ?? ''
  },
)

const categoryOptions = computed(() => [
  { label: '全部分类', value: allFilterValue },
  ...props.categories.map((category) => ({
    label: `${category.name} · ${category.postCount}`,
    value: category.slug,
  })),
])

const tagOptions = computed(() => [
  { label: '全部标签', value: allFilterValue },
  ...props.tags.map((tag) => ({
    label: `${tag.name} · ${tag.postCount}`,
    value: tag.slug,
  })),
])
</script>

<template>
  <UiGlassPanel
    as="section"
    class="post-discovery-controls"
    aria-label="文章筛选"
    padding="default"
    tone="subtle"
  >
    <form
      v-if="showSearch"
      class="post-discovery-controls__search"
      :action="searchAction"
      method="get"
      role="search"
    >
      <UiInput
        id="post-search"
        v-model="searchValue"
        label="搜索文章"
        name="q"
        placeholder="搜索标题、摘要、正文或标签"
        type="search"
      />
      <input
        v-if="query.category"
        type="hidden"
        name="category"
        :value="query.category"
      />
      <input v-if="query.tag" type="hidden" name="tag" :value="query.tag" />
      <UiButton type="submit" size="large" variant="secondary"> 搜索 </UiButton>
    </form>

    <div
      v-if="showCategory || showTag"
      class="post-discovery-controls__filters"
    >
      <UiSelect
        v-if="showCategory"
        id="post-category-filter"
        :model-value="query.category ?? allFilterValue"
        :options="categoryOptions"
        label="分类"
        @update:model-value="
          emit(
            'update-category',
            $event === allFilterValue ? undefined : $event,
          )
        "
      />
      <UiSelect
        v-if="showTag"
        id="post-tag-filter"
        :model-value="query.tag ?? allFilterValue"
        :options="tagOptions"
        label="标签"
        @update:model-value="
          emit('update-tag', $event === allFilterValue ? undefined : $event)
        "
      />
    </div>
  </UiGlassPanel>
</template>

<style scoped>
.post-discovery-controls {
  display: grid;
  gap: var(--space-5);
}

.post-discovery-controls__search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-4);
}

.post-discovery-controls__search :deep(.field) {
  min-width: 0;
}

.post-discovery-controls__filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

@media (width <= 36rem) {
  .post-discovery-controls__search {
    grid-template-columns: 1fr;
  }

  .post-discovery-controls__search :deep(.button) {
    width: 100%;
  }

  .post-discovery-controls__filters {
    grid-template-columns: 1fr;
  }
}
</style>
