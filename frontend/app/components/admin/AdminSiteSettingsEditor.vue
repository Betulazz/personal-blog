<script setup lang="ts">
import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type {
  AdminSiteSettings,
  AdminSiteSettingsInput,
} from '~/types/admin-portfolio'
import type { SiteSocialIcon, SiteSocialLink } from '~/types/site'
import { sanitizeSocialIconSvg } from '~/utils/social-icon-svg'

interface SettingsForm {
  avatarAlt: string
  avatarUrl: string
  backgroundGallery: Array<{ alt: string; previewUrl: string; url: string }>
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
  socialLinks: SiteSocialLink[]
  tagline: string
}

const emptyForm = (): SettingsForm => ({
  avatarAlt: '',
  avatarUrl: '',
  backgroundGallery: [],
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
  socialLinks: [],
  tagline: '',
})

const toSocialIconInput = (
  icon: SiteSocialIcon | null | undefined,
): Pick<SiteSocialLink, 'icon'> => {
  if (icon?.type === 'media') {
    return {
      icon: {
        type: 'media',
        url: icon.reference ?? icon.url,
      },
    }
  }
  if (icon?.type === 'preset') {
    return { icon: { type: 'preset', preset: icon.preset } }
  }
  if (icon?.type === 'svg') {
    return { icon: { type: 'svg', source: icon.source } }
  }
  return {}
}

const toForm = (settings: AdminSiteSettings): SettingsForm => ({
  avatarAlt: settings.avatarAlt ?? '',
  avatarUrl: settings.avatarUrl ?? '',
  backgroundGallery: settings.backgroundGallery.map((image) => ({
    alt: image.alt,
    previewUrl: image.url,
    url: image.reference,
  })),
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
  socialLinks: settings.socialLinks.map((link) => ({ ...link })),
  tagline: settings.tagline,
})

