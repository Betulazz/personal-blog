<script setup lang="ts">
import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type {
  AdminSiteSettings,
  AdminSiteSettingsInput,
} from '~/types/admin-portfolio'
import type { SiteSocialLink } from '~/types/site'

interface SettingsForm {
  avatarAlt: string
  avatarUrl: string
  contactEmail: string
  contactNote: string
  description: string
  faviconUrl: string
  footerCopyright: string
  footerIcp: string
  footerNote: string
  homepageVisibility: {
    chatter: boolean
    friends: boolean
    music: boolean
    moments: boolean
    posts: boolean
    projects: boolean
  }
  name: string
  profile: string
  seoCanonicalUrl: string
  seoDescription: string
  seoKeywords: string
  seoOgImageUrl: string
  seoTitle: string
  seoTwitterCard: 'summary' | 'summary_large_image'
  socialLinks: SiteSocialLink[]
  tagline: string
}

const emptyForm = (): SettingsForm => ({
  avatarAlt: '',
  avatarUrl: '',
  contactEmail: '',
  contactNote: '',
  description: '',
  faviconUrl: '',
  footerCopyright: '',
  footerIcp: '',
  footerNote: '',
  homepageVisibility: {
    chatter: true,
    friends: true,
    music: true,
    moments: true,
    posts: true,
    projects: true,
  },
  name: '',
  profile: '',
  seoCanonicalUrl: '',
  seoDescription: '',
  seoKeywords: '',
  seoOgImageUrl: '',
  seoTitle: '',
  seoTwitterCard: 'summary_large_image',
  socialLinks: [],
  tagline: '',
})

const toForm = (settings: AdminSiteSettings): SettingsForm => ({
  avatarAlt: settings.avatarAlt ?? '',
  avatarUrl: settings.avatarUrl ?? '',
  contactEmail: settings.contact.email,
  contactNote: settings.contact.note,
  description: settings.description,
  faviconUrl: settings.faviconUrl ?? '',
  footerCopyright: settings.footer.copyright,
  footerIcp: settings.footer.icp,
  footerNote: settings.footer.note,
  homepageVisibility: { ...settings.homepageVisibility },
  name: settings.name,
  profile: settings.profile,
  seoCanonicalUrl: settings.seoDefaults.canonicalUrl ?? '',
  seoDescription: settings.seoDefaults.description,
  seoKeywords: settings.seoDefaults.keywords.join(', '),
  seoOgImageUrl: settings.seoDefaults.ogImageUrl ?? '',
  seoTitle: settings.seoDefaults.title,
  seoTwitterCard: settings.seoDefaults.twitterCard,
  socialLinks: settings.socialLinks.map((link) => ({ ...link })),
  tagline: settings.tagline,
})

const splitList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

const toInput = (form: SettingsForm): AdminSiteSettingsInput => ({
  avatar_alt: form.avatarAlt.trim() || null,
  avatar_url: form.avatarUrl.trim() || null,
  contact: {
    email: form.contactEmail.trim(),
    note: form.contactNote.trim(),
  },
  description: form.description.trim(),
  favicon_url: form.faviconUrl.trim() || null,
  footer: {
    copyright: form.footerCopyright.trim(),
    icp: form.footerIcp.trim(),
    note: form.footerNote.trim(),
  },
  homepage_visibility: { ...form.homepageVisibility },
  name: form.name.trim(),
  profile: form.profile.trim(),
  seo_defaults: {
    canonical_url: form.seoCanonicalUrl.trim() || null,
    description: form.seoDescription.trim(),
    keywords: splitList(form.seoKeywords),
    og_image_url: form.seoOgImageUrl.trim() || null,
    title: form.seoTitle.trim(),
    twitter_card: form.seoTwitterCard,
  },
  social_links: form.socialLinks
    .map((link) => ({
      href: link.href.trim(),
      kind: link.kind,
      label: link.label.trim(),
    }))
    .filter((link) => link.label || link.href),
  tagline: form.tagline.trim(),
})

const api = useApiClient()
const session = useAdminSession()
const form = useState<SettingsForm>('admin-draft:settings', emptyForm)
const initialized = useState('admin-draft:settings:initialized', () => false)
const settings = ref<AdminSiteSettings | null>(null)
const loading = ref(true)
const loadFailed = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const validation = reactive<Record<string, string>>({})
let loadController: AbortController | null = null

