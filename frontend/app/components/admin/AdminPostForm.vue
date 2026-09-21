<script setup lang="ts">
import type { AdminPost, AdminPostInput, AdminTaxonomy } from '~/types/admin'

const props = withDefaults(
  defineProps<{
    categories?: AdminTaxonomy[]
    errorMessage?: string | null
    isLoading?: boolean
    isSubmitting?: boolean
    post?: AdminPost | null
    tags?: AdminTaxonomy[]
  }>(),
  {
    categories: () => [],
    errorMessage: null,
    isLoading: false,
    isSubmitting: false,
    post: null,
    tags: () => [],
  },
)

const emit = defineEmits<{
  preview: [value: AdminPostInput]
  save: [value: AdminPostInput]
}>()

const form = reactive({
  body: '',
  canonicalUrl: '',
  categoryId: '',
  coverAlt: '',
  coverUrl: '',
  isPinned: false,
  ogImageUrl: '',
  readingTime: '0',
  seoDescription: '',
  seoTitle: '',
  slug: '',
  summary: '',
  tagIds: [] as string[],
  title: '',
})
const validation = reactive<Record<string, string>>({})

const categoryOptions = computed(() => [
  { label: '暂不设置分类', value: 'none' },
  ...props.categories.map((category) => ({
    label: `${category.name}（${category.postCount} 篇）`,
    value: String(category.id),
  })),
])

const syncPost = (post: AdminPost | null) => {
  if (!post) return
  form.body = post.body
  form.canonicalUrl = post.canonicalUrl ?? ''
  form.categoryId = post.categoryId ?? 'none'
  form.coverAlt = post.coverAlt ?? ''
  form.coverUrl = post.coverUrl ?? ''
  form.isPinned = post.isPinned
  form.ogImageUrl = post.ogImageUrl ?? ''
  form.readingTime = String(post.readingTimeMinutes)
  form.seoDescription = post.seoDescription ?? ''
  form.seoTitle = post.seoTitle ?? ''
  form.slug = post.slug
  form.summary = post.summary
  form.tagIds = [...post.tagIds]
  form.title = post.title
}

watch(() => props.post, syncPost, { immediate: true })

const toggleTag = (id: string) => {
  form.tagIds = form.tagIds.includes(id)
    ? form.tagIds.filter((tagId) => tagId !== id)
    : [...form.tagIds, id]
}

const toInput = (): AdminPostInput => ({
  body: form.body,
  canonical_url: form.canonicalUrl.trim() || null,
  category_id:
    form.categoryId && form.categoryId !== 'none'
      ? Number(form.categoryId)
      : null,
  cover_alt: form.coverAlt.trim() || null,
  cover_url: form.coverUrl.trim() || null,
  is_pinned: form.isPinned,
  og_image_url: form.ogImageUrl.trim() || null,
  reading_time_minutes: Math.max(0, Number(form.readingTime) || 0),
  seo_description: form.seoDescription.trim() || null,
  seo_title: form.seoTitle.trim() || null,
  slug: form.slug.trim(),
  summary: form.summary.trim(),
  tag_ids: form.tagIds.map(Number),
  title: form.title.trim(),
})

const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!form.title.trim()) validation.title = '请输入文章标题。'
  if (!form.slug.trim()) validation.slug = '请输入公开 slug。'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
    validation.slug = 'slug 只能使用小写字母、数字和连字符。'
  }
  return Object.keys(validation).length === 0
}

const submit = () => {
  if (validate()) emit('save', toInput())
}

const preview = () => {
  if (validate()) emit('preview', toInput())
}
</script>

