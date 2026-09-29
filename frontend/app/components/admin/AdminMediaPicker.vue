<script setup lang="ts">
import { CloudUpload, Image as ImageIcon, ImageOff } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useApiClient } from '~/api/client'
import {
  adminMediaLoadError,
  adminMediaPolicyError,
  adminMediaUploadError,
} from '~/composables/useAdminMedia'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminMediaAsset, AdminMediaPolicy } from '~/types/admin-media'
import { formatMediaBytes, validateMediaFile } from '~/utils/admin-media'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  select: [value: { alt: string; reference: string; url: string }]
  'update:open': [value: boolean]
}>()

const pageSize = 8

const api = useApiClient()
const session = useAdminSession()

const assets = ref<AdminMediaAsset[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)
const loading = ref(false)
const loadError = ref('')
const policy = ref<AdminMediaPolicy | null>(null)
const policyError = ref('')
const selectedId = ref<string | null>(null)
const alt = ref('')
const brokenPreviews = ref<Record<string, true>>({})

const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const uploadState = ref<'error' | 'idle' | 'success' | 'uploading'>('idle')
const uploadMessage = ref('')
const uploadProgress = ref<number | null>(null)
const uploadRetryable = ref(false)
const uploading = computed(() => uploadState.value === 'uploading')

let loadController: AbortController | null = null

const acceptAttribute = computed(() => {
  if (!policy.value) return 'image/*'
  return policy.value.acceptedImageTypes.join(',')
})

const selected = computed(
  () => assets.value.find((asset) => asset.id === selectedId.value) ?? null,
)

const canInsert = computed(() => Boolean(selected.value) && !uploading.value)

const canRetryUpload = computed(
  () => uploadRetryable.value && pendingFile.value !== null && !uploading.value,
)

