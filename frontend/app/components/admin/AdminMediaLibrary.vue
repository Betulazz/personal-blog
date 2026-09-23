<script setup lang="ts">
import {
  AudioLines,
  CloudUpload,
  Copy,
  Image as ImageIcon,
  ImageOff,
  Trash2,
} from 'lucide-vue-next'

import { useApiClient } from '~/api/client'
import {
  adminMediaDeleteError,
  adminMediaLoadError,
  adminMediaPolicyError,
  adminMediaReferencesError,
  adminMediaUploadError,
  mediaErrorRecovery,
  mediaReferencesFromError,
} from '~/composables/useAdminMedia'
import { useAdminSession } from '~/stores/adminSession'
import type {
  AdminMediaAsset,
  AdminMediaFilter,
  AdminMediaPolicy,
  AdminMediaReference,
} from '~/types/admin-media'
import {
  formatMediaBytes,
  formatMediaDimensions,
  isImageAsset,
  mediaAcceptAttribute,
  mediaKindLabels,
  mediaReferenceLabel,
  mediaStorageStrategyLabel,
  validateMediaFile,
} from '~/utils/admin-media'

const pageSize = 12

const api = useApiClient()
const session = useAdminSession()

const assets = ref<AdminMediaAsset[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)
const filter = ref<AdminMediaFilter>('all')
const loading = ref(true)
const loadError = ref('')
const policy = ref<AdminMediaPolicy | null>(null)
const policyError = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const isDragging = ref(false)
const uploadState = ref<'error' | 'idle' | 'success' | 'uploading'>('idle')
const uploadMessage = ref('')
const uploadProgress = ref<number | null>(null)
const uploadRetryable = ref(false)
const uploading = computed(() => uploadState.value === 'uploading')

const liveMessage = ref('')
const brokenPreviews = ref<Record<string, true>>({})

const deleteOpen = ref(false)
const deleteTarget = ref<AdminMediaAsset | null>(null)
const deleteReferences = ref<AdminMediaReference[]>([])
const referencesLoading = ref(false)
const referencesError = ref('')
const deleteBusy = ref(false)
const deleteMessage = ref('')
const deleteRecovery = ref(false)

let loadController: AbortController | null = null
let liveMessageTimer: ReturnType<typeof setTimeout> | null = null

const kindFilters: Array<{ label: string; value: AdminMediaFilter }> = [
  { label: '全部', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '音频', value: 'audio' },
]

const acceptAttribute = computed(() => mediaAcceptAttribute(policy.value))

const policySummary = computed(() => {
  if (!policy.value) return ''
  return [
    `图片：${policy.value.acceptedImageTypes.join('、')}`,
    `音频：${policy.value.acceptedAudioTypes.join('、')}`,
    `单个文件不超过 ${formatMediaBytes(policy.value.maxUploadBytes)}`,
    `图片不超过 ${formatMediaBytes(policy.value.imageMaxUploadBytes)}、${policy.value.imageMaxDimension} px、${policy.value.imageMaxPixels.toLocaleString('en-US')} 像素`,
  ].join('；')
})

const emptyCopy = computed(() =>
  filter.value === 'all'
    ? {
        description:
          '上传图片或音频后，这里会显示预览、元数据与可复制的引用路径。',
        title: '媒体库还是空的',
      }
    : {
        description: '当前筛选下没有资源，可以切换到「全部」查看完整媒体库。',
        title: `没有${filter.value === 'image' ? '图片' : '音频'}资源`,
      },
)

const canRetryUpload = computed(
  () => uploadRetryable.value && pendingFile.value !== null && !uploading.value,
)

const deleteConfirmDisabled = computed(
  () =>
    deleteBusy.value ||
    referencesLoading.value ||
    Boolean(referencesError.value) ||
    deleteReferences.value.length > 0,
)

const load = async () => {
  loadController?.abort()
  loadController = new AbortController()
  loading.value = true
  loadError.value = ''
  try {
    const result = await session.withSession(() =>
      api.listAdminMedia(
        {
          kind: filter.value === 'all' ? undefined : filter.value,
          page: page.value,
          pageSize,
        },
        loadController?.signal,
      ),
    )
    assets.value = result.data
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
    page.value = result.pagination.page
  } catch (failure) {
    if (!isAbortError(failure)) {
      loadError.value = adminMediaLoadError(failure)
    }
  } finally {
    loading.value = false
  }
}

