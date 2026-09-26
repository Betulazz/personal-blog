<script setup lang="ts">
import { useApiClient } from '~/api/client'
import { useAdminPortfolioEditor } from '~/composables/useAdminPortfolioEditor'
import type { AdminProject, AdminProjectInput } from '~/types/admin-portfolio'

const props = defineProps<{ id?: string }>()
const api = useApiClient()
const editor = useAdminPortfolioEditor<AdminProject, AdminProjectInput>({
  api: {
    create: api.createAdminProject,
    delete: api.deleteAdminProject,
    get: api.getAdminProject,
    update: (id, input) => api.updateAdminProject(id, input),
  },
  empty: () => ({
    demo_url: null,
    description: '',
    display_order: 0,
    featured: false,
    logo_alt: null,
    logo_url: null,
    name: '',
    project_type: 'personal',
    source_url: null,
    status: 'developing',
    technology: [],
    time_span: '',
  }),
  id: props.id,
  resource: 'projects',
  toInput: (record) => {
    const shared = {
      description: record.description,
      display_order: record.displayOrder,
      featured: record.featured,
      logo_alt: record.logoAlt,
      logo_url: record.logoUrl,
      name: record.name,
    }
    return record.projectType === 'github_open_source'
      ? {
          ...shared,
          project_type: 'github_open_source',
          repository_url: record.repositoryUrl,
        }
      : {
          ...shared,
          demo_url: record.demoUrl,
          project_type: 'personal',
          source_url: record.sourceUrl,
          status: record.status,
          technology: [...record.stack],
          time_span: record.timeSpan,
        }
  },
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
const stackText = useState(
  `admin-draft:projects:${props.id ?? 'new'}:stack-text`,
  () => '',
)
const validation = reactive<Record<string, string>>({})

watch(
  record,
  (value) => {
    stackText.value =
      value?.projectType === 'personal' ? value.stack.join(', ') : ''
  },
  { immediate: true },
)

const isHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value)
const isMediaUrl = (value: string) =>
  isHttpUrl(value) ||
  (/^\/uploads\/[^\s]+$/.test(value) && !value.startsWith('//'))

const isGithubRepositoryUrl = (value: string) =>
  /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/i.test(
    value,
  )

const changeProjectType = (value: string) => {
  if (value !== 'personal' && value !== 'github_open_source') return
  if (form.value.project_type === value) return
  const shared = {
    description: form.value.description,
    display_order: form.value.display_order,
    featured: form.value.featured,
    logo_alt: form.value.logo_alt,
    logo_url: form.value.logo_url,
    name: form.value.name,
  }
  form.value =
    value === 'personal'
      ? {
          ...shared,
          demo_url: null,
          project_type: 'personal',
          source_url: null,
          status: 'developing',
          technology: [],
          time_span: '',
        }
      : {
          ...shared,
          project_type: 'github_open_source',
          repository_url: '',
        }
  stackText.value = ''
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
}

const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!form.value.name.trim()) validation.name = '请输入项目名称。'
  if (!form.value.description.trim())
    validation.description = '请输入项目描述。'
  if (form.value.logo_url && !isMediaUrl(form.value.logo_url.trim())) {
    validation.logoUrl = '请输入安全的 HTTP(S) URL 或 /uploads/ 媒体路径。'
  }
  if (form.value.project_type === 'personal') {
    if (!form.value.time_span.trim()) validation.time_span = '请输入开发时间。'
    for (const field of ['source_url', 'demo_url'] as const) {
      const value = form.value[field]?.trim()
      if (value && !isHttpUrl(value))
        validation[field] = '请输入安全的 HTTP(S) URL。'
    }
  } else if (!isGithubRepositoryUrl(form.value.repository_url.trim())) {
    validation.repository_url = '请输入 GitHub 上有效的仓库 URL。'
  }
  return Object.keys(validation).length === 0
}

const submit = () => {
  if (!validate()) return
  const common = {
    description: form.value.description.trim(),
    display_order: form.value.display_order,
    featured: form.value.featured,
    logo_alt: form.value.logo_alt?.trim() || null,
    logo_url: form.value.logo_url?.trim() || null,
    name: form.value.name.trim(),
  }
  form.value =
    form.value.project_type === 'personal'
      ? {
          ...common,
          demo_url: form.value.demo_url?.trim() || null,
          project_type: 'personal',
          source_url: form.value.source_url?.trim() || null,
          status: form.value.status,
          technology: stackText.value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          time_span: form.value.time_span.trim(),
        }
      : {
          ...common,
          project_type: 'github_open_source',
          repository_url: form.value.repository_url.trim(),
        }
  void save()
}

