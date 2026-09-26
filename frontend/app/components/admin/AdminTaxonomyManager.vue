<script setup lang="ts">
import type { AdminTaxonomy, AdminTaxonomyInput } from '~/types/admin'

const props = withDefaults(
  defineProps<{
    description: string
    eyebrow: string
    errorMessage?: string | null
    isLoadError?: boolean
    isLoading?: boolean
    isSubmitting?: boolean
    itemLabel: string
    items?: AdminTaxonomy[]
    title: string
  }>(),
  {
    errorMessage: null,
    isLoadError: false,
    isLoading: false,
    isSubmitting: false,
    items: () => [],
  },
)

const emit = defineEmits<{
  delete: [item: AdminTaxonomy]
  save: [value: AdminTaxonomyInput & { id?: string }]
  retry: []
}>()

const name = ref('')
const slug = ref('')
const editingId = ref<string | null>(null)
const validation = reactive<Record<string, string>>({})

const reset = () => {
  name.value = ''
  slug.value = ''
  editingId.value = null
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
}

const edit = (item: AdminTaxonomy) => {
  editingId.value = item.id
  name.value = item.name
  slug.value = item.slug
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
}

const submit = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!name.value.trim()) validation.name = `请输入${props.itemLabel}名称。`
  if (!slug.value.trim()) validation.slug = '请输入 slug。'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value.trim())) {
    validation.slug = 'slug 只能使用小写字母、数字和连字符。'
  }
  if (Object.keys(validation).length) return
  emit('save', {
    id: editingId.value ?? undefined,
    name: name.value.trim(),
    slug: slug.value.trim(),
  })
}
</script>

<template>
  <div class="admin-taxonomy-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
    </header>

    <div v-if="isLoadError" class="admin-resource-state" role="alert">
      <strong>暂时无法加载{{ itemLabel }}</strong>
      <p>{{ errorMessage }}</p>
      <UiButton variant="secondary" @click="emit('retry')">重新加载</UiButton>
    </div>
    <section v-else class="admin-taxonomy-layout">
      <UiGlassPanel class="admin-taxonomy-form" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">
              {{ editingId ? 'Edit entity' : 'New entity' }}
            </p>
            <h2>{{ editingId ? `编辑${itemLabel}` : `新建${itemLabel}` }}</h2>
          </div>
          <UiButton v-if="editingId" variant="ghost" size="small" @click="reset"
            >取消编辑</UiButton
          >
        </div>
        <form novalidate @submit.prevent="submit">
          <UiInput
            v-model="name"
            :label="`${itemLabel}名称`"
            name="name"
            :error="validation.name"
            required
          />
          <UiInput
            v-model="slug"
            label="Slug"
            name="slug"
            description="用于公开 URL 与筛选条件。"
            :error="validation.slug"
            required
          />
          <p
            v-if="errorMessage"
            class="admin-taxonomy-form__error"
            role="alert"
          >
            {{ errorMessage }}
          </p>
          <UiButton type="submit" :loading="isSubmitting">{{
            editingId ? '保存修改' : `创建${itemLabel}`
          }}</UiButton>
        </form>
      </UiGlassPanel>

      <section class="admin-taxonomy-list" :aria-label="`${itemLabel}列表`">
        <div class="admin-taxonomy-list__heading">
          <h2>已有{{ itemLabel }}</h2>
          <span>{{ items.length }} 个</span>
        </div>
        <div v-if="isLoading" class="admin-resource-state" role="status">
          正在读取{{ itemLabel }}…
        </div>
        <div v-else-if="!items.length" class="admin-resource-state">
          <strong>还没有{{ itemLabel }}</strong>
          <p>创建后就可以在文章编辑器中重复使用。</p>
        </div>
        <ul v-else>
          <li v-for="item in items" :key="item.id" class="admin-taxonomy-row">
            <div>
              <strong>{{ item.name }}</strong>
              <span>{{ item.slug }}</span>
              <small>{{
                item.postCount
                  ? `当前有 ${item.postCount} 篇内容引用`
                  : '暂无内容引用'
              }}</small>
            </div>
            <div class="admin-taxonomy-row__actions">
              <UiButton variant="ghost" size="small" @click="edit(item)"
                >编辑</UiButton
              >
              <UiButton
                variant="danger"
                size="small"
                :title="`删除${itemLabel}`"
                @click="emit('delete', item)"
              >
                删除
              </UiButton>
            </div>
          </li>
        </ul>
      </section>
    </section>
  </div>
</template>

<style scoped>
.admin-taxonomy-page {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6) var(--space-16);
}

.admin-resource-heading h1,
.admin-resource-heading p {
  margin: 0;
}

.admin-resource-heading h1 {
  margin-top: var(--space-2);
  font-size: clamp(2.25rem, 5vw, 4rem);
  letter-spacing: -0.04em;
}

.admin-resource-heading > div > p:last-child {
  margin-top: var(--space-3);
  color: var(--color-text-muted);
}

.admin-resource-heading__eyebrow,
.admin-form-eyebrow {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-taxonomy-layout {
  display: grid;
  grid-template-columns: minmax(18rem, 0.7fr) minmax(0, 1.3fr);
  align-items: start;
  gap: var(--space-6);
}

.admin-taxonomy-form,
.admin-taxonomy-form form {
  display: grid;
  gap: var(--space-5);
}

.admin-form-section-heading,
.admin-taxonomy-list__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
}

.admin-form-section-heading h2,
.admin-form-section-heading p,
.admin-taxonomy-list__heading h2,
.admin-taxonomy-list__heading span {
  margin: 0;
}

.admin-form-section-heading h2,
.admin-taxonomy-list__heading h2 {
  margin-top: var(--space-2);
  font-size: var(--text-h3);
}

.admin-taxonomy-form__error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--color-danger-border);
  border-radius: var(--radius-medium);
  background: var(--color-danger-surface);
  color: #fecdd3;
  line-height: 1.6;
}

.admin-taxonomy-list {
  display: grid;
  gap: var(--space-4);
}

.admin-taxonomy-list__heading span {
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-taxonomy-list ul {
  display: grid;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
}

.admin-taxonomy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
}

.admin-taxonomy-row + .admin-taxonomy-row {
  border-top: var(--border-hairline) solid var(--color-divider-subtle);
}

.admin-taxonomy-row > div:first-child {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.admin-taxonomy-row strong {
  color: var(--color-text);
}

.admin-taxonomy-row span,
.admin-taxonomy-row small {
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-taxonomy-row small {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-taxonomy-row__actions {
  display: flex;
  flex: 0 0 auto;
  gap: var(--space-2);
}

.admin-resource-state {
  display: grid;
  min-height: 12rem;
  place-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  text-align: center;
}

.admin-resource-state strong,
.admin-resource-state p {
  margin: 0;
}

@media (width <= 52rem) {
  .admin-taxonomy-layout {
    grid-template-columns: 1fr;
  }
}

@media (width <= 30rem) {
  .admin-taxonomy-row {
    align-items: start;
    flex-direction: column;
  }

  .admin-taxonomy-row__actions {
    width: 100%;
  }

  .admin-taxonomy-row__actions .button {
    flex: 1;
  }
}
</style>