const friendlyError = (failure: unknown) => {
  if (!(failure instanceof BlogApiError)) return '保存失败，当前输入仍然保留。'
  if (failure.status === 401)
    return '会话已过期，请重新登录；当前输入仍然保留。'
  if (failure.status === 403) return '当前账号没有管理网站设置的权限。'
  if (failure.status === 422) return '请检查设置字段格式，当前输入仍然保留。'
  if (failure.status === 0 || failure.status >= 500) {
    return '后台服务暂时无法响应，当前输入仍然保留。'
  }
  return '保存失败，当前输入仍然保留。'
}

const load = async () => {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  loadFailed.value = false
  error.value = ''
  try {
    const loaded = await session.withSession(() =>
      api.getAdminSettings(controller.signal),
    )
    settings.value = loaded
    if (!initialized.value) {
      form.value = toForm(loaded)
      initialized.value = true
    }
  } catch (failure) {
    if (isAbortError(failure)) return
    loadFailed.value = true
    error.value = friendlyError(failure)
  } finally {
    loading.value = false
  }
}

const isHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value)
const isMediaUrl = (value: string) =>
  isHttpUrl(value) ||
  (/^\/uploads\/[^\s]+$/.test(value) && !value.startsWith('//'))

const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!form.value.name.trim()) validation.name = '请输入网站名称。'
  for (const field of ['avatarUrl', 'faviconUrl', 'seoOgImageUrl'] as const) {
    const value = form.value[field].trim()
    if (value && !isMediaUrl(value)) {
      validation[field] = '请输入安全的 HTTP(S) URL 或 /uploads/ 媒体路径。'
    }
  }
  if (
    form.value.seoCanonicalUrl.trim() &&
    !isHttpUrl(form.value.seoCanonicalUrl.trim())
  ) {
    validation.seoCanonicalUrl = '请输入安全的 HTTP(S) URL。'
  }
  form.value.socialLinks.forEach((link, index) => {
    if (link.label.trim() && !isHttpUrl(link.href.trim())) {
      validation[`social-${index}`] = '社交链接必须使用安全的 HTTP(S) URL。'
    }
  })
  if (
    form.value.contactEmail.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.contactEmail.trim())
  ) {
    validation.contactEmail = '请输入有效的联系邮箱。'
  }
  return Object.keys(validation).length === 0
}

const save = async () => {
  if (busy.value || !validate()) return
  busy.value = true
  error.value = ''
  notice.value = ''
  const input = structuredClone(toRaw(toInput(form.value)))
  const submittedDraft = JSON.stringify(toRaw(form.value))
  try {
    const saved = await session.withSession(() =>
      api.updateAdminSettings(input),
    )
    settings.value = saved
    if (JSON.stringify(toRaw(form.value)) === submittedDraft) {
      form.value = toForm(saved)
    }
    initialized.value = true
    notice.value = '设置已保存'
  } catch (failure) {
    error.value = friendlyError(failure)
  } finally {
    busy.value = false
  }
}

const addSocialLink = () =>
  form.value.socialLinks.push({ href: '', kind: 'social', label: '' })
const removeSocialLink = (index: number) =>
  form.value.socialLinks.splice(index, 1)

const previewName = computed(() => form.value.name.trim() || '网站名称')
const previewTagline = computed(
  () => form.value.tagline.trim() || '网站标语会显示在这里。',
)
const visibilityItems: Array<{
  key: keyof SettingsForm['homepageVisibility']
  label: string
}> = [
  { key: 'posts', label: '首页显示文章' },
  { key: 'moments', label: '首页显示 Moments' },
  { key: 'chatter', label: '首页显示 Chatter' },
  { key: 'projects', label: '首页显示精选项目' },
  { key: 'friends', label: '首页显示友链' },
  { key: 'music', label: '首页显示音乐' },
]

watch(
  () => session.status,
  (status) => {
    if (status === 'authenticated') void load()
  },
  { immediate: true },
)

onBeforeUnmount(() => loadController?.abort())

useHead({ title: '网站设置 · 后台空间' })

function isAbortError(failure: unknown) {
  return (
    (failure instanceof Error && failure.name === 'AbortError') ||
    (typeof failure === 'object' &&
      failure !== null &&
      'name' in failure &&
      failure.name === 'AbortError')
  )
}
</script>