<template>
  <form class="admin-post-form" novalidate @submit.prevent="submit">
    <section class="admin-post-form__main" aria-labelledby="post-content-title">
      <div class="admin-form-section-heading">
        <div>
          <p class="admin-form-eyebrow">Long-form publication</p>
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
        v-model="form.title"
        label="标题"
        name="title"
        placeholder="给这篇文章一个清晰的名字"
        :error="validation.title"
        required
      />
      <UiInput
        v-model="form.slug"
        label="Slug"
        name="slug"
        description="公开 URL 使用小写字母、数字和连字符。"
        placeholder="a-quiet-title"
        :error="validation.slug"
        required
      />
      <UiTextarea
        v-model="form.summary"
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
        <AdminMarkdownEditor v-model="form.body" :disabled="isSubmitting" />
      </div>
    </section>

    <aside class="admin-post-form__side" aria-label="文章属性">
      <section
        class="admin-post-form__section"
        aria-labelledby="taxonomy-title"
      >
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Normalized metadata</p>
            <h2 id="taxonomy-title">分类与标签</h2>
          </div>
        </div>
        <UiSelect
          v-model="form.categoryId"
          label="分类"
          name="category"
          :options="categoryOptions"
        />
        <fieldset class="admin-tag-fieldset">
          <legend>标签</legend>
          <p class="field__description">可选择多个可复用的 Tag。</p>
          <div v-if="tags.length" class="admin-tag-options">
            <label v-for="tag in tags" :key="tag.id" class="admin-tag-option">
              <input
                type="checkbox"
                :checked="form.tagIds.includes(tag.id)"
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
            <p class="admin-form-eyebrow">Media reference</p>
            <h2 id="cover-title">封面引用</h2>
          </div>
        </div>
        <UiInput
          v-model="form.coverUrl"
          label="封面 URL"
          name="cover_url"
          type="url"
        />
        <UiInput
          v-model="form.coverAlt"
          label="封面替代文本"
          name="cover_alt"
        />
      </section>

      <section class="admin-post-form__section" aria-labelledby="seo-title">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Search presentation</p>
            <h2 id="seo-title">SEO 字段</h2>
          </div>
        </div>
        <UiInput v-model="form.seoTitle" label="SEO 标题" name="seo_title" />
        <UiTextarea
          v-model="form.seoDescription"
          label="SEO 描述"
          name="seo_description"
          :rows="3"
        />
        <UiInput
          v-model="form.canonicalUrl"
          label="Canonical URL"
          name="canonical_url"
          type="url"
        />
        <UiInput
          v-model="form.ogImageUrl"
          label="Open Graph 图片 URL"
          name="og_image_url"
          type="url"
        />
      </section>

      <section
        class="admin-post-form__section"
        aria-labelledby="publishing-title"
      >
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Publishing controls</p>
            <h2 id="publishing-title">发布设置</h2>
          </div>
        </div>
        <UiInput
          v-model="form.readingTime"
          label="阅读时长（分钟）"
          name="reading_time"
          type="text"
          inputmode="numeric"
        />
        <label class="admin-switch">
          <input v-model="form.isPinned" type="checkbox" />
          <span>置顶这篇文章</span>
        </label>
      </section>
    </aside>

    <div v-if="errorMessage" class="admin-post-form__error" role="alert">
      {{ errorMessage }}
    </div>
    <div v-if="isLoading" class="admin-post-form__loading" role="status">
      正在读取文章…
    </div>
    <footer class="admin-post-form__actions">
      <UiButton
        type="button"
        variant="secondary"
        :disabled="isSubmitting"
        @click="preview"
      >
        预览
      </UiButton>
      <UiButton type="submit" :loading="isSubmitting"> 保存草稿 </UiButton>
    </footer>
  </form>
</template>

<style scoped>
.admin-post-form {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
  gap: var(--space-6);
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
  padding: var(--space-6);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  box-shadow: var(--glass-highlight);
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
  border-radius: var(--radius-round);
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

.admin-post-form__error,
.admin-post-form__loading {
  grid-column: 1 / -1;
  padding: var(--space-4);
  border-radius: var(--radius-medium);
}

.admin-post-form__error {
  border: var(--border-hairline) solid var(--color-danger-border);
  background: var(--color-danger-surface);
  color: #fecdd3;
}

.admin-post-form__loading {
  color: var(--color-text-muted);
  text-align: center;
}

.admin-post-form__actions {
  display: flex;
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: var(--space-3);
}

@media (width <= 52rem) {
  .admin-post-form {
    grid-template-columns: 1fr;
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
    backdrop-filter: blur(var(--glass-blur-panel));
  }

  .admin-post-form__actions .button {
    flex: 1;
  }
}
</style>
