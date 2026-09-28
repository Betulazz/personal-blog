<script setup lang="ts">
import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminSiteSettings } from '~/types/admin-portfolio'
import type { AboutTimelineItem } from '~/types/site'
import {
  DEFAULT_ABOUT_STORY_HEADING,
  DEFAULT_ABOUT_STORY_INTRODUCTION,
  DEFAULT_ABOUT_TIMELINE_HEADING,
  DEFAULT_ABOUT_TIMELINE_INTRODUCTION,
} from '~/utils/about-content'

interface AboutPageForm {
  storyHeading: string
  storyIntroduction: string
  storyParagraphs: string[]
  timelineHeading: string
  timelineIntroduction: string
  timeline: AboutTimelineItem[]
}

type ValidationErrors = Record<string, string>

const emptyForm = (): AboutPageForm => ({
  storyHeading: DEFAULT_ABOUT_STORY_HEADING,
  storyIntroduction: DEFAULT_ABOUT_STORY_INTRODUCTION,
  storyParagraphs: [],
  timelineHeading: DEFAULT_ABOUT_TIMELINE_HEADING,
  timelineIntroduction: DEFAULT_ABOUT_TIMELINE_INTRODUCTION,
  timeline: [],
})

const toForm = (settings: AdminSiteSettings['about']): AboutPageForm => ({
  storyHeading: settings.storyHeading || DEFAULT_ABOUT_STORY_HEADING,
  storyIntroduction:
    settings.storyIntroduction ?? DEFAULT_ABOUT_STORY_INTRODUCTION,
  storyParagraphs: [...settings.story],
  timelineHeading: settings.timelineHeading || DEFAULT_ABOUT_TIMELINE_HEADING,
  timelineIntroduction:
    settings.timelineIntroduction ?? DEFAULT_ABOUT_TIMELINE_INTRODUCTION,
  timeline: settings.timeline.map((item) => ({ ...item })),
})

const api = useApiClient()
const session = useAdminSession()
const form = useState<AboutPageForm>('admin-draft:about-page', emptyForm)
const initialized = useState('admin-draft:about-page:initialized', () => false)
const loaded = ref(false)
const loading = ref(true)
const loadFailed = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const validation = ref<ValidationErrors>({})
let loadController: AbortController | null = null