const loadPolicy = async () => {
  policyError.value = ''
  try {
    policy.value = await session.withSession(() => api.getAdminMediaPolicy())
  } catch (failure) {
    policyError.value = adminMediaPolicyError(failure)
  }
}

const announce = (message: string) => {
  liveMessage.value = message
  if (liveMessageTimer) clearTimeout(liveMessageTimer)
  liveMessageTimer = setTimeout(() => {
    liveMessage.value = ''
  }, 5000)
}

const selectFile = (file: File | null) => {
  if (!file) return
  pendingFile.value = file
  uploadRetryable.value = false
  if (!policy.value) {
    uploadState.value = 'error'
    uploadMessage.value =
      policyError.value || '上传规则尚未就绪，请刷新后重试。'
    return
  }
  const validation = validateMediaFile(file, policy.value)
  if (!validation.valid) {
    uploadState.value = 'error'
    uploadMessage.value = validation.message
    return
  }
  void startUpload()
}

const startUpload = async () => {
  const file = pendingFile.value
  if (!file || uploading.value) return
  uploadState.value = 'uploading'
  uploadProgress.value = null
  uploadMessage.value = ''
  try {
    const asset = await session.withSession(() =>
      api.uploadAdminMedia(file, {
        onProgress: (ratio) => {
          uploadProgress.value = ratio
        },
      }),
    )
    uploadState.value = 'success'
    uploadMessage.value = `上传成功：${asset.originalFilename} 已加入媒体库。`
    uploadRetryable.value = false
    pendingFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    if (filter.value === 'all' || filter.value === asset.mediaKind) {
      if (page.value === 1) {
        assets.value = [asset, ...assets.value].slice(0, pageSize)
        total.value += 1
        totalPages.value = Math.ceil(total.value / pageSize)
      } else {
        page.value = 1
        await load()
      }
    }
  } catch (failure) {
    if (isAbortError(failure)) return
    uploadState.value = 'error'
    uploadMessage.value = adminMediaUploadError(failure)
    uploadRetryable.value = true
  } finally {
    uploadProgress.value = null
  }
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectFile(input.files?.[0] ?? null)
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  selectFile(event.dataTransfer?.files?.[0] ?? null)
}

const setFilter = (value: AdminMediaFilter) => {
  if (filter.value === value) return
  filter.value = value
  page.value = 1
  void load()
}

const goToPage = (next: number) => {
  if (next < 1 || next > totalPages.value || next === page.value) return
  page.value = next
  void load()
}

const markPreviewBroken = (asset: AdminMediaAsset) => {
  brokenPreviews.value = { ...brokenPreviews.value, [asset.id]: true }
}

const copyText = async (label: string, value: string) => {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard unavailable')
    }
    await navigator.clipboard.writeText(value)
    announce(`已复制${label}。`)
  } catch {
    announce(`${label}复制失败，请手动选择文本复制。`)
  }
}

const requestDelete = (asset: AdminMediaAsset) => {
  deleteTarget.value = asset
  deleteOpen.value = true
  deleteReferences.value = []
  referencesError.value = ''
  deleteMessage.value = ''
  deleteRecovery.value = false
  void loadReferences(asset.id)
}

const loadReferences = async (id: string) => {
  referencesLoading.value = true
  referencesError.value = ''
  try {
    deleteReferences.value = await session.withSession(() =>
      api.getAdminMediaReferences(id),
    )
  } catch (failure) {
    referencesError.value = adminMediaReferencesError(failure)
  } finally {
    referencesLoading.value = false
  }
}

const closeDelete = () => {
  deleteOpen.value = false
  deleteTarget.value = null
  deleteReferences.value = []
  referencesError.value = ''
  deleteMessage.value = ''
  deleteRecovery.value = false
}

const removeAsset = async (id: string) => {
  assets.value = assets.value.filter((asset) => asset.id !== id)
  total.value = Math.max(0, total.value - 1)
  totalPages.value = Math.ceil(total.value / pageSize)
  if (!assets.value.length && total.value > 0 && page.value > 1) {
    page.value = Math.max(1, totalPages.value)
    await load()
  }
}

