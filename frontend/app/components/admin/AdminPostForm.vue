<script setup lang="ts">
import { computed } from 'vue'
import type { AdminPost, AdminPostInput, AdminTaxonomy } from '~/types/admin'

const props = withDefaults(
  defineProps<{
    input: AdminPostInput
    dirty?: boolean
    errorMessage?: string | null
    isLoading?: boolean
    isSubmitting?: boolean
    locked?: boolean
    canSave?: boolean
    editorReady?: boolean
    post?: AdminPost | null
    tags?: AdminTaxonomy[]
  }>(),
  {
    dirty: false,
    errorMessage: null,
    isLoading: false,
    isSubmitting: false,
    locked: false,
    canSave: false,
    editorReady: false,
    post: null,
    tags: () => [],
  },
)
const emit = defineEmits<{
  canonical: [body: string]
  change: [value: AdminPostInput]
  preview: []
  save: []
}>()
const validation = reactive<Record<string, string>>({})
const patch = (values: Partial<AdminPostInput>) => {
  if (!props.locked) emit('change', { ...props.input, ...values })
}
const field = <K extends keyof AdminPostInput>(key: K) =>
  computed({
    get: () => props.input[key],
    set: (value: AdminPostInput[K]) => patch({ [key]: value }),
  })
const title = field('title')
const slug = field('slug')
const summary = field('summary')
const body = field('body')
const coverUrl = computed({
  get: () => props.input.cover_url ?? '',
  set: (value: string) => patch({ cover_url: value }),
})
const coverAlt = computed({
  get: () => props.input.cover_alt ?? '',
  set: (value: string) => patch({ cover_alt: value }),
})
const isPinned = computed({
  get: () => props.input.is_pinned ?? false,
  set: (value: boolean) => patch({ is_pinned: value }),
})
const toggleTag = (id: string) => {
  const tagIds = props.input.tag_ids ?? []
  const tagId = Number(id)
  patch({
    tag_ids: tagIds.includes(tagId)
      ? tagIds.filter((value) => value !== tagId)
      : [...tagIds, tagId],
  })
}
const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!title.value.trim()) validation.title = '请输入文章标题。'
  if (!slug.value.trim()) validation.slug = '请输入公开 slug。'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value.trim())) {
    validation.slug = 'slug 只能使用小写字母、数字和连字符。'
  }
  return Object.keys(validation).length === 0
}
const submit = () => {
  if (props.canSave && validate()) emit('save')
}
const preview = () => {
  if (!props.locked && props.editorReady && validate()) emit('preview')
}
</script>

<template>
  <form
    class="admin-post-form"
    :data-markdown-editor-ready="editorReady ? 'true' : 'false'"
    novalidate
    @submit.prevent="submit"
  >
    <section
      v-if="isLoading"
      class="admin-post-form__loading"
      data-testid="admin-post-loading"
      role="status"
      aria-busy="true"
    >
      <strong>正在准备编辑器…</strong>
      <span class="admin-post-form__skeleton" aria-hidden="true" />
      <span class="admin-post-form__skeleton" aria-hidden="true" />
      <span
        class="admin-post-form__skeleton admin-post-form__skeleton--tall"
        aria-hidden="true"
      />
    </section>
    <section
      v-else
      class="admin-post-form__main"
      aria-labelledby="post-content-title"
    >
      <div class="admin-form-section-heading">
        <div>
          <p class="admin-form-eyebrow">01 / MAIN TEXT</p>
          <h2 id="post-content-title">文章内容</h2>
        </div>
        <UiBadge
          v-if="post"
          :tone="post.status === 'published' ? 'success' : 'neutral'"
        >
          {{ post.status === 'published' ? '已发布' : '草稿' }}
        </UiBadge>
      </div>

      <UiInput
        v-model="title"
        :disabled="locked"
        label="标题"
        name="title"
        placeholder="给这篇文章一个清晰的名字"
        :error="validation.title"
        required
      />
      <UiInput
        v-model="slug"
        :disabled="locked"
        label="Slug"
        name="slug"
        description="公开 URL 使用小写字母、数字和连字符。"
        placeholder="a-quiet-title"
        :error="validation.slug"
        required
      />
      <UiTextarea
        v-model="summary"
        :disabled="locked"
        label="摘要"
        name="summary"
        description="用于列表、搜索和社交分享的短摘要。"
        placeholder="用一两句话说明这篇文章会带读者去哪里。"
        :rows="3"
      />
      <div class="admin-post-form__markdown-field">
        <label id="markdown-editor-label" class="field__label"
          >Markdown 正文</label
        >
        <p class="field__description">
          Markdown
          是持久化核心格式；支持标题、引用、代码、表格、链接和数学公式。
        </p>
        <AdminMarkdownEditor
          v-model="body"
          :disabled="locked"
          @ready="emit('canonical', $event)"
        />
      </div>
    </section>

    <aside
      v-if="!isLoading"
      class="admin-post-form__side"
      aria-label="文章属性"
    >
      <section
        class="admin-post-form__section"
        aria-labelledby="taxonomy-title"
      >
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">02 / CATALOGUE</p>
            <h2 id="taxonomy-title">文章标签</h2>
          </div>
        </div>
        <fieldset class="admin-tag-fieldset">
          <legend>标签</legend>
          <p class="field__description">
            选择文章主题，方便读者继续发现相关内容。
          </p>
          <div v-if="tags.length" class="admin-tag-options">
            <label v-for="tag in tags" :key="tag.id" class="admin-tag-option">
              <input
                type="checkbox"
                :disabled="locked"
                :checked="(input.tag_ids ?? []).includes(Number(tag.id))"
                :value="tag.id"
                @change="toggleTag(tag.id)"
              />
              <span>{{ tag.name }}</span>
              <small>{{ tag.postCount }}</small>
            </label>
          </div>
          <p v-else class="admin-form-muted">还没有可用标签，请先创建一个。</p>
        </fieldset>
      </section>

      <section class="admin-post-form__section" aria-labelledby="cover-title">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">03 / COVER</p>
            <h2 id="cover-title">封面引用</h2>
          </div>
        </div>
        <UiInput
          v-model="coverUrl"
          :disabled="locked"
          label="封面 URL"
          name="cover_url"
          type="url"
        />
        <UiInput
          v-model="coverAlt"
          :disabled="locked"
          label="封面替代文本"
          name="cover_alt"
        />
      </section>

      <section
        class="admin-post-form__section"
        aria-labelledby="publishing-title"
      >
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">04 / VISIBILITY</p>
            <h2 id="publishing-title">发布设置</h2>
          </div>
        </div>
        <label class="admin-switch">
          <input v-model="isPinned" type="checkbox" :disabled="locked" />
          <span>置顶这篇文章</span>
        </label>
      </section>

      <footer v-if="!isLoading" class="admin-post-form__actions">
        <p v-if="dirty" class="admin-post-form__dirty" role="status">
          有未保存的更改
        </p>
        <UiButton
          type="button"
          variant="secondary"
          :disabled="locked || !editorReady"
          @click="preview"
        >
          预览
        </UiButton>
        <UiButton type="submit" :loading="isSubmitting" :disabled="!canSave">
          保存草稿
        </UiButton>
      </footer>
    </aside>

    <div v-if="errorMessage" class="admin-post-form__error" role="alert">
      {{ errorMessage }}
    </div>
  </form>