const load = async () => {
  loadController?.abort()
  loadController = new AbortController()
  loading.value = true
  loadError.value = ''
  try {
    const result = await session.withSession(() =>
      api.listAdminMedia(
        { kind: 'image', page: page.value, pageSize },
        loadController?.signal,
      ),
    )
    assets.value = result.data
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
    page.value = result.pagination.page
    if (
      selectedId.value &&
      !assets.value.some((a) => a.id === selectedId.value)
    ) {
      selectedId.value = null
      alt.value = ''
    }
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

const defaultAltFor = (asset: AdminMediaAsset) =>
  asset.originalFilename.replace(/\.[^.]+$/, '') || asset.originalFilename

const selectAsset = (asset: AdminMediaAsset) => {
  selectedId.value = asset.id
  alt.value = defaultAltFor(asset)
}

const upload = async () => {
  const file = pendingFile.value
  if (!file || uploading.value) return
  if (!policy.value) {
    uploadState.value = 'error'
    uploadMessage.value = policyError.value || '上传规则尚未就绪，请重试。'
    return
  }
  const validation = validateMediaFile(file, policy.value)
  if (!validation.valid) {
    uploadState.value = 'error'
    uploadMessage.value = validation.message
    uploadRetryable.value = false
    return
  }

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
    uploadMessage.value = `上传成功：${asset.originalFilename}，已选为待插入图片。`
    uploadRetryable.value = false
    pendingFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    if (asset.mediaKind === 'image') {
      assets.value = [asset, ...assets.value].slice(0, pageSize)
      total.value += 1
      totalPages.value = Math.ceil(total.value / pageSize)
      page.value = 1
      selectAsset(asset)
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
  pendingFile.value = input.files?.[0] ?? null
  uploadState.value = 'idle'
  uploadMessage.value = ''
  void upload()
}

const goToPage = (next: number) => {
  if (next < 1 || next > totalPages.value || next === page.value) return
  page.value = next
  void load()
}

const markPreviewBroken = (asset: AdminMediaAsset) => {
  brokenPreviews.value = { ...brokenPreviews.value, [asset.id]: true }
}

const insert = () => {
  const asset = selected.value
  if (!asset) return
  emit('select', {
    alt: alt.value.trim() || defaultAltFor(asset),
    reference: asset.reference,
    url: asset.url,
  })
  emit('update:open', false)
}

const close = () => emit('update:open', false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    selectedId.value = null
    alt.value = ''
    uploadState.value = 'idle'
    uploadMessage.value = ''
    pendingFile.value = null
    void loadPolicy()
    void load()
  },
)

onBeforeUnmount(() => {
  loadController?.abort()
})

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
  <UiDialog
    :open="open"
    title="从媒体库插入图片"
    description="图片通过 Media Asset 记录引用；插入的是适配器解析后的引用路径，不绑定某一种存储实现。"
    @update:open="emit('update:open', $event)"
  >
    <div class="media-picker" data-testid="media-picker">
      <section class="media-picker__upload" aria-labelledby="picker-upload">
        <div class="media-picker__upload-head">
          <h3 id="picker-upload">上传新图片</h3>
          <p v-if="policy" class="media-picker__policy">
            支持 {{ policy.acceptedImageTypes.join('、') }}，单张不超过
            {{ formatMediaBytes(policy.imageMaxUploadBytes) }}。
          </p>
          <template v-else-if="policyError">
            <p class="media-picker__error" role="alert">{{ policyError }}</p>
            <UiButton size="small" variant="secondary" @click="loadPolicy">
              重新读取上传规则
            </UiButton>
          </template>
          <p v-else class="media-picker__policy">正在读取上传规则…</p>
        </div>
        <input
          id="media-picker-file"
          ref="fileInput"
          class="media-picker__file"
          type="file"
          :accept="acceptAttribute"
          :disabled="uploading || !policy"
          aria-label="选择要上传的图片"
          @change="onFileChange"
        />
        <label class="media-picker__file-label" for="media-picker-file">
          <CloudUpload :size="18" aria-hidden="true" />
          选择图片并上传
        </label>
        <div
          v-if="uploadState !== 'idle'"
          class="media-picker__upload-status"
          :role="uploadState === 'error' ? 'alert' : 'status'"
        >
          <template v-if="uploadState === 'uploading'">
            <p>正在上传 {{ pendingFile?.name }}…</p>
            <div
              class="media-picker__progress"
              role="progressbar"
              aria-label="图片上传进度"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="
                uploadProgress === null
                  ? undefined
                  : Math.round(uploadProgress * 100)
              "
            >
              <span
                :style="{
                  width:
                    uploadProgress === null
                      ? '100%'
                      : `${Math.round(uploadProgress * 100)}%`,
                }"
              />
            </div>
          </template>
          <template v-else>
            <p>{{ uploadMessage }}</p>
            <UiButton
              v-if="canRetryUpload"
              size="small"
              variant="secondary"
              @click="upload"
            >
              重试上传
            </UiButton>
          </template>
        </div>
      </section>

      <section class="media-picker__library" aria-labelledby="picker-library">
        <h3 id="picker-library">媒体库图片</h3>

        <p v-if="loading && !assets.length" role="status" aria-busy="true">
          正在读取媒体库…
        </p>
        <div v-else-if="loadError" class="media-picker__error" role="alert">
          <p>{{ loadError }}</p>
          <UiButton size="small" variant="secondary" @click="load">
            重新加载
          </UiButton>
        </div>
        <p v-else-if="!assets.length" class="media-picker__empty">
          媒体库还没有图片，可以先上传一张，然后再插入。
        </p>

        <ul v-else class="media-picker__grid">
          <li v-for="asset in assets" :key="asset.id">
            <button
              type="button"
              class="media-picker__card"
              data-testid="media-picker-asset"
              :data-media-filename="asset.originalFilename"
              :aria-pressed="selectedId === asset.id"
              @click="selectAsset(asset)"
            >
              <span class="media-picker__thumb">
                <img
                  v-if="!brokenPreviews[asset.id]"
                  :alt="asset.originalFilename"
                  loading="lazy"
                  :src="asset.url"
                  @error="markPreviewBroken(asset)"
                />
                <span v-else class="media-picker__broken">
                  <ImageOff :size="16" aria-hidden="true" />
                  预览不可用
                </span>
              </span>
              <span class="media-picker__name">
                <ImageIcon :size="13" aria-hidden="true" />
                {{ asset.originalFilename }}
              </span>
              <span class="media-picker__meta">
                {{ asset.contentType }} ·
                {{ formatMediaBytes(asset.sizeBytes) }}
              </span>
            </button>
          </li>
        </ul>

        <nav
          v-if="totalPages > 1"
          class="media-picker__pagination"
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
          <span>第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 张</span>
          <UiButton
            size="small"
            variant="secondary"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >
            下一页
          </UiButton>
        </nav>
      </section>

      <div v-if="selected" class="media-picker__alt">
        <UiInput
          v-model="alt"
          label="替代文本"
          name="media_alt"
          description="用于无障碍描述与图片加载失败时的文字。"
        />
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="close">取消</UiButton>
      <UiButton :disabled="!canInsert" :loading="uploading" @click="insert">
        插入选中图片
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.media-picker {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.media-picker h3 {
  margin: 0;
  font-size: var(--text-body-large);
}

.media-picker__upload {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-hairline) dashed var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
}

.media-picker__policy,
.media-picker__empty {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.media-picker__error {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-danger);
  font-size: var(--text-small);
}

.media-picker__error p {
  margin: 0;
}

.media-picker__file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.media-picker__file-label {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-text);
  cursor: pointer;
}

.media-picker__upload-status {
  display: grid;
  gap: var(--space-2);
  font-size: var(--text-small);
}

.media-picker__upload-status p {
  margin: 0;
}

.media-picker__progress {
  height: 0.5rem;
  overflow: hidden;
  border-radius: var(--radius-round);
  background: var(--glass-card-bg);
}

.media-picker__progress span {
  display: block;
  height: 100%;
  border-radius: var(--radius-round);
  background: linear-gradient(
    90deg,
    var(--color-accent-strong),
    var(--color-accent-soft)
  );
}

.media-picker__library {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.media-picker__library > p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.media-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.media-picker__card {
  display: grid;
  width: 100%;
  gap: var(--space-2);
  padding: var(--space-2);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-card-bg);
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--text-caption);
  text-align: start;
  cursor: pointer;
}

.media-picker__card:hover,
.media-picker__card[aria-pressed='true'] {
  border-color: var(--glass-border-hover);
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.media-picker__thumb {
  display: grid;
  min-height: 5.5rem;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-small);
  background: var(--color-canvas-deep);
}

.media-picker__thumb img {
  width: 100%;
  height: 5.5rem;
  object-fit: cover;
}

.media-picker__broken {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  color: var(--color-danger);
}

.media-picker__name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  overflow: hidden;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-picker__meta {
  color: var(--color-text-subtle);
}

.media-picker__pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.media-picker__alt {
  padding-top: var(--space-2);
  border-top: var(--border-hairline) solid var(--glass-border);
}

@media (width <= 30rem) {
  .media-picker__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
