<script setup lang="ts">
import { Music2 } from 'lucide-vue-next'

import { useApiClient } from '~/api/client'
import { adminMusicError } from '~/composables/useAdminMusic'
import { useAdminPortfolioEditor } from '~/composables/useAdminPortfolioEditor'
import type { AdminMusicTrack, AdminMusicTrackInput } from '~/types/admin-music'
import {
  musicSourceStrategies,
  validateMusicArtwork,
  validateMusicSource,
} from '~/utils/music-source'

const props = defineProps<{ id?: string }>()
const api = useApiClient()
const editor = useAdminPortfolioEditor<AdminMusicTrack, AdminMusicTrackInput>({
  api: {
    create: api.createAdminMusicTrack,
    delete: api.deleteAdminMusicTrack,
    get: api.getAdminMusicTrack,
    update: (id, input) => api.updateAdminMusicTrack(id, input),
  },
  describeError: adminMusicError,
  empty: () => ({
    album: null,
    artist: '',
    artwork_alt: null,
    artwork_url: null,
    display_order: 0,
    duration_seconds: null,
    is_enabled: true,
    source_strategy: 'remote_url',
    source_url: '',
    title: '',
  }),
  id: props.id,
  resource: 'music',
  toInput: (record) => ({
    album: record.album,
    artist: record.artist,
    artwork_alt: record.artworkAlt,
    artwork_url: record.artworkUrl,
    display_order: record.displayOrder,
    duration_seconds: record.durationSeconds,
    is_enabled: record.isEnabled,
    source_strategy: record.sourceStrategy,
    source_url: record.sourceUrl,
    title: record.title,
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

const strategyOptions = musicSourceStrategies.map((strategy) => ({
  label: strategy.label,
  value: strategy.value,
}))
const strategyDescription = computed(
  () =>
    musicSourceStrategies.find(
      (strategy) => strategy.value === form.value.source_strategy,
    )?.description ?? '',
)
const sourceValidation = computed(() =>
  validateMusicSource(form.value.source_strategy, form.value.source_url),
)
const artworkValidation = computed(() =>
  validateMusicArtwork(form.value.artwork_url ?? ''),
)
const artworkPreview = computed(() => {
  const value = form.value.artwork_url?.trim()
  if (!value) return null
  if (record.value?.artworkUrl === value) return record.value.artworkPreviewUrl
  return /^https?:\/\//i.test(value) ? value : null
})
const durationText = computed({
  get: () =>
    form.value.duration_seconds === null
      ? ''
      : String(form.value.duration_seconds),
  set: (value: number | string) => {
    const normalized = String(value).trim()
    form.value.duration_seconds = normalized === '' ? null : Number(normalized)
  },
})
const displayOrderText = computed({
  get: () => String(form.value.display_order),
  set: (value: number | string) => {
    const normalized = String(value).trim()
    form.value.display_order =
      normalized === '' ? Number.NaN : Number(normalized)
  },
})
const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!form.value.title.trim()) validation.title = '请输入音乐标题。'
  if (!form.value.artist.trim()) {
    validation.artist = '请输入艺术家或来源名称。'
  }
  if (!sourceValidation.value.valid) {
    validation.source_url = sourceValidation.value.message
  }
  if (!artworkValidation.value.valid) {
    validation.artwork_url = artworkValidation.value.message
  }
  if (
    form.value.duration_seconds !== null &&
    (!Number.isInteger(form.value.duration_seconds) ||
      form.value.duration_seconds <= 0)
  ) {
    validation.duration_seconds = '时长必须是大于 0 的整数秒，或留空。'
  }
  if (
    !Number.isInteger(form.value.display_order) ||
    form.value.display_order < 0
  ) {
    validation.display_order = '展示顺序必须是不小于 0 的整数。'
  }
  return Object.keys(validation).length === 0
}

const submit = () => {
  if (!validate()) return
  form.value.title = form.value.title.trim()
  form.value.artist = form.value.artist.trim()
  form.value.album = form.value.album?.trim() || null
  form.value.source_url = form.value.source_url.trim()
  form.value.artwork_url = form.value.artwork_url?.trim() || null
  form.value.artwork_alt = form.value.artwork_alt?.trim() || null
  void save()
}

useHead(() => ({
  title: `${props.id ? '编辑' : '新建'}音乐 · 后台空间`,
}))
</script>

<template>
  <AdminPortfolioEditorFrame
    label="音乐"
    resource="music"
    :heading="record?.title"
    :state-label="record ? (record.isEnabled ? '已启用' : '已停用') : undefined"
    :state-tone="record?.isEnabled ? 'success' : 'neutral'"
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
    <form class="admin-music-form" novalidate @submit.prevent="submit">
      <UiGlassPanel class="admin-music-form__main" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Track metadata</p>
            <h2>音乐信息</h2>
          </div>
        </div>
        <UiInput
          v-model="form.title"
          label="音乐标题"
          name="music_title"
          maxlength="200"
          :error="validation.title"
          required
        />
        <UiInput
          v-model="form.artist"
          label="艺术家"
          name="music_artist"
          maxlength="200"
          description="填写艺术家、演奏者或合法的来源名称。"
          :error="validation.artist"
          required
        />
        <UiInput
          :model-value="form.album ?? ''"
          label="专辑"
          name="music_album"
          maxlength="200"
          @update:model-value="form.album = $event"
        />
        <div class="admin-music-pair">
          <label class="admin-number-field">
            <span>时长（秒）</span>
            <input
              v-model="durationText"
              class="field__control"
              type="number"
              min="1"
              step="1"
              name="music_duration"
            />
            <small v-if="validation.duration_seconds">{{
              validation.duration_seconds
            }}</small>
          </label>
          <label class="admin-number-field">
            <span>展示顺序</span>
            <input
              v-model="displayOrderText"
              class="field__control"
              type="number"
              min="0"
              step="1"
              name="music_order"
              required
            />
            <small v-if="validation.display_order">{{
              validation.display_order
            }}</small>
          </label>
        </div>
        <label class="admin-switch">
          <input v-model="form.is_enabled" type="checkbox" />
          <span>启用这首音乐</span>
          <small>停用后保留配置，但不再出现在公开播放列表中。</small>
        </label>
      </UiGlassPanel>

      <UiGlassPanel class="admin-music-form__side" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Legal media source</p>
            <h2>音源与封面</h2>
          </div>
        </div>
        <UiSelect
          v-model="form.source_strategy"
          label="来源策略"
          name="music_strategy"
          :options="strategyOptions"
        />
        <UiInput
          v-model="form.source_url"
          label="音源地址"
          name="music_source_url"
          description="只接受站点自托管媒体、完整 http(s) 音频地址或 S3 兼容对象地址。"
          :error="validation.source_url"
          required
        />
        <p
          class="admin-music-source-note"
          :data-state="sourceValidation.valid ? 'valid' : 'invalid'"
          role="status"
        >
          <strong>{{ strategyDescription }}</strong>
          <span>{{
            sourceValidation.valid
              ? '当前音源地址符合所选来源策略。'
              : sourceValidation.message
          }}</span>
        </p>
        <UiInput
          :model-value="form.artwork_url ?? ''"
          label="封面 URL"
          name="music_artwork_url"
          description="可选。使用合法 http(s) 图片或已有的 /uploads/ 媒体。"
          :error="validation.artwork_url"
          @update:model-value="form.artwork_url = $event"
        />
        <UiInput
          :model-value="form.artwork_alt ?? ''"
          label="封面替代文本"
          name="music_artwork_alt"
          maxlength="200"
          @update:model-value="form.artwork_alt = $event"
        />
        <div class="admin-music-preview" aria-label="音乐公开呈现预览">
          <span>公开呈现预览</span>
          <div class="admin-music-preview__identity">
            <div class="admin-music-preview__artwork">
              <img
                v-if="artworkPreview"
                :alt="form.artwork_alt || `${form.title || '音乐'} 封面`"
                :src="artworkPreview"
              />
              <Music2 v-else :size="20" aria-hidden="true" />
            </div>
            <strong>{{ form.title || '音乐标题' }}</strong>
            <small>{{ form.artist || '艺术家' }}</small>
          </div>
          <small>
            {{ form.is_enabled ? '已启用' : '已停用' }} · 展示顺序
            {{
              Number.isInteger(form.display_order) ? form.display_order : '—'
            }}
          </small>
        </div>
        <UiButton type="submit" :loading="busy">保存音乐</UiButton>
      </UiGlassPanel>
    </form>
  </AdminPortfolioEditorFrame>
</template>

<style scoped>
@import '../ui/field.css';

.admin-music-form {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
  gap: var(--space-6);
}

.admin-music-form__main,
.admin-music-form__side {
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

.admin-music-pair {
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

.admin-number-field small {
  color: var(--color-danger);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-regular);
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

.admin-music-source-note {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.admin-music-source-note strong {
  color: var(--color-text);
}

.admin-music-source-note[data-state='invalid'] {
  border-color: var(--color-danger-border);
  background: var(--color-danger-surface);
}

.admin-music-source-note[data-state='valid'] strong {
  color: var(--color-success);
}

.admin-music-preview {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
}

.admin-music-preview > span {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-music-preview__identity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-1) var(--space-3);
}

.admin-music-preview__identity strong,
.admin-music-preview__identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-music-preview__identity strong {
  font-size: var(--text-body-large);
}

.admin-music-preview__identity small,
.admin-music-preview > small {
  color: var(--color-text-muted);
}

.admin-music-preview__artwork {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  grid-row: span 2;
  place-items: center;
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  background: var(--glass-subtle-bg);
  color: var(--color-text-subtle);
}

.admin-music-preview__artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (width <= 52rem) {
  .admin-music-form {
    grid-template-columns: 1fr;
  }
}

@media (width <= 30rem) {
  .admin-music-pair {
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