<template>
  <div class="admin-settings-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">Site Identity workspace</p>
        <h1>网站设置</h1>
        <p>集中维护公开身份、搜索摘要、联系信息与首页内容开关。</p>
      </div>
    </header>

    <section
      v-if="loading"
      class="admin-resource-state"
      role="status"
      aria-busy="true"
    >
      正在读取网站设置…
    </section>
    <section v-else-if="loadFailed" class="admin-resource-state" role="alert">
      <strong>网站设置暂时无法加载</strong>
      <p>{{ error }}</p>
      <UiButton variant="secondary" @click="load">重新加载</UiButton>
    </section>
    <form v-else class="admin-settings-form" novalidate @submit.prevent="save">
      <div v-if="error" class="admin-settings-error" role="alert">
        {{ error }}
      </div>
      <p v-if="notice" class="admin-settings-notice" role="status">
        {{ notice }}
      </p>

      <UiGlassPanel class="admin-settings-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Identity</p>
            <h2>公开身份</h2>
          </div>
        </div>
        <UiInput
          v-model="form.name"
          label="网站名称"
          :error="validation.name"
          required
        />
        <UiInput v-model="form.tagline" label="网站标语" maxlength="500" />
        <UiTextarea
          v-model="form.description"
          label="网站描述"
          :rows="4"
          maxlength="5000"
          description="首页、搜索与公开分享会使用这段描述。"
        />
        <UiTextarea
          v-model="form.profile"
          label="个人简介"
          :rows="4"
          maxlength="10000"
          description="用于 About 页面和个人介绍区域。"
        />
        <div class="admin-settings-pair">
          <UiInput
            v-model="form.avatarUrl"
            label="头像 URL"
            :error="validation.avatarUrl"
          />
          <UiInput
            v-model="form.avatarAlt"
            label="头像替代文本"
            maxlength="200"
          />
        </div>
        <UiInput
          v-model="form.faviconUrl"
          label="Favicon URL"
          :error="validation.faviconUrl"
        />
      </UiGlassPanel>

      <UiGlassPanel class="admin-settings-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Search presentation</p>
            <h2>SEO 默认值</h2>
          </div>
        </div>
        <UiInput
          v-model="form.seoTitle"
          label="默认 SEO 标题"
          maxlength="200"
        />
        <UiTextarea
          v-model="form.seoDescription"
          label="默认 SEO 描述"
          :rows="3"
          maxlength="500"
        />
        <UiInput
          v-model="form.seoKeywords"
          label="SEO 关键词"
          description="使用逗号分隔。"
          maxlength="1000"
        />
        <UiInput
          v-model="form.seoCanonicalUrl"
          label="Canonical URL"
          type="url"
          :error="validation.seoCanonicalUrl"
        />
        <UiInput
          v-model="form.seoOgImageUrl"
          label="Open Graph 图片 URL"
          :error="validation.seoOgImageUrl"
        />
        <UiSelect
          v-model="form.seoTwitterCard"
          label="Twitter Card"
          :options="[
            { label: 'Summary', value: 'summary' },
            { label: 'Summary Large Image', value: 'summary_large_image' },
          ]"
        />
      </UiGlassPanel>

      <UiGlassPanel class="admin-settings-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Public connections</p>
            <h2>社交链接</h2>
          </div>
          <UiButton
            type="button"
            variant="secondary"
            size="small"
            @click="addSocialLink"
          >
            添加社交链接
          </UiButton>
        </div>
        <div v-if="!form.socialLinks.length" class="admin-form-muted">
          还没有社交链接。
        </div>
        <div
          v-for="(link, index) in form.socialLinks"
          :key="index"
          class="admin-settings-repeat"
          role="group"
          :aria-label="`社交链接 ${index + 1}`"
        >
          <UiInput v-model="link.label" :label="`社交链接名称 ${index + 1}`" />
          <UiInput
            v-model="link.href"
            :label="`社交链接地址 ${index + 1}`"
            type="url"
            :error="validation[`social-${index}`]"
          />
          <UiSelect
            v-model="link.kind"
            :label="`社交链接类型 ${index + 1}`"
            :options="[
              { label: 'Social', value: 'social' },
              { label: 'Code', value: 'code' },
            ]"
          />
          <UiButton
            type="button"
            variant="ghost"
            @click="removeSocialLink(index)"
          >
            移除链接
          </UiButton>
        </div>
      </UiGlassPanel>

      <UiGlassPanel class="admin-settings-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Homepage composition</p>
            <h2>首页显示</h2>
          </div>
        </div>
        <fieldset class="admin-settings-checks">
          <legend>首页模块可见性</legend>
          <label v-for="item in visibilityItems" :key="item.key">
            <input
              v-model="form.homepageVisibility[item.key]"
              type="checkbox"
            />
            <span>{{ item.label }}</span>
          </label>
        </fieldset>
      </UiGlassPanel>

      <UiGlassPanel class="admin-settings-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Footer and contact</p>
            <h2>页脚与联系</h2>
          </div>
        </div>
        <UiTextarea
          v-model="form.footerNote"
          label="页脚说明"
          :rows="3"
          maxlength="500"
        />
        <div class="admin-settings-pair">
          <UiInput
            v-model="form.footerCopyright"
            label="版权信息"
            maxlength="200"
          />
          <UiInput v-model="form.footerIcp" label="ICP备案" maxlength="120" />
        </div>
        <div class="admin-settings-pair">
          <UiInput
            v-model="form.contactEmail"
            label="联系邮箱"
            type="email"
            :error="validation.contactEmail"
          />
          <UiInput
            v-model="form.contactNote"
            label="联系方式说明"
            maxlength="500"
          />
        </div>
      </UiGlassPanel>

      <UiGlassPanel
        as="section"
        class="admin-settings-preview"
        padding="spacious"
        aria-label="公开呈现预览"
      >
        <p class="admin-form-eyebrow">Public preview</p>
        <h2>{{ previewName }}</h2>
        <p>{{ previewTagline }}</p>
        <small>{{ form.description || '网站描述会显示在这里。' }}</small>
        <span
          >公开模块：{{
            Object.values(form.homepageVisibility).filter(Boolean).length
          }}
          / 6</span
        >
      </UiGlassPanel>

      <footer class="admin-settings-actions">
        <UiButton type="submit" :loading="busy">保存网站设置</UiButton>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.admin-settings-page {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6) var(--space-16);
  min-width: 0;
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