const handleDeleteFailure = (failure: unknown) => {
  const references = mediaReferencesFromError(failure)
  if (references.length) {
    deleteReferences.value = references
  }
  deleteRecovery.value = mediaErrorRecovery(failure) === 'purge_metadata'
  deleteMessage.value = adminMediaDeleteError(failure)
}

const confirmDelete = async () => {
  const target = deleteTarget.value
  if (!target || deleteConfirmDisabled.value) return
  deleteBusy.value = true
  deleteMessage.value = ''
  try {
    await session.withSession(() => api.deleteAdminMedia(target.id))
    await removeAsset(target.id)
    announce(`已删除 ${target.originalFilename}，文件与元数据一并移除。`)
    closeDelete()
  } catch (failure) {
    handleDeleteFailure(failure)
  } finally {
    deleteBusy.value = false
  }
}

const purgeMetadata = async () => {
  const target = deleteTarget.value
  if (!target || deleteBusy.value) return
  deleteBusy.value = true
  deleteMessage.value = ''
  try {
    const result = await session.withSession(() =>
      api.deleteAdminMedia(target.id, { purgeMetadata: true }),
    )
    await removeAsset(target.id)
    announce(
      result.bytesMissing
        ? `已清理 ${target.originalFilename} 的元数据；文件字节此前已缺失。`
        : `已清理 ${target.originalFilename} 的元数据。`,
    )
    closeDelete()
  } catch (failure) {
    handleDeleteFailure(failure)
  } finally {
    deleteBusy.value = false
  }
}

onMounted(() => {
  void loadPolicy()
  void load()
})

onBeforeUnmount(() => {
  loadController?.abort()
  if (liveMessageTimer) clearTimeout(liveMessageTimer)
})

