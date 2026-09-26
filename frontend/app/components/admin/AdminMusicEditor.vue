<script setup lang="ts">
import { Music2 } from 'lucide-vue-next'

import { useApiClient } from '~/api/client'
import { adminMusicError } from '~/composables/useAdminMusic'
import { useAdminPortfolioEditor } from '~/composables/useAdminPortfolioEditor'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminMusicTrack, AdminMusicTrackInput } from '~/types/admin-music'
import type { MusicTrackPreview } from '~/types/music'
import { validateMusicSongId } from '~/utils/music-song-id'

const props = defineProps<{ id?: string }>()
const api = useApiClient()
const session = useAdminSession()
const editor = useAdminPortfolioEditor<AdminMusicTrack, AdminMusicTrackInput>({
  api: {
    create: api.createAdminMusicTrack,
    delete: api.deleteAdminMusicTrack,
    get: api.getAdminMusicTrack,
    update: (id, input) =>
      api.updateAdminMusicTrack(id, {
        display_order: input.display_order,
        is_enabled: input.is_enabled,
      }),
  },
  describeError: adminMusicError,
  empty: () => ({
    display_order: 0,
    is_enabled: true,
    netease_song_id: '',
  }),
  id: props.id,
  resource: 'music',
  toInput: (record) => ({
    display_order: record.displayOrder,
    is_enabled: record.isEnabled,
    netease_song_id: record.neteaseSongId,
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
const preview = ref<MusicTrackPreview | null>(null)
const previewBusy = ref(false)
const previewError = ref('')
const songIdValidation = computed(() =>
  validateMusicSongId(form.value.netease_song_id),
)
const currentPreview = computed(() => {
  if (record.value) {
    return {
      album: record.value.album,
      alreadyAdded: false,
      artist: record.value.artist,
      artworkUrl: record.value.artworkPreviewUrl,
      durationSeconds: record.value.durationSeconds,
      neteaseSongId: record.value.neteaseSongId,
      providerUrl: record.value.providerUrl,
      title: record.value.title,
    } satisfies MusicTrackPreview
  }
  return preview.value
})
const canSave = computed(
  () =>
    Boolean(record.value) ||
    Boolean(
      currentPreview.value &&
      !currentPreview.value.alreadyAdded &&
      currentPreview.value.neteaseSongId === songIdValidation.value.normalized,
    ),
)
const durationText = computed({
  get: () =>
    form.value.display_order === undefined
      ? ''
      : String(form.value.display_order),
  set: (value: number | string) => {
    const normalized = String(value).trim()
    form.value.display_order =
      normalized === '' ? Number.NaN : Number(normalized)
  },
})

watch(
  () => form.value.netease_song_id,
  (value) => {
    if (preview.value?.neteaseSongId !== value.trim()) preview.value = null
    previewError.value = ''
  },
)

const previewTrack = async () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!songIdValidation.value.valid) {
    validation.netease_song_id = songIdValidation.value.message
    return
  }
  previewError.value = ''
  previewBusy.value = true
  try {
    preview.value = await session.withSession(() =>
      api.previewAdminMusicTrack(songIdValidation.value.normalized),
    )
    if (preview.value.alreadyAdded) {
      previewError.value = '这首歌已经在播放列表中。'
    }
  } catch (failure) {
    previewError.value = adminMusicError(failure)
  } finally {
    previewBusy.value = false
  }
}

const validate = () => {
  Object.keys(validation).forEach((key) =>
    Reflect.deleteProperty(validation, key),
  )
  if (!record.value && !songIdValidation.value.valid) {
    validation.netease_song_id = songIdValidation.value.message
  }
  if (
    !Number.isInteger(form.value.display_order) ||
    form.value.display_order < 0
  ) {
    validation.display_order = '展示顺序必须是不小于 0 的整数。'
  }
  return Object.keys(validation).length === 0 && canSave.value
}

const submit = () => {
  if (!validate()) return
  form.value.netease_song_id =
    record.value?.neteaseSongId ?? songIdValidation.value.normalized
  void save()
}

const formatDuration = (seconds: number | null | undefined) => {
  if (!seconds || seconds <= 0) return '时长未知'
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

useHead(() => ({
  title: `${props.id ? '编辑' : '导入'}音乐 · 后台空间`,
}))
</script>

<template>
  <AdminPortfolioEditorFrame
    label="音乐"
    resource="music"
    :heading="currentPreview?.title"
    :state-label="record ? (record.isEnabled ? '已启用' : '已停用') : undefined"
    :state-tone="record?.isEnabled ? 'success' : 'neutral'"
    :editing="Boolean(id)"
    :record="record"
    :loading="loading"
    :load-failed="loadFailed"
    :busy="busy"
    :error="error || previewError || Object.values(validation).join(' ')"
    :notice="notice"
    @reload="load"
    @delete="remove"
  >
    <form class="admin-music-form" novalidate @submit.prevent="submit">
      <UiGlassPanel class="admin-music-form__main" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">NetEase Cloud Music</p>
            <h2>{{ record ? '歌曲信息' : '按歌曲 ID 导入' }}</h2>
          </div>
        </div>

        <template v-if="!record">
          <UiInput
            v-model="form.netease_song_id"
            label="网易云歌曲 ID"
            name="netease_song_id"
            inputmode="numeric"
            autocomplete="off"
            :error="validation.netease_song_id"
            required
          />
          <p class="admin-music-note">
            粘贴歌曲页面里的数字
            ID。预览会读取网易云音乐页面公开返回的数据；该网页接口不是官方
            OpenAPI，可能随网易云页面调整而变化。
          </p>
          <UiButton
            type="button"
            variant="secondary"
            :loading="previewBusy"
            :disabled="!songIdValidation.valid || previewBusy"
            @click="previewTrack"
          >
            预览歌曲
          </UiButton>
        </template>
        <div v-else class="admin-music-id">
          <span>网易云歌曲 ID</span>
          <a :href="record.providerUrl" target="_blank" rel="noreferrer">
            {{ record.neteaseSongId }} · 在网易云音乐打开
          </a>
        </div>

        <div
          v-if="currentPreview"
          class="admin-music-preview"
          aria-label="网易云歌曲预览"
        >
          <div class="admin-music-preview__artwork">
            <img
              v-if="currentPreview.artworkUrl"
              :alt="`${currentPreview.title} 封面`"
              :src="currentPreview.artworkUrl"
            />
            <Music2 v-else :size="20" aria-hidden="true" />
          </div>
          <div class="admin-music-preview__identity">
            <strong>{{ currentPreview.title }}</strong>
            <span>{{ currentPreview.artist }}</span>
            <small>
              {{ currentPreview.album || '专辑未知' }} ·
              {{ formatDuration(currentPreview.durationSeconds) }}
            </small>
          </div>
        </div>
      </UiGlassPanel>

      <UiGlassPanel class="admin-music-form__side" padding="spacious">
        <div class="admin-form-section-heading">
          <div>
            <p class="admin-form-eyebrow">Playlist settings</p>
            <h2>播放列表</h2>
          </div>
        </div>
        <label class="admin-number-field">
          <span>展示顺序</span>
          <input
            v-model="durationText"
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
        <label class="admin-switch">
          <input v-model="form.is_enabled" type="checkbox" />
          <span>启用这首音乐</span>
          <small>停用后保留配置，但不再出现在公开播放列表中。</small>
        </label>
        <UiButton type="submit" :loading="busy" :disabled="!canSave">
          {{ record ? '保存列表设置' : '导入到播放列表' }}
        </UiButton>
        <a
          v-if="currentPreview"
          class="admin-music-provider-link"
          :href="currentPreview.providerUrl"
          target="_blank"
          rel="noreferrer"
        >
          在网易云音乐打开歌曲
        </a>
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

.admin-music-note,
.admin-music-id {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: 1.6;
}

.admin-music-id {
  display: grid;
  gap: var(--space-2);
}

.admin-music-id a,
.admin-music-provider-link {
  color: var(--color-accent-soft);
}

.admin-music-preview {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
}

.admin-music-preview__artwork {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-small);
  background: var(--glass-subtle-bg);
  color: var(--color-text-subtle);
}

.admin-music-preview__artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-music-preview__identity {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.admin-music-preview__identity strong,
.admin-music-preview__identity span,
.admin-music-preview__identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-music-preview__identity small {
  color: var(--color-text-muted);
}

.admin-number-field {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
}

.admin-number-field small {
  color: var(--color-danger);
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

@media (width <= 52rem) {
  .admin-music-form {
    grid-template-columns: 1fr;
  }
}

@media (width <= 30rem) {
  .admin-switch {
    grid-template-columns: auto auto;
  }

  .admin-switch small {
    grid-column: 2;
  }
}
</style>