const load = async () => {
  loadController?.abort()
  loadController = new AbortController()
  loading.value = true
  loadFailed.value = false
  error.value = ''
  try {
    const settings = await session.withSession(() =>
      api.getAdminSettings(loadController?.signal),
    )
    if (!initialized.value) {
      form.value = toForm(settings.about)
      initialized.value = true
    }
    loaded.value = true
  } catch (failure) {
    if (isAbortError(failure)) return
    error.value = friendlyError(failure)
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

const validate = () => {
  const next: ValidationErrors = {}
  if (!form.value.storyHeading.trim()) {
    next.storyHeading = '请填写故事板块标题。'
  }
  if (form.value.storyHeading.length > 120) {
    next.storyHeading = '标题不能超过 120 个字符。'
  }
  if (form.value.storyIntroduction.length > 2000) {
    next.storyIntroduction = '导语不能超过 2000 个字符。'
  }
  if (form.value.storyParagraphs.length > 20) {
    next.storyParagraphs = '故事最多可添加 20 段。'
  }
  form.value.storyParagraphs.forEach((paragraph, index) => {
    if (!paragraph.trim()) {
      next[`story-${index}`] = '请填写这段故事内容，或移除空段落。'
    }
  })
  if (
    form.value.storyParagraphs.some(
      (paragraph, index) =>
        form.value.storyParagraphs.findIndex(
          (item) => item.trim() === paragraph.trim(),
        ) !== index,
    )
  ) {
    next.storyParagraphs = '故事段落不能重复。'
  }
  if (!form.value.timelineHeading.trim()) {
    next.timelineHeading = '请填写时间线板块标题。'
  }
  if (form.value.timelineHeading.length > 120) {
    next.timelineHeading = '标题不能超过 120 个字符。'
  }
  if (form.value.timelineIntroduction.length > 2000) {
    next.timelineIntroduction = '导语不能超过 2000 个字符。'
  }
  if (form.value.timeline.length > 20) {
    next.timeline = '时间线最多可添加 20 个节点。'
  }
  form.value.timeline.forEach((item, index) => {
    if (!item.period.trim()) next[`timeline-${index}-period`] = '请填写时间。'
    if (!item.title.trim()) next[`timeline-${index}-title`] = '请填写节点标题。'
    if (!item.description.trim()) {
      next[`timeline-${index}-description`] = '请填写节点说明。'
    }
  })
  validation.value = next
  return Object.keys(next).length === 0
}

const save = async () => {
  if (busy.value || !loaded.value || !validate()) {
    if (Object.keys(validation.value).length) {
      error.value = '请先修正标出的内容；当前草稿仍然保留。'
    }
    return
  }
  busy.value = true
  error.value = ''
  notice.value = ''
  const submittedDraft = JSON.stringify(toRaw(form.value))
  const input = {
    about: {
      story_heading: form.value.storyHeading.trim(),
      story_introduction: form.value.storyIntroduction.trim(),
      story: form.value.storyParagraphs.map((paragraph) => paragraph.trim()),
      timeline_heading: form.value.timelineHeading.trim(),
      timeline_introduction: form.value.timelineIntroduction.trim(),
      timeline: form.value.timeline.map((item) => ({
        description: item.description.trim(),
        period: item.period.trim(),
        title: item.title.trim(),
      })),
    },
  }
  try {
    const saved = await session.withSession(() =>
      api.updateAdminSettings(input),
    )
    if (JSON.stringify(toRaw(form.value)) === submittedDraft) {
      form.value = toForm(saved.about)
      notice.value = '关于页面内容已保存。'
    } else {
      notice.value = '已保存提交版本；后续编辑仍保留，请再次保存。'
    }
    validation.value = {}
  } catch (failure) {
    error.value = friendlyError(failure)
  } finally {
    busy.value = false
  }
}

const addStoryParagraph = () => {
  if (form.value.storyParagraphs.length >= 20) return
  form.value.storyParagraphs.push('')
}

const removeStoryParagraph = (index: number) =>
  form.value.storyParagraphs.splice(index, 1)

const addTimelineItem = () => {
  if (form.value.timeline.length >= 20) return
  form.value.timeline.push({ description: '', period: '', title: '' })
}

const removeTimelineItem = (index: number) =>
  form.value.timeline.splice(index, 1)

const move = <T,>(items: T[], index: number, offset: -1 | 1) => {
  const nextIndex = index + offset
  if (nextIndex < 0 || nextIndex >= items.length) return
  const current = items[index]
  const next = items[nextIndex]
  if (current === undefined || next === undefined) return
  items[index] = next
  items[nextIndex] = current
}

watch(
  () => session.status,
  (status) => {
    if (status === 'authenticated' && !loaded.value) void load()
  },
  { immediate: true },
)

onBeforeUnmount(() => loadController?.abort())

useHead({ title: '关于页面 · 后台空间' })

function friendlyError(failure: unknown) {
  if (!(failure instanceof BlogApiError)) {
    return '关于页面操作失败，当前输入仍然保留。'
  }
  if (failure.status === 401) {
    return '会话已过期，请重新登录；当前输入仍然保留。'
  }
  if (failure.status === 403) return '当前账号没有管理关于页面的权限。'
  if (failure.status === 422) {
    return '请检查字段格式与长度，当前输入仍然保留。'
  }
  if (failure.status === 0 || failure.status >= 500) {
    return '后台服务暂时无法响应，请稍后重试；当前输入仍然保留。'
  }
  return '关于页面操作失败，请重试；当前输入仍然保留。'
}

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
  <div class="admin-about-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">About Page Content</p>
        <h1>关于页面</h1>
        <p>维护公开 About 页面中的故事与时间线。内容按纯文本展示。</p>
      </div>
    </header>

    <section
      v-if="loading"
      class="admin-resource-state"
      role="status"
      aria-busy="true"
    >
      正在读取关于页面内容…
    </section>
    <section v-else-if="loadFailed" class="admin-resource-state" role="alert">
      <strong>关于页面内容暂时无法加载</strong>
      <p>{{ error }}</p>
      <UiButton variant="secondary" @click="load">重新加载</UiButton>
    </section>
    <form v-else class="admin-about-form" novalidate @submit.prevent="save">
      <div
        v-if="error"
        class="admin-about-feedback admin-about-feedback--error"
        role="alert"
      >
        {{ error }}
      </div>
      <p
        v-if="notice"
        class="admin-about-feedback admin-about-feedback--success"
        role="status"
      >
        {{ notice }}
      </p>

      <UiGlassPanel class="admin-about-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">01 / THE STORY</p>
            <h2>故事</h2>
          </div>
          <span class="admin-form-muted"
            >{{ form.storyParagraphs.length }} / 20 段</span
          >
        </div>
        <UiInput
          v-model="form.storyHeading"
          label="故事板块标题"
          maxlength="120"
          required
          :error="validation.storyHeading"
        />
        <UiTextarea
          v-model="form.storyIntroduction"
          label="故事板块导语"
          :rows="3"
          maxlength="2000"
          :error="validation.storyIntroduction"
        />
        <p
          v-if="validation.storyParagraphs"
          class="admin-about-field-error"
          role="alert"
        >
          {{ validation.storyParagraphs }}
        </p>
        <ol class="admin-about-list" aria-label="故事段落顺序">
          <li v-for="(paragraph, index) in form.storyParagraphs" :key="index">
            <UiTextarea
              v-model="form.storyParagraphs[index]!"
              :label="`故事段落 ${index + 1}`"
              :rows="4"
              maxlength="10000"
              :error="validation[`story-${index}`]"
              description="纯文本段落，不支持 Markdown 或富文本。"
            />
            <div class="admin-about-item-actions">
              <UiButton
                type="button"
                size="small"
                variant="secondary"
                :disabled="index === 0"
                :aria-label="`故事段落 ${index + 1} 上移`"
                @click="move(form.storyParagraphs, index, -1)"
              >
                上移
              </UiButton>
              <UiButton
                type="button"
                size="small"
                variant="secondary"
                :disabled="index === form.storyParagraphs.length - 1"
                :aria-label="`故事段落 ${index + 1} 下移`"
                @click="move(form.storyParagraphs, index, 1)"
              >
                下移
              </UiButton>
              <UiButton
                type="button"
                size="small"
                variant="ghost"
                :aria-label="`移除故事段落 ${index + 1}`"
                @click="removeStoryParagraph(index)"
              >
                移除
              </UiButton>
            </div>
          </li>
        </ol>
        <UiButton
          type="button"
          variant="secondary"
          :disabled="form.storyParagraphs.length >= 20"
          @click="addStoryParagraph"
        >
          添加故事段落
        </UiButton>
      </UiGlassPanel>

      <UiGlassPanel class="admin-about-section" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">02 / A SMALL TIMELINE</p>
            <h2>时间线</h2>
          </div>
          <span class="admin-form-muted"
            >{{ form.timeline.length }} / 20 个节点</span
          >
        </div>
        <UiInput
          v-model="form.timelineHeading"
          label="时间线板块标题"
          maxlength="120"
          required
          :error="validation.timelineHeading"
        />
        <UiTextarea
          v-model="form.timelineIntroduction"
          label="时间线板块导语"
          :rows="3"
          maxlength="2000"
          :error="validation.timelineIntroduction"
        />
        <p
          v-if="validation.timeline"
          class="admin-about-field-error"
          role="alert"
        >
          {{ validation.timeline }}
        </p>
        <ol class="admin-about-list" aria-label="时间线节点顺序">
          <li v-for="(item, index) in form.timeline" :key="index">
            <div class="admin-about-timeline-fields">
              <UiInput
                v-model="item.period"
                :label="`时间线节点 ${index + 1} 的时间`"
                maxlength="80"
                required
                :error="validation[`timeline-${index}-period`]"
              />
              <UiInput
                v-model="item.title"
                :label="`时间线节点 ${index + 1} 的标题`"
                maxlength="200"
                required
                :error="validation[`timeline-${index}-title`]"
              />
            </div>
            <UiTextarea
              v-model="item.description"
              :label="`时间线节点 ${index + 1} 的说明`"
              :rows="3"
              maxlength="1000"
              required
              :error="validation[`timeline-${index}-description`]"
            />
            <div class="admin-about-item-actions">
              <UiButton
                type="button"
                size="small"
                variant="secondary"
                :disabled="index === 0"
                :aria-label="`时间线节点 ${index + 1} 上移`"
                @click="move(form.timeline, index, -1)"
              >
                上移
              </UiButton>
              <UiButton
                type="button"
                size="small"
                variant="secondary"
                :disabled="index === form.timeline.length - 1"
                :aria-label="`时间线节点 ${index + 1} 下移`"
                @click="move(form.timeline, index, 1)"
              >
                下移
              </UiButton>
              <UiButton
                type="button"
                size="small"
                variant="ghost"
                :aria-label="`移除时间线节点 ${index + 1}`"
                @click="removeTimelineItem(index)"
              >
                移除
              </UiButton>
            </div>
          </li>
        </ol>
        <UiButton
          type="button"
          variant="secondary"
          :disabled="form.timeline.length >= 20"
          @click="addTimelineItem"
        >
          添加时间线节点
        </UiButton>
      </UiGlassPanel>

      <div class="admin-about-submit">
        <p>
          姓名、头像、联系方式和社交链接继续在
          <NuxtLink to="/admin/settings">网站设置</NuxtLink> 中维护。
        </p>
        <UiButton type="submit" :disabled="busy || !loaded">
          {{ busy ? '正在保存…' : '保存关于页面' }}
        </UiButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.admin-about-page {
  display: grid;
  gap: var(--space-6);
  min-width: 0;
}

.admin-about-form,
.admin-about-section {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.admin-about-section {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-panel))
    saturate(var(--glass-saturation));
}

.admin-about-list {
  display: grid;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-about-list > li {
  display: grid;
  min-width: 0;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
}

.admin-about-timeline-fields {
  display: grid;
  grid-template-columns: minmax(0, 0.55fr) minmax(0, 1fr);
  gap: var(--space-4);
}

.admin-about-item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.admin-about-field-error,
.admin-about-feedback {
  margin: 0;
  line-height: var(--leading-body);
}

.admin-about-field-error,
.admin-about-feedback--error {
  color: var(--color-danger-soft, #ff9b9b);
}

.admin-about-feedback--success {
  color: var(--color-accent-soft);
}

.admin-about-submit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.admin-about-submit p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: var(--leading-body);
}

.admin-about-submit a {
  color: var(--color-accent-soft);
}

@media (width <= 40rem) {
  .admin-about-timeline-fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-about-list > li {
    padding: var(--space-4);
  }
}
</style>