</template>

<style scoped>
.admin-post-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22.5rem;
  align-items: start;
  gap: clamp(1rem, 2vw, 2rem);
  padding-block: var(--space-6) var(--space-16);
}

.admin-post-form__main,
.admin-post-form__side,
.admin-post-form__section {
  display: grid;
  gap: var(--space-5);
}

.admin-post-form__markdown-field {
  display: grid;
  gap: var(--space-3);
}

.admin-post-form__main,
.admin-post-form__section {
  padding: clamp(1.5rem, 2.5vw, 2.75rem);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  box-shadow: none;
}

.admin-post-form__main > :deep(.field) {
  max-width: 52rem;
}

.admin-post-form__main :deep(input[name='title']) {
  min-height: 4.25rem;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2.1vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.04em;
}

.admin-post-form__main :deep(input[name='slug']) {
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.admin-post-form__side {
  align-content: start;
}

.admin-form-section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}

.admin-form-section-heading h2,
.admin-form-eyebrow {
  margin: 0;
}

.admin-form-section-heading h2 {
  margin-top: var(--space-2);
  font-size: var(--text-h3);
}

.admin-form-eyebrow {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-tag-fieldset {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  border: 0;
}

.admin-tag-fieldset legend {
  padding: 0;
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
}

.admin-tag-fieldset .field__description {
  margin: 0;
}

.admin-tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.admin-tag-option {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  color: var(--color-text-muted);
  cursor: pointer;
}

.admin-tag-option:has(input:checked) {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.admin-tag-option small {
  color: var(--color-text-subtle);
}

.admin-form-muted {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-switch {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-muted);
  cursor: pointer;
}

.admin-switch input,
.admin-tag-option input {
  accent-color: var(--color-accent);
}

.admin-post-form__error {
  grid-column: 1 / -1;
  padding: var(--space-4);
  border-radius: var(--radius-medium);
}

.admin-post-form__error {
  border: var(--border-hairline) solid var(--color-danger-border);
  background: var(--color-danger-surface);
  color: var(--color-danger);
}

.admin-post-form__loading {
  display: grid;
  grid-column: 1 / -1;
  gap: var(--space-4);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  color: var(--color-text-muted);
  text-align: center;
}

.admin-post-form__skeleton {
  display: block;
  height: 1rem;
  margin-inline: auto;
  width: min(28rem, 100%);
  border-radius: var(--radius-round);
  background: var(--glass-bg-hover);
}

.admin-post-form__skeleton--tall {
  height: 16rem;
}

.admin-post-form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-canvas-raised);
}

.admin-post-form__dirty {
  flex: 1;
  margin: 0;
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

@media (width <= 52rem) {
  .admin-post-form {
    grid-template-columns: 1fr;
  }

  .admin-post-form__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-post-form__side > :last-child {
    grid-column: 1 / -1;
  }
}

@media (width <= 30rem) {
  .admin-post-form__main,
  .admin-post-form__section {
    padding: var(--space-4);
    border-radius: var(--radius-large);
  }

  .admin-post-form__actions {
    position: sticky;
    z-index: var(--z-sticky);
    bottom: 0;
    padding: var(--space-3);
    border: var(--border-hairline) solid var(--glass-border);
    border-radius: var(--radius-medium);
    background: var(--glass-elevated-bg);
    box-shadow: 0 -0.5rem 1.5rem rgb(55 50 35 / 6%);
  }

  .admin-post-form__side {
    grid-template-columns: 1fr;
  }

  .admin-post-form__actions .button {
    flex: 1 1 8rem;
  }
}
</style>