useHead({ title: '媒体管理 · 后台空间' })

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
  <div class="admin-media-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">Media library</p>
        <h1>媒体管理</h1>
        <p>
          上传、预览和复用本地媒体资源。文件类型与内容会被验证，引用中的资源会被保护；
          删除时如实报告文件与元数据的同步状态。
        </p>
      </div>
    </header>

    <p class="admin-media-live" role="status" aria-live="polite">
      {{ liveMessage }}
    </p>

    <section
      class="admin-media-upload"
      aria-labelledby="admin-media-upload-title"
    >
      <div class="admin-media-upload__intro">
        <h2 id="admin-media-upload-title">上传媒体</h2>
        <p v-if="policy" class="admin-media-upload__policy">
          {{ policySummary }}
        </p>
        <template v-else-if="policyError">
          <p class="admin-media-upload__policy-error" role="alert">
            {{ policyError }}
          </p>
          <UiButton size="small" variant="secondary" @click="loadPolicy">
            重新读取上传规则
          </UiButton>
        </template>
        <p v-else class="admin-media-upload__policy">正在读取上传规则…</p>
      </div>

      <div
        class="admin-media-dropzone"
        :data-dragging="isDragging"
        @dragleave.prevent="isDragging = false"
        @dragover.prevent="isDragging = true"
        @drop.prevent="onDrop"
      >
        <input
          id="admin-media-file"
          ref="fileInput"
          class="admin-media-dropzone__input"
          type="file"
          :accept="acceptAttribute"
          :disabled="uploading || !policy"
          aria-label="选择要上传的媒体文件"
          @change="onFileChange"
        />
        <label class="admin-media-dropzone__label" for="admin-media-file">
          <CloudUpload :size="22" aria-hidden="true" />
          <span>选择文件</span>
        </label>
        <p class="admin-media-dropzone__hint">
          也可以把图片或音频拖到这里。上传期间会显示真实进度。
        </p>
      </div>

      <div
        v-if="uploadState !== 'idle'"
        class="admin-media-upload__status"
        data-testid="media-upload-status"
        :role="uploadState === 'error' ? 'alert' : 'status'"
      >
        <template v-if="uploadState === 'uploading'">
          <p>正在上传 {{ pendingFile?.name }}…</p>
          <div
            class="admin-media-progress"
            data-testid="media-upload-progress"
            role="progressbar"
            aria-label="上传进度"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="
              uploadProgress === null
                ? undefined
                : Math.round(uploadProgress * 100)
            "
          >
            <span
              class="admin-media-progress__bar"
              :data-indeterminate="uploadProgress === null"
              :data-continuous-effect="uploadProgress === null ? '' : undefined"
              :style="{
                '--upload-progress':
                  uploadProgress === null ? 1 : uploadProgress,
              }"
            />
          </div>
          <p class="admin-media-progress__text">
            {{
              uploadProgress === null
                ? '上传中，等待服务器接收…'
                : `已完成 ${Math.round(uploadProgress * 100)}%`
            }}
          </p>
        </template>
        <template v-else>
          <p>{{ uploadMessage }}</p>
          <UiButton
            v-if="canRetryUpload"
            size="small"
            variant="secondary"
            @click="startUpload"
          >
            重试上传
          </UiButton>
        </template>
      </div>
    </section>

    <section
      class="admin-media-library"
      aria-labelledby="admin-media-library-title"
    >
      <div class="admin-media-toolbar">
        <h2 id="admin-media-library-title">媒体库</h2>
        <div class="admin-media-toolbar__actions">
          <div
            class="admin-media-filters"
            role="group"
            aria-label="媒体类型筛选"
          >
            <button
              v-for="option in kindFilters"
              :key="option.value"
              type="button"
              class="admin-media-filters__button"
              :aria-pressed="filter === option.value"
              @click="setFilter(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
          <UiButton
            size="small"
            variant="secondary"
            :loading="loading"
            @click="load"
          >
            刷新媒体库
          </UiButton>
        </div>
      </div>

      <section
        v-if="loading && !assets.length"
        class="admin-resource-state"
        role="status"
        aria-busy="true"
      >
        正在读取媒体库…
      </section>
      <section v-else-if="loadError" class="admin-resource-state" role="alert">
        <strong>暂时无法加载媒体库</strong>
        <p>{{ loadError }}</p>
        <UiButton variant="secondary" @click="load">重新加载</UiButton>
      </section>
      <section v-else-if="!assets.length" class="admin-resource-state">
        <strong>{{ emptyCopy.title }}</strong>
        <p>{{ emptyCopy.description }}</p>
      </section>

      <template v-else>
        <p class="admin-media-summary">
          共 {{ total }} 个资源 · 第 {{ page }} / {{ totalPages || 1 }} 页
        </p>
        <ul class="admin-media-grid" data-testid="media-library">
          <li
            v-for="asset in assets"
            :key="asset.id"
            class="admin-media-card"
            data-testid="media-asset-card"
            :data-media-filename="asset.originalFilename"
            :data-media-kind="asset.mediaKind"
          >
            <div class="admin-media-card__preview">
              <img
                v-if="isImageAsset(asset) && !brokenPreviews[asset.id]"
                :alt="asset.originalFilename"
                loading="lazy"
                :src="asset.url"
                @error="markPreviewBroken(asset)"
              />
              <audio
                v-else-if="!isImageAsset(asset) && !brokenPreviews[asset.id]"
                :aria-label="`试听 ${asset.originalFilename}`"
                controls
                preload="metadata"
                :src="asset.url"
                @error="markPreviewBroken(asset)"
              />
              <p v-else class="admin-media-card__preview-broken" role="status">
                <ImageOff :size="18" aria-hidden="true" />
                预览不可用：存储中的文件可能已缺失。
              </p>
              <span class="admin-media-card__kind" aria-hidden="true">
                <ImageIcon v-if="isImageAsset(asset)" :size="14" />
                <AudioLines v-else :size="14" />
                {{ mediaKindLabels[asset.mediaKind] }}
              </span>
            </div>

            <div class="admin-media-card__body">
              <strong class="admin-media-card__name">
                {{ asset.originalFilename }}
              </strong>
              <dl class="admin-media-card__meta">
                <div>
                  <dt>类型</dt>
                  <dd>{{ asset.contentType }}</dd>
                </div>
                <div>
                  <dt>大小</dt>
                  <dd>{{ formatMediaBytes(asset.sizeBytes) }}</dd>
                </div>
                <div v-if="formatMediaDimensions(asset)">
                  <dt>尺寸</dt>
                  <dd>{{ formatMediaDimensions(asset) }}</dd>
                </div>
                <div>
                  <dt>存储</dt>
                  <dd>
                    {{ mediaStorageStrategyLabel(asset.storageStrategy) }}
                  </dd>
                </div>
                <div>
                  <dt>上传时间</dt>
                  <dd>
                    {{
                      new Date(asset.createdAt).toLocaleString('zh-CN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    }}
                  </dd>
                </div>
              </dl>

              <div class="admin-media-card__reference">
                <code :title="asset.reference">{{ asset.reference }}</code>
                <div class="admin-media-card__copy">
                  <UiButton
                    size="small"
                    variant="ghost"
                    :aria-label="`复制 URL ${asset.originalFilename}`"
                    @click="copyText(' URL', asset.url)"
                  >
                    <Copy :size="14" aria-hidden="true" />
                    复制 URL
                  </UiButton>
                  <UiButton
                    size="small"
                    variant="ghost"
                    :aria-label="`复制引用路径 ${asset.originalFilename}`"
                    @click="copyText('引用路径', asset.reference)"
                  >
                    <Copy :size="14" aria-hidden="true" />
                    复制引用
                  </UiButton>
                </div>
              </div>
            </div>

            <div class="admin-media-card__actions">
              <UiButton
                size="small"
                variant="danger"
                :aria-label="`删除 ${asset.originalFilename}`"
                @click="requestDelete(asset)"
              >
                <Trash2 :size="14" aria-hidden="true" />
                删除
              </UiButton>
            </div>
          </li>
        </ul>

        <nav
          v-if="totalPages > 1"
          class="admin-media-pagination"
          aria-label="媒体库分页"
        >
          <UiButton
            size="small"
            variant="secondary"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >
            上一页
          </UiButton>
          <span>第 {{ page }} / {{ totalPages }} 页</span>
          <UiButton
            size="small"
            variant="secondary"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >
            下一页
          </UiButton>
        </nav>
      </template>
    </section>

    <UiDialog
      v-model:open="deleteOpen"
      title="删除这个媒体资源？"
      :description="`删除会同时移除存储文件与元数据；如果两者状态不一致，会如实报告并给出恢复操作。目标：${deleteTarget?.originalFilename ?? ''}`"
    >
      <div class="admin-media-delete">
        <p v-if="referencesLoading" role="status" aria-busy="true">
          正在检查站点引用…
        </p>
        <template v-else-if="referencesError">
          <p role="alert">{{ referencesError }}</p>
          <UiButton
            size="small"
            variant="secondary"
            @click="deleteTarget && loadReferences(deleteTarget.id)"
          >
            重试检查
          </UiButton>
        </template>
        <template v-else-if="deleteReferences.length">
          <p role="alert">该资源仍被以下站点内容引用，删除已被阻止：</p>
          <ul class="admin-media-delete__references">
            <li
              v-for="reference in deleteReferences"
              :key="`${reference.resourceType}-${reference.resourceId}-${reference.field}`"
            >
              {{ mediaReferenceLabel(reference) }}
            </li>
          </ul>
          <p>请先在对应内容中替换或移除引用，再回来删除。</p>
        </template>
        <p v-else>未发现站点内容引用这个资源，可以安全删除。</p>

        <p v-if="deleteMessage" role="alert">{{ deleteMessage }}</p>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="closeDelete">取消</UiButton>
        <UiButton
          v-if="deleteRecovery"
          variant="danger"
          :loading="deleteBusy"
          @click="purgeMetadata"
        >
          清理元数据
        </UiButton>
        <UiButton
          v-else
          variant="danger"
          :disabled="deleteConfirmDisabled"
          :loading="deleteBusy"
          @click="confirmDelete"
        >
          确认删除
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.admin-media-page {
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
  max-width: 46rem;
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

.admin-media-live:empty {
  display: none;
}

.admin-media-live {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-text);
  font-size: var(--text-small);
}

.admin-media-upload {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  box-shadow: var(--glass-highlight);
}

.admin-media-upload__intro h2 {
  margin: 0;
  font-size: var(--text-h3);
}

.admin-media-upload__policy,
.admin-media-upload__policy-error {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: 1.7;
}

.admin-media-upload__policy-error {
  color: var(--color-danger);
}

.admin-media-dropzone {
  position: relative;
  display: grid;
  place-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  border: var(--border-hairline) dashed var(--glass-border-hover);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
  text-align: center;
  transition:
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard);
}

.admin-media-dropzone[data-dragging='true'],
.admin-media-dropzone:focus-within {
  border-color: var(--color-accent-soft);
  background: var(--glass-bg-hover);
}

.admin-media-dropzone__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.admin-media-dropzone__label {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--space-5);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.admin-media-dropzone__hint {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-media-upload__status {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
  font-size: var(--text-small);
}

.admin-media-upload__status p {
  margin: 0;
}

.admin-media-upload__status[role='alert'] {
  border-color: var(--color-danger-border);
  background: var(--color-danger-surface);
  color: var(--color-danger);
}

.admin-media-progress {
  width: 100%;
  height: 0.5rem;
  overflow: hidden;
  border-radius: var(--radius-round);
  background: var(--glass-card-bg);
}

.admin-media-progress__bar {
  display: block;
  height: 100%;
  border-radius: var(--radius-round);
  background: linear-gradient(
    90deg,
    var(--color-accent-strong),
    var(--color-accent-soft)
  );
  transform: scaleX(var(--upload-progress, 0));
  transform-origin: left center;
  transition: transform var(--motion-duration-normal)
    var(--motion-ease-standard);
}

.admin-media-progress__bar[data-indeterminate='true'] {
  animation: admin-media-pulse var(--motion-duration-slow) ease-in-out infinite;
  opacity: 0.6;
}

.admin-media-progress__text {
  color: var(--color-text-subtle);
}

@keyframes admin-media-pulse {
  50% {
    opacity: 0.25;
  }
}

.admin-media-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.admin-media-toolbar h2 {
  margin: 0;
  font-size: var(--text-h3);
}

.admin-media-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.admin-media-filters {
  display: flex;
  gap: var(--space-2);
}

.admin-media-filters__button {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-card-bg);
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard),
    color var(--motion-duration-normal) var(--motion-ease-standard);
}

.admin-media-filters__button[aria-pressed='true'] {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.admin-media-summary {
  margin: 0 0 var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-media-card {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-panel-bg);
  transition:
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard);
}

.admin-media-card:hover {
  border-color: var(--glass-border-hover);
  background: var(--glass-bg-hover);
}

.admin-media-card__preview {
  position: relative;
  display: grid;
  min-height: 9rem;
  place-items: center;
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
}

.admin-media-card__preview img {
  width: 100%;
  height: 9rem;
  object-fit: cover;
}

.admin-media-card__preview audio {
  width: min(100%, 20rem);
}

.admin-media-card__preview-broken {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-4);
  color: var(--color-danger);
  font-size: var(--text-small);
  text-align: center;
}