const toInput = (form: SettingsForm): AdminSiteSettingsInput => ({
  avatar_alt: form.avatarAlt.trim() || null,
  avatar_url: form.avatarUrl.trim() || null,
  background_gallery: form.backgroundGallery.map((image) => ({
    alt: image.alt.trim(),
    url: image.url.trim(),
  })),
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
  social_links: form.socialLinks
    .map((link) => ({
      href: link.href.trim(),
      ...toSocialIconInput(link.icon),
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
const mediaPickerOpen = ref(false)
const socialIconPickerOpen = ref(false)
const socialIconTargetIndex = ref<number | null>(null)
const backgroundUrl = ref('')
const backgroundAlt = ref('')
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
const isSafeBackgroundUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return (
      parsed.protocol === 'https:' &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    )
  } catch {
    return false
  }
}
const backgroundReferenceKey = (value: string) => {
  if (value.startsWith('/uploads/')) return value
  try {
    const parsed = new URL(value)
    const port = parsed.port === '443' ? '' : parsed.port
    return `https://${parsed.hostname.toLowerCase()}${port ? `:${port}` : ''}${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return value
  }
}
const isMediaUrl = (value: string) =>
  isHttpUrl(value) ||
  (/^\/uploads\/[^\s]+$/.test(value) && !value.startsWith('//'))
const isSafeSocialIconReference = (value: string) => {
  const hasControlCharacter = Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 0x20 || code === 0x7f
  })
  if (
    !value.startsWith('/uploads/images/') ||
    /[?#\s\\]/.test(value) ||
    hasControlCharacter
  ) {
    return false
  }
  try {
    const key = decodeURIComponent(value).slice('/uploads/'.length)
    return (
      key.startsWith('images/') &&
      key.split('/').every((part) => part && part !== '.' && part !== '..')
    )
  } catch {
    return false
  }
}

const socialIconPresets = [
  { label: '通用图标（未选择）', value: 'none' },
  { label: 'GitHub', value: 'github' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Mastodon', value: 'mastodon' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'X', value: 'x' },
  { label: '网站', value: 'website' },
  { label: 'YouTube', value: 'youtube' },
  { label: '媒体库图片', value: 'custom-image' },
  { label: 'SVG 源码', value: 'custom-svg' },
]

const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!form.value.name.trim()) validation.name = '请输入网站名称。'
  for (const field of ['avatarUrl', 'faviconUrl'] as const) {
    const value = form.value[field].trim()
    if (value && !isMediaUrl(value)) {
      validation[field] = '请输入安全的 HTTP(S) URL 或 /uploads/ 媒体路径。'
    }
  }
  if (form.value.backgroundGallery.length > 12) {
    validation.backgroundGallery = '背景图库最多可添加 12 张图片。'
  }
  const seenBackgrounds = new Set<string>()
  form.value.backgroundGallery.forEach((image, index) => {
    if (!image.alt.trim()) {
      validation[`background-alt-${index}`] = '请为背景图片填写替代文本。'
    }
    if (
      !image.url.startsWith('/uploads/') &&
      !isSafeBackgroundUrl(image.url.trim())
    ) {
      validation[`background-url-${index}`] =
        '背景图片必须使用 HTTPS URL 或媒体库图片。'
    }
    const key = backgroundReferenceKey(image.url.trim())
    if (seenBackgrounds.has(key)) {
      validation.backgroundGallery = '背景图库不能重复引用同一张图片。'
    }
    seenBackgrounds.add(key)
  })
  form.value.socialLinks.forEach((link, index) => {
    if (link.label.trim() && !isHttpUrl(link.href.trim())) {
      validation[`social-${index}`] = '社交链接必须使用安全的 HTTP(S) URL。'
    }
    if (
      link.icon?.type === 'media' &&
      !isSafeSocialIconReference(link.icon.reference ?? link.icon.url)
    ) {
      validation[`social-icon-${index}`] =
        '自定义图标必须来自媒体库中的图片 Media Asset。'
    }
    if (
      link.icon?.type === 'svg' &&
      !sanitizeSocialIconSvg(link.icon.source)
    ) {
      validation[`social-icon-${index}`] =
        '请粘贴包含有效 viewBox 的 SVG 源码（最多 20000 个字符）。'
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
const socialIconChoiceFor = (link: SiteSocialLink) => {
  if (link.icon?.type === 'media') return 'custom-image'
  if (link.icon?.type === 'svg') return 'custom-svg'
  return link.icon?.type === 'preset' ? link.icon.preset : 'none'
}
const selectSocialIconPreset = (index: number, preset: string) => {
  const link = form.value.socialLinks[index]
  if (!link) return
  if (preset === 'custom-image') {
    openSocialIconPicker(index)
    return
  }
  if (preset === 'custom-svg') {
    editSocialIconSvg(index)
    return
  }
  link.icon = preset === 'none' ? null : { type: 'preset', preset }
}
const openSocialIconPicker = (index: number) => {
  socialIconTargetIndex.value = index
  socialIconPickerOpen.value = true
}
const selectSocialIconMedia = (asset: { reference: string; url: string }) => {
  const index = socialIconTargetIndex.value
  if (index === null || !form.value.socialLinks[index]) return
  const icon: SiteSocialIcon = {
    type: 'media',
    reference: asset.reference,
    url: asset.url,
  }
  form.value.socialLinks[index].icon = icon
  socialIconTargetIndex.value = null
}
const editSocialIconSvg = (index: number) => {
  const link = form.value.socialLinks[index]
  if (!link) return
  if (link.icon?.type !== 'svg') link.icon = { type: 'svg', source: '' }
}
const updateSocialIconSvg = (index: number, source: string) => {
  const link = form.value.socialLinks[index]
  if (link) link.icon = { type: 'svg', source }
}
const clearSocialIcon = (index: number) => {
  const link = form.value.socialLinks[index]
  if (link) link.icon = null
}

const addBackground = (url: string, alt: string, previewUrl = url) => {
  if (form.value.backgroundGallery.length >= 12) {
    validation.backgroundGallery = '背景图库最多可添加 12 张图片。'
    return false
  }
  if (
    form.value.backgroundGallery.some(
      (image) =>
        backgroundReferenceKey(image.url.trim()) ===
        backgroundReferenceKey(url.trim()),
    )
  ) {
    validation.backgroundGallery = '这张图片已经在背景图库中。'
    return false
  }
  if (!alt.trim()) {
    validation.backgroundAlt = '请填写背景图片替代文本。'
    return false
  }
  form.value.backgroundGallery.push({
    alt: alt.trim(),
    previewUrl,
    url: url.trim(),
  })
  validation.backgroundGallery = ''
  validation.backgroundAlt = ''
  return true
}

const addBackgroundUrl = () => {
  const url = backgroundUrl.value.trim()
  if (!isSafeBackgroundUrl(url)) {
    validation.backgroundUrl = '请输入安全的 HTTPS 图片 URL。'
    return
  }
  if (addBackground(url, backgroundAlt.value)) {
    backgroundUrl.value = ''
    backgroundAlt.value = ''
    validation.backgroundUrl = ''
  }
}

const addMediaBackground = (selection: { alt: string; reference: string }) => {
  if (addBackground(selection.reference, selection.alt, selection.reference)) {
    backgroundUrl.value = ''
    backgroundAlt.value = ''
  }
}

const removeBackground = (index: number) =>
  form.value.backgroundGallery.splice(index, 1)

const moveBackground = (index: number, offset: -1 | 1) => {
  const nextIndex = index + offset
  const gallery = form.value.backgroundGallery
  if (nextIndex < 0 || nextIndex >= gallery.length) return
  const current = gallery[index]
  const next = gallery[nextIndex]
  if (!current || !next) return
  gallery[index] = next
  gallery[nextIndex] = current
}

const previewName = computed(() => form.value.name.trim() || '网站名称')
const previewTagline = computed(
  () => form.value.tagline.trim() || '网站标语会显示在这里。',
)
const visibilityItems: Array<{
  key: keyof SettingsForm['homepageVisibility']
  label: string
}> = [
  { key: 'posts', label: '首页显示文章' },
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
        <p class="admin-settings-note">
          头像与 Favicon 可以直接使用
          <NuxtLink to="/admin/media">媒体管理</NuxtLink>
          中上传后的引用路径。
        </p>
      </UiGlassPanel>

      <UiGlassPanel class="admin-settings-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Background Gallery</p>
            <h2>背景图库</h2>
          </div>
          <span class="admin-form-muted"
            >{{ form.backgroundGallery.length }} / 12</span
          >
        </div>
        <p class="admin-settings-note">
          公开页面会按顺序显示并每 10 秒切换。支持安全 HTTPS 图片链接或
          <NuxtLink to="/admin/media">媒体库</NuxtLink>
          中已有的图片；空图库会使用内置背景。
        </p>
        <p
          v-if="validation.backgroundGallery"
          role="alert"
          class="admin-settings-error"
        >
          {{ validation.backgroundGallery }}
        </p>
        <div v-if="!form.backgroundGallery.length" class="admin-form-muted">
          还没有背景图片，公开页面会继续使用内置背景。
        </div>
        <ol v-else class="admin-background-gallery" aria-label="背景图库顺序">
          <li
            v-for="(image, index) in form.backgroundGallery"
            :key="`${image.url}-${index}`"
            class="admin-background-gallery__item"
          >
            <img :src="image.previewUrl" alt="" loading="lazy" />
            <div class="admin-background-gallery__details">
              <strong>{{ image.alt }}</strong>
              <span>{{ image.url }}</span>
              <small>顺序 {{ index + 1 }}</small>
            </div>
            <div class="admin-background-gallery__actions">
              <UiButton
                type="button"
                size="small"
                variant="secondary"
                :disabled="index === 0"
                :aria-label="`背景图片 ${index + 1} 上移`"
                @click="moveBackground(index, -1)"
              >
                上移
              </UiButton>
              <UiButton
                type="button"
                size="small"
                variant="secondary"
                :disabled="index === form.backgroundGallery.length - 1"
                :aria-label="`背景图片 ${index + 1} 下移`"
                @click="moveBackground(index, 1)"
              >
                下移
              </UiButton>
              <UiButton
                type="button"
                size="small"
                variant="ghost"
                :aria-label="`移除背景图片 ${index + 1}`"
                @click="removeBackground(index)"
              >
                移除
              </UiButton>
            </div>
          </li>
        </ol>
        <div class="admin-settings-pair">
          <UiInput
            v-model="backgroundUrl"
            label="背景图片 HTTPS URL"
            type="url"
            :error="validation.backgroundUrl"
          />
          <UiInput
            v-model="backgroundAlt"
            label="背景图片替代文本"
            maxlength="200"
            :error="validation.backgroundAlt"
          />
        </div>
        <div class="admin-background-gallery__add-actions">
          <UiButton
            type="button"
            variant="secondary"
            :disabled="form.backgroundGallery.length >= 12"
            @click="addBackgroundUrl"
          >
            添加 HTTPS 图片
          </UiButton>
          <UiButton
            type="button"
            variant="secondary"
            :disabled="form.backgroundGallery.length >= 12"
            @click="mediaPickerOpen = true"
          >
            从媒体库选择
          </UiButton>
        </div>
        <AdminMediaPicker
          v-model:open="mediaPickerOpen"
          @select="addMediaBackground"
        />
      </UiGlassPanel>

      <UiGlassPanel class="admin-settings-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Public connections</p>
            <h2>社交链接</h2>
            <p class="admin-settings-note">
              图标会同步显示在首页、关于页面和页脚；链接名称仍会保留为可访问名称。
            </p>
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
          <UiSelect
            :model-value="socialIconChoiceFor(link)"
            :label="`社交链接图标 ${index + 1}`"
            :options="socialIconPresets"
            @update:model-value="selectSocialIconPreset(index, $event)"
          />
          <div class="admin-social-icon-picker">
            <span class="admin-social-icon-picker__preview" aria-hidden="true">
              <SiteSocialIcon :icon="link.icon" :size="20" />
            </span>
            <UiButton
              type="button"
              variant="secondary"
              size="small"
              @click="openSocialIconPicker(index)"
            >
              选择自定义图标 {{ index + 1 }}
            </UiButton>
            <UiButton
              type="button"
              variant="secondary"
              size="small"
              @click="editSocialIconSvg(index)"
            >
              粘贴 SVG 源码
            </UiButton>
            <UiButton
              v-if="link.icon"
              type="button"
              variant="ghost"
              size="small"
              @click="clearSocialIcon(index)"
            >
              清除图标
            </UiButton>
          </div>
          <UiTextarea
            v-if="link.icon?.type === 'svg'"
            :label="`SVG 源码 ${index + 1}`"
            :model-value="link.icon.source"
            description="支持 svg、path、g、circle、rect 等图形标签；脚本、事件、样式和外部引用会被移除。"
            placeholder='<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">…</svg>'
            :maxlength="20000"
            :rows="7"
            spellcheck="false"
            @update:model-value="updateSocialIconSvg(index, $event)"
          />
          <p
            v-if="validation[`social-icon-${index}`]"
            class="admin-form-error"
            role="alert"
          >
            {{ validation[`social-icon-${index}`] }}
          </p>
          <UiButton
            type="button"
            variant="ghost"
            @click="removeSocialLink(index)"
          >
            移除链接
          </UiButton>
        </div>
        <AdminMediaPicker
          v-model:open="socialIconPickerOpen"
          @select="selectSocialIconMedia"
        />
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
        <p class="admin-settings-note">
          播放列表本身在
          <NuxtLink to="/admin/music">音乐管理</NuxtLink>
          中维护；这里只决定首页是否展示播放器。
        </p>
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
.admin-settings-section:nth-of-type(4),
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

.admin-social-icon-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.admin-social-icon-picker__preview {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  background: var(--glass-subtle-bg);
  color: var(--color-text);
}

.admin-background-gallery {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-background-gallery__item {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
}

.admin-background-gallery__item > img {
  width: 7rem;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-small);
  background: var(--color-canvas);
  object-fit: cover;
}

.admin-background-gallery__details {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.admin-background-gallery__details span {
  overflow: hidden;
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-background-gallery__details small {
  color: var(--color-text-muted);
}

.admin-background-gallery__actions,
.admin-background-gallery__add-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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

.admin-settings-note {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: var(--text-small);
  line-height: 1.6;
}

.admin-settings-note a {
  color: var(--color-accent-soft);
  text-decoration: underline;
  text-underline-offset: 0.2em;
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
  .admin-settings-section:nth-of-type(4),
  .admin-settings-preview,
  .admin-settings-error,
  .admin-settings-actions {
    grid-column: auto;
  }

  .admin-settings-checks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-background-gallery__item {
    grid-template-columns: 5rem minmax(0, 1fr);
  }

  .admin-background-gallery__item > img {
    width: 5rem;
  }

  .admin-background-gallery__actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
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