.admin-settings-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
}

.admin-settings-section,
.admin-settings-preview {
  display: grid;
  align-content: start;
  gap: var(--space-5);
}

.admin-settings-section:nth-of-type(1),
.admin-settings-section:nth-of-type(2),
.admin-settings-section:nth-of-type(5),
.admin-settings-preview,
.admin-settings-error,
.admin-settings-actions {
  grid-column: 1 / -1;
}

.admin-form-section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
}

.admin-form-section-heading h2,
.admin-form-section-heading p,
.admin-form-eyebrow {
  margin: 0;
}

.admin-form-section-heading h2 {
  margin-top: var(--space-2);
  font-size: var(--text-h3);
}

.admin-settings-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.admin-settings-repeat {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
}

.admin-settings-checks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  border: 0;
}

.admin-settings-checks legend {
  margin-bottom: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.admin-settings-checks label {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  cursor: pointer;
}

.admin-settings-checks input {
  accent-color: var(--color-accent);
}

.admin-settings-preview {
  border-color: var(--glass-border-hover);
  background:
    radial-gradient(circle at 85% 0%, var(--glow-accent), transparent 18rem),
    var(--glass-panel-bg);
}

.admin-settings-preview h2,
.admin-settings-preview p,
.admin-settings-preview small,
.admin-settings-preview span {
  margin: 0;
}

.admin-settings-preview h2 {
  font-size: clamp(1.75rem, 4vw, 3rem);
}

.admin-settings-preview p {
  color: var(--color-text-muted);
  font-size: var(--text-body-large);
}

.admin-settings-preview small,
.admin-settings-preview span,
.admin-form-muted {
  color: var(--color-text-subtle);
}

.admin-settings-error {
  margin: 0;
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--color-danger-border);
  border-radius: var(--radius-medium);
  background: var(--color-danger-surface);
  color: var(--color-danger);
}

.admin-settings-notice {
  grid-column: 1 / -1;
  margin: 0;
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.admin-resource-state {
  display: grid;
  min-height: 14rem;
  place-content: center;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
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

.admin-resource-state strong {
  color: var(--color-text);
}

.admin-settings-actions {
  display: flex;
  justify-content: flex-end;
}

@media (width <= 52rem) {
  .admin-settings-form {
    grid-template-columns: 1fr;
  }

  .admin-settings-section:nth-of-type(1),
  .admin-settings-section:nth-of-type(2),
  .admin-settings-section:nth-of-type(5),
  .admin-settings-preview,
  .admin-settings-error,
  .admin-settings-actions {
    grid-column: auto;
  }

  .admin-settings-checks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 30rem) {
  .admin-settings-pair,
  .admin-settings-checks {
    grid-template-columns: 1fr;
  }

  .admin-settings-actions {
    position: sticky;
    z-index: var(--z-sticky);
    bottom: 0;
    padding: var(--space-3);
    border: var(--border-hairline) solid var(--glass-border);
    border-radius: var(--radius-medium);
    background: var(--glass-elevated-bg);
    backdrop-filter: blur(var(--glass-blur-panel));
  }

  .admin-settings-actions .button {
    width: 100%;
  }
}
</style>
