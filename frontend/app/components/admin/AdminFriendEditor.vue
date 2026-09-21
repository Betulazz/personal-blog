<script setup lang="ts">
import { useApiClient } from '~/api/client'
import { useAdminPortfolioEditor } from '~/composables/useAdminPortfolioEditor'
import type {
  AdminFriendLink,
  AdminFriendLinkInput,
} from '~/types/admin-portfolio'

const props = defineProps<{ id?: string }>()
const api = useApiClient()
const editor = useAdminPortfolioEditor<AdminFriendLink, AdminFriendLinkInput>({
  api: {
    create: api.createAdminFriend,
    delete: api.deleteAdminFriend,
    get: api.getAdminFriend,
    update: (id, input) => api.updateAdminFriend(id, input),
  },
  empty: () => ({
    avatar_alt: null,
    avatar_url: null,
    description: '',
    display_order: 0,
    is_active: true,
    name: '',
    url: '',
  }),
  id: props.id,
  resource: 'friends',
  toInput: (record) => ({
    avatar_alt: record.avatarAlt,
    avatar_url: record.avatarUrl,
    description: record.description,
    display_order: record.displayOrder,
    is_active: record.isActive,
    name: record.name,
    url: record.url,
  }),
})
const {
  busy,
  error,
  form,
  load,
  loadFailed,
  loading,
  notice,
  record,
  remove,
  save,
} = editor
const validation = reactive<Record<string, string>>({})

const isHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value)
const isMediaUrl = (value: string) =>
  isHttpUrl(value) ||
  (/^\/uploads\/[^\s]+$/.test(value) && !value.startsWith('//'))

const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!form.value.name.trim()) validation.name = '请输入友链名称。'
  if (!form.value.description.trim())
    validation.description = '请输入友链描述。'
  if (!form.value.url.trim() || !isHttpUrl(form.value.url.trim())) {
    validation.url = '请输入安全的 HTTP(S) URL。'
  }
  if (form.value.avatar_url && !isMediaUrl(form.value.avatar_url.trim())) {
    validation.avatarUrl = '请输入安全的 HTTP(S) URL 或 /uploads/ 媒体路径。'
  }
  return Object.keys(validation).length === 0
}

const submit = () => {
  if (!validate()) return
  form.value.name = form.value.name.trim()
  form.value.description = form.value.description.trim()
  form.value.url = form.value.url.trim()
  form.value.avatar_url = form.value.avatar_url?.trim() || null
  form.value.avatar_alt = form.value.avatar_alt?.trim() || null
  void save()
}

useHead({ title: `${props.id ? '编辑' : '新建'}友链 · 后台空间` })
</script>

<template>
  <AdminPortfolioEditorFrame
    label="友链"
    resource="friends"
    :editing="Boolean(id)"
    :record="record"
    :loading="loading"
    :load-failed="loadFailed"
    :busy="busy"
    :error="error || Object.values(validation).join(' ')"
    :notice="notice"
    @reload="load"
    @delete="remove"
  >
    <form class="admin-portfolio-form" novalidate @submit.prevent="submit">
      <UiGlassPanel class="admin-portfolio-form__main" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Curated connection</p>
            <h2>友链内容</h2>
          </div>
        </div>
        <UiInput
          v-model="form.name"
          label="友链名称"
          name="friend_name"
          maxlength="200"
          :error="validation.name"
          required
        />
        <UiTextarea
          v-model="form.description"
          label="友链描述"
          name="friend_description"
          :rows="5"
          maxlength="2000"
          :error="validation.description"
          required
        />
        <UiInput
          v-model="form.url"
          label="目标 URL"
          name="friend_url"
          type="url"
          description="只接受安全的 HTTP(S) 目的地，不模拟在线状态。"
          :error="validation.url"
          required
        />
        <div class="admin-portfolio-pair">
          <label class="admin-number-field">
            <span>展示顺序</span>
            <input
              v-model.number="form.display_order"
              class="field__control"
              type="number"
              min="0"
              max="2147483647"
              required
            />
          </label>
          <label class="admin-switch">
            <input v-model="form.is_active" type="checkbox" />
            <span>公开展示</span>
            <small>关闭后保留内容，但不出现在公开友链页。</small>
          </label>
        </div>
      </UiGlassPanel>

      <UiGlassPanel class="admin-portfolio-form__side" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Media reference</p>
            <h2>头像与预览</h2>
          </div>
        </div>
        <UiInput
          :model-value="form.avatar_url ?? ''"
          label="头像 URL"
          name="avatar_url"
          description="可使用合法 HTTP(S) 图片或已有的 /uploads/ 媒体。"
          :error="validation.avatarUrl"
          @update:model-value="form.avatar_url = $event"
        />
        <UiInput
          :model-value="form.avatar_alt ?? ''"
          label="头像替代文本"
          name="avatar_alt"
          maxlength="200"
          @update:model-value="form.avatar_alt = $event"
        />
        <div class="admin-portfolio-preview" aria-label="友链公开呈现预览">
          <span>公开呈现预览</span>
          <strong>{{ form.name || '友链名称' }}</strong>
          <p>{{ form.description || '友链描述会显示在这里。' }}</p>
          <small
            >{{ form.is_active ? '公开展示' : '已隐藏' }} ·
            {{ form.url || '安全目的地' }}</small
          >
        </div>
        <UiButton type="submit" :loading="busy">保存友链</UiButton>
      </UiGlassPanel>
    </form>
  </AdminPortfolioEditorFrame>
</template>

<style scoped>
.admin-portfolio-form {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
  gap: var(--space-6);
}

.admin-portfolio-form__main,
.admin-portfolio-form__side {
  display: grid;
  align-content: start;
  gap: var(--space-5);
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

.admin-portfolio-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.admin-number-field {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
}

.admin-switch {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
  min-height: 2.75rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.admin-switch input {
  accent-color: var(--color-accent);
}

.admin-switch small {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-portfolio-preview {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
}

.admin-portfolio-preview span {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-portfolio-preview strong {
  font-size: var(--text-body-large);
}

.admin-portfolio-preview p,
.admin-portfolio-preview small {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.6;
}

@media (width <= 52rem) {
  .admin-portfolio-form {
    grid-template-columns: 1fr;
  }
}

@media (width <= 30rem) {
  .admin-portfolio-pair {
    grid-template-columns: 1fr;
  }

  .admin-switch {
    grid-template-columns: auto auto;
  }

  .admin-switch small {
    grid-column: 2;
  }
}
</style>
