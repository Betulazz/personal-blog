<script setup lang="ts">
import { ArrowDown, ArrowUp, Music2 } from 'lucide-vue-next'

import { useApiClient } from '~/api/client'
import {
  adminMusicError,
  adminMusicLoadError,
} from '~/composables/useAdminMusic'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminMusicTrack } from '~/types/admin-music'
import {
  musicSourceStrategyLabel,
  validateMusicSource,
} from '~/utils/music-source'

const api = useApiClient()
const session = useAdminSession()
const tracks = ref<AdminMusicTrack[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const reordering = ref(false)
const busyId = ref<string | null>(null)
const deleteTarget = ref<AdminMusicTrack | null>(null)
const deleteOpen = ref(false)
let loadController: AbortController | null = null

const isBusy = computed(() => reordering.value || busyId.value !== null)
const enabledCount = computed(
  () => tracks.value.filter((track) => track.isEnabled).length,
)
const invalidCount = computed(
  () =>
    tracks.value.filter(
      (track) =>
        !validateMusicSource(track.sourceStrategy, track.sourceUrl).valid,
    ).length,
)

const load = async () => {
  loadController?.abort()
  loadController = new AbortController()
  loading.value = true
  loadError.value = ''
  try {
    tracks.value = await session.withSession(() =>
      api.listAdminMusicTracks(loadController?.signal),
    )
  } catch (failure) {
    if (!isAbortError(failure)) {
      loadError.value = adminMusicLoadError(failure)
    }
  } finally {
    loading.value = false
  }
}

const validationFor = (track: AdminMusicTrack) =>
  validateMusicSource(track.sourceStrategy, track.sourceUrl)

const move = async (index: number, direction: -1 | 1) => {
  const targetIndex = index + direction
  const moved = tracks.value[index]
  if (!moved || targetIndex < 0 || targetIndex >= tracks.value.length) return
  if (isBusy.value) return

  const previous = tracks.value
  const next = [...previous]
  next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  tracks.value = next
  reordering.value = true
  busyId.value = moved.id
  actionError.value = ''
  try {
    tracks.value = await session.withSession(() =>
      api.reorderAdminMusicTracks(next.map((track) => track.id)),
    )
  } catch (failure) {
    tracks.value = previous
    actionError.value = adminMusicError(failure)
  } finally {
    reordering.value = false
    busyId.value = null
  }
}

const toggleTrack = async (track: AdminMusicTrack) => {
  if (isBusy.value) return
  busyId.value = track.id
  actionError.value = ''
  try {
    const updated = await session.withSession(() =>
      api.setAdminMusicTrackEnabled(track.id, !track.isEnabled),
    )
    tracks.value = tracks.value.map((item) =>
      item.id === updated.id ? updated : item,
    )
  } catch (failure) {
    actionError.value = adminMusicError(failure)
  } finally {
    busyId.value = null
  }
}

const requestDelete = (track: AdminMusicTrack) => {
  deleteTarget.value = track
  deleteOpen.value = true
}

const confirmDelete = async () => {
  const target = deleteTarget.value
  if (!target || isBusy.value) return
  busyId.value = target.id
  actionError.value = ''
  try {
    await session.withSession(() => api.deleteAdminMusicTrack(target.id))
    tracks.value = tracks.value.filter((item) => item.id !== target.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (failure) {
    actionError.value = adminMusicError(failure)
  } finally {
    busyId.value = null
  }
}

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return '未设置时长'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

onMounted(load)
onBeforeUnmount(() => {
  loadController?.abort()
})
useHead({ title: '音乐管理 · 后台空间' })

function isAbortError(error: unknown) {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError')
  )
}
</script>

<template>
  <div class="admin-music-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">Ambient playlist</p>
        <h1>音乐管理</h1>
        <p>
          维护公开播放器使用的合法音源，并调整排序、启用状态与封面。这里只接受
          /uploads/ 媒体、远程 URL 和 S3 兼容存储，不提供任何抓取、目录搜索或代
          理流程。
        </p>
      </div>
      <NuxtLink class="admin-resource-heading__create" to="/admin/music/new"
        >新建音乐</NuxtLink
      >
    </header>

    <section
      v-if="loading && !tracks.length"
      class="admin-resource-state"
      role="status"
      aria-busy="true"
    >
      正在读取音乐列表…
    </section>
    <section v-else-if="loadError" class="admin-resource-state" role="alert">
      <strong>暂时无法加载音乐列表</strong>
      <p>{{ loadError }}</p>
      <UiButton variant="secondary" @click="load">重新加载</UiButton>
    </section>
    <section v-else-if="!tracks.length" class="admin-resource-state">
      <strong>还没有配置音乐</strong>
      <p>创建后，公开播放器会按这里的顺序播放已启用的合法音源。</p>
      <NuxtLink to="/admin/music/new">新建音乐</NuxtLink>
    </section>
    <template v-else>
      <p v-if="actionError" class="admin-music-action-error" role="alert">
        {{ actionError }}
      </p>

      <div class="admin-music-summary">
        <span>共 {{ tracks.length }} 首</span>
        <span>公开播放列表：{{ enabledCount }} 首已启用</span>
        <span v-if="invalidCount">需要检查：{{ invalidCount }} 首</span>
      </div>

      <ol class="admin-music-list" aria-label="音乐列表">
        <li
          v-for="(track, index) in tracks"
          :key="track.id"
          :data-track-title="track.title"
          data-testid="music-track-row"
        >
          <div class="admin-music-row">
            <div class="admin-music-order">
              <span class="admin-music-order__index">{{ index + 1 }}</span>
              <button
                type="button"
                class="admin-music-order__button"
                :aria-label="`上移 ${track.title}`"
                :disabled="index === 0 || isBusy"
                @click="move(index, -1)"
              >
                <ArrowUp :size="16" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="admin-music-order__button"
                :aria-label="`下移 ${track.title}`"
                :disabled="index === tracks.length - 1 || isBusy"
                @click="move(index, 1)"
              >
                <ArrowDown :size="16" aria-hidden="true" />
              </button>
            </div>

            <div class="admin-music-artwork">
              <img
                v-if="track.artworkPreviewUrl"
                :alt="track.artworkAlt || `${track.title} 封面`"
                loading="lazy"
                :src="track.artworkPreviewUrl"
              />
              <Music2 v-else :size="20" aria-hidden="true" />
            </div>

            <div class="admin-music-main">
              <strong>{{ track.title }}</strong>
              <span>
                {{ track.artist }}
                <template v-if="track.album"> · {{ track.album }}</template>
              </span>
              <small>
                {{ musicSourceStrategyLabel(track.sourceStrategy) }} ·
                {{ track.sourceUrl }} ·
                {{ formatDuration(track.durationSeconds) }}
              </small>
            </div>

            <div class="admin-music-badges">
              <UiBadge :tone="track.isEnabled ? 'success' : 'neutral'">
                {{ track.isEnabled ? '已启用' : '已停用' }}
              </UiBadge>
              <UiBadge
                :tone="validationFor(track).valid ? 'success' : 'accent'"
                :title="validationFor(track).message || undefined"
              >
                {{ validationFor(track).valid ? '音源有效' : '需要检查' }}
              </UiBadge>
            </div>

            <div class="admin-music-actions">
              <NuxtLink
                class="admin-music-actions__edit"
                :to="`/admin/music/${track.id}/edit`"
              >
                编辑
              </NuxtLink>
              <UiButton
                size="small"
                variant="secondary"
                :loading="busyId === track.id && !reordering"
                :disabled="isBusy && busyId !== track.id"
                @click="toggleTrack(track)"
              >
                {{ track.isEnabled ? '停用' : '启用' }}
              </UiButton>
              <UiButton
                size="small"
                variant="danger"
                :aria-label="`删除 ${track.title}`"
                :disabled="isBusy"
                @click="requestDelete(track)"
              >
                删除
              </UiButton>
            </div>
          </div>
          <p
            v-if="!validationFor(track).valid"
            class="admin-music-warning"
            role="status"
          >
            {{ validationFor(track).message }}
          </p>
        </li>
      </ol>
    </template>

    <UiDialog
      v-model:open="deleteOpen"
      title="确认删除这首音乐？"
      :description="`删除后无法恢复，公开播放器将不再包含「${deleteTarget?.title ?? ''}」。`"
    >
      <template #footer>
        <UiButton variant="ghost" @click="deleteOpen = false">取消</UiButton>
        <UiButton
          variant="danger"
          :loading="busyId === deleteTarget?.id"
          @click="confirmDelete"
        >
          确认删除
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.admin-music-page {
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
  max-width: 44rem;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.admin-resource-heading__eyebrow {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-resource-heading__create,
.admin-resource-state a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

.admin-music-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  margin-bottom: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-music-action-error,
.admin-music-warning {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--color-danger-border);
  border-radius: var(--radius-medium);
  background: var(--color-danger-surface);
  color: var(--color-danger);
  font-size: var(--text-small);
}

.admin-music-action-error {
  margin-bottom: var(--space-4);
}

.admin-music-list {
  display: grid;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
}

.admin-music-list li + li {
  border-top: var(--border-hairline) solid var(--color-divider-subtle);
}

.admin-music-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  transition: background-color var(--motion-duration-normal)
    var(--motion-ease-standard);
}

.admin-music-row:hover {
  background: var(--glass-bg-hover);
}

.admin-music-order {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
}

.admin-music-order__index {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.admin-music-order__button {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  background: var(--glass-card-bg);
  color: var(--color-text-muted);
  cursor: pointer;
}

.admin-music-order__button:hover:not(:disabled) {
  border-color: var(--glass-border-hover);
  color: var(--color-text);
}

.admin-music-order__button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.admin-music-artwork {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  place-items: center;
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
  color: var(--color-text-subtle);
}

.admin-music-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-music-main {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.admin-music-main strong,
.admin-music-main span,
.admin-music-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-music-main strong {
  color: var(--color-text);
  font-size: var(--text-body-large);
}

.admin-music-main span {
  color: var(--color-text-muted);
}

.admin-music-main small {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-music-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.admin-music-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.admin-music-actions__edit {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-card-bg);
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
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
  font-size: var(--text-h3);
}

@media (width <= 64rem) {
  .admin-music-row {
    grid-template-columns: auto auto minmax(0, 1fr);
  }

  .admin-music-badges,
  .admin-music-actions {
    grid-column: 2 / -1;
  }
}

@media (width <= 30rem) {
  .admin-resource-heading {
    align-items: start;
    flex-direction: column;
  }

  .admin-resource-heading__create {
    width: 100%;
  }

  .admin-music-row {
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: start;
    padding: var(--space-4);
  }

  .admin-music-actions {
    grid-column: 1 / -1;
  }
}
</style>