useHead({ title: `${props.id ? '编辑' : '新建'}项目 · 后台空间` })
</script>

<template>
  <AdminPortfolioEditorFrame
    label="项目"
    resource="projects"
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
            <p class="admin-form-eyebrow">Portfolio entry</p>
            <h2>项目内容</h2>
          </div>
        </div>
        <UiSelect
          :model-value="form.project_type"
          label="项目类型"
          name="project_type"
          :options="[
            { label: 'Personal Project（个人项目）', value: 'personal' },
            {
              label: 'GitHub Open-source Project（GitHub 开源项目）',
              value: 'github_open_source',
            },
          ]"
          @update:model-value="changeProjectType"
        />
        <UiInput
          v-model="form.name"
          label="项目名称"
          name="project_name"
          maxlength="200"
          :error="validation.name"
          required
        />
        <UiTextarea
          v-model="form.description"
          label="项目描述"
          name="project_description"
          :rows="5"
          maxlength="5000"
          :error="validation.description"
          required
        />
        <template v-if="form.project_type === 'personal'">
          <UiInput
            v-model="stackText"
            label="技术栈"
            name="technology"
            description="使用逗号分隔，例如 Nuxt, TypeScript, MySQL。"
            maxlength="1000"
          />
          <UiInput
            v-model="form.time_span"
            label="开发时间"
            name="time_span"
            maxlength="120"
            :error="validation.time_span"
            required
          />
        </template>
        <UiInput
          v-else
          :model-value="form.repository_url"
          label="GitHub 仓库 URL"
          name="repository_url"
          type="url"
          description="手动维护仓库地址；当前不会从 GitHub 同步星标或语言等信息。"
          :error="validation.repository_url"
          required
          @update:model-value="form.repository_url = $event"
        />
        <div class="admin-portfolio-pair">
          <UiSelect
            v-if="form.project_type === 'personal'"
            v-model="form.status"
            label="状态"
            name="project_status"
            :options="[
              { label: '开发中', value: 'developing' },
              { label: '进行中', value: 'active' },
              { label: '已归档', value: 'archived' },
            ]"
          />
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
        </div>
        <label class="admin-switch">
          <input v-model="form.featured" type="checkbox" />
          <span>精选项目</span>
          <small>在首页项目区域优先展示。</small>
        </label>
      </UiGlassPanel>

      <UiGlassPanel class="admin-portfolio-form__side" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Media and links</p>
            <h2>媒体与链接</h2>
          </div>
        </div>
        <UiInput
          :model-value="form.logo_url ?? ''"
          label="项目 Logo URL"
          name="logo_url"
          description="可使用合法 HTTP(S) 图片或已有的 /uploads/ 媒体。"
          :error="validation.logoUrl"
          @update:model-value="form.logo_url = $event"
        />
        <UiInput
          :model-value="form.logo_alt ?? ''"
          label="Logo 替代文本"
          name="logo_alt"
          maxlength="200"
          @update:model-value="form.logo_alt = $event"
        />
        <UiInput
          v-if="form.project_type === 'personal'"
          :model-value="form.source_url ?? ''"
          label="Source URL"
          name="source_url"
          type="url"
          :error="validation.source_url"
          @update:model-value="form.source_url = $event"
        />
        <UiInput
          v-if="form.project_type === 'personal'"
          :model-value="form.demo_url ?? ''"
          label="Demo URL"
          name="demo_url"
          type="url"
          :error="validation.demo_url"
          @update:model-value="form.demo_url = $event"
        />
        <div class="admin-portfolio-preview" aria-label="项目公开呈现预览">
          <span>公开呈现预览</span>
          <strong>{{ form.name || '项目名称' }}</strong>
          <p>{{ form.description || '项目描述会显示在这里。' }}</p>
          <small v-if="form.project_type === 'personal'">
            {{ stackText || '技术栈' }} · {{ form.time_span || '开发时间' }}
          </small>
          <small v-else>GitHub Open-source Project</small>
        </div>
        <UiButton type="submit" :loading="busy">保存项目</UiButton>
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