.admin-media-card__kind {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-round);
  background: rgb(6 10 23 / 82%);
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
}

.admin-media-card__body {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
}

.admin-media-card__name {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-body-large);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-media-card__meta {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  font-size: var(--text-caption);
}

.admin-media-card__meta div {
  display: flex;
  min-width: 0;
  justify-content: space-between;
  gap: var(--space-3);
}

.admin-media-card__meta dt {
  color: var(--color-text-subtle);
}

.admin-media-card__meta dd {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: var(--color-text-muted);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-media-card__reference {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.admin-media-card__reference code {
  display: block;
  overflow: hidden;
  padding: var(--space-2);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-media-card__copy {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.admin-media-card__actions {
  display: flex;
  justify-content: flex-end;
}

.admin-media-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-5);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.admin-media-delete {
  display: grid;
  gap: var(--space-3);
  font-size: var(--text-small);
}

.admin-media-delete p {
  margin: 0;
  line-height: 1.7;
}

.admin-media-delete__references {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-8);
  border: var(--border-hairline) solid var(--color-danger-border);
  border-radius: var(--radius-medium);
  background: var(--color-danger-surface);
  color: var(--color-danger);
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

@media (prefers-reduced-motion: reduce) {
  .admin-media-progress__bar[data-indeterminate='true'] {
    animation: none;
  }
}

@media (width <= 30rem) {
  .admin-media-toolbar,
  .admin-media-toolbar__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-media-filters {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .admin-media-card__meta div {
    flex-direction: column;
    gap: var(--space-1);
  }

  .admin-media-card__meta dd {
    text-align: left;
  }
}
</style>
