<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { onBeforeRouteLeave } from 'vue-router'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { BlogApiError, useApiClient } from '~/api/client'
import AdminPostForm from '~/components/admin/AdminPostForm.vue'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminPost, AdminPostInput, AdminTaxonomy } from '~/types/admin'
import {
  adminPostDraftKey,
  clearAdminPostDraft,
  isAdminPostDraftDirty,
  readAdminPostDraft,
  saveAdminPostDraft,
  serializeAdminPostInput,
} from '~/utils/admin-post-draft'
import { renderPostMarkdown } from '~/utils/post-markdown'

type AdminPostFormHandle = InstanceType<typeof AdminPostForm>

const props = defineProps<{ postId?: string }>()

const api = useApiClient()
const session = useAdminSession()
const post = ref<AdminPost | null>(null)
const tags = ref<AdminTaxonomy[]>([])
const isLoading = ref(Boolean(props.postId))
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const isLoadError = ref(false)
const isNotFound = ref(false)
const previewOpen = ref(false)
const previewSource = ref('')
const pendingAction = ref<'delete' | 'publish' | 'unpublish' | null>(null)
const formRef = ref<AdminPostFormHandle | null>(null)
const currentSnapshot = ref('')
const baseline = ref('')
const changeVersion = ref(0)
const draftCandidate = ref<AdminPostInput | null>(null)
const recoveryOpen = ref(false)
const leaveDialogOpen = ref(false)
const draftCheckPending = ref(false)
let requestNumber = 0
let resolveLeave: ((allow: boolean) => void) | null = null

const isDirty = computed(() =>
  isAdminPostDraftDirty(currentSnapshot.value, baseline.value),
)
const pageTitle = computed(() =>
  props.postId ? '编辑文章 · 后台空间' : '新建文章 · 后台空间',
)
const previewHtml = computed(() => renderPostMarkdown(previewSource.value))
const actionCopy = computed(() => {
  if (pendingAction.value === 'delete') {
    return {
      confirm: '删除文章',
      description:
        '这会永久删除文章、标签关联，以及该文章的评论讨论和全部回复与喜欢；删除后无法从后台恢复。',
      title: '确认删除这篇文章？',
    }
  }
  if (pendingAction.value === 'publish') {
    return {
      confirm: '确认发布',
      description: '发布后文章会出现在公开文章列表中。你仍可以随时撤回。',
      title: '确认发布这篇文章？',
    }
  }
  return {
    confirm: '确认撤回',
    description: '撤回后文章会回到草稿状态，公开页面将不再展示它。',
    title: '确认撤回这篇文章？',
  }
})

const draftStorage = () => (import.meta.client ? window.sessionStorage : null)

const draftKey = () => adminPostDraftKey(props.postId)

const friendlyError = (error: unknown, fallback: string) => {
  if (!(error instanceof BlogApiError)) return fallback
  if (error.status === 401) {
    return '会话已过期，请重新登录；未保存的正文已备份，重新打开这篇文章可以恢复。'
  }
  const messages: Record<string, string> = {
    csrf_invalid: '安全校验失败，请刷新页面后重试；当前内容仍保留在编辑器中。',
    post_already_published: '这篇文章已经发布，无需重复发布。',
    post_body_required: '发布前请先写入 Markdown 正文。',
    post_not_found: '这篇文章已经不存在，可能已被删除。',
    post_not_published: '这篇文章当前不是已发布状态。',
    post_slug_conflict: '这个 slug 已经被其他文章使用，请换一个。',
    tag_not_found: '所选标签已经不存在，请重新选择后保存。',
    validation_error: '请检查表单中的字段格式。',
  }
  const knownMessage = messages[error.code]
  if (knownMessage) return knownMessage
  if (error.status === 0 || error.status >= 500) {
    return '后台服务暂时无法响应，当前编辑内容仍保留在表单中。'
  }
  return fallback
}

const snapshotForm = () => {
  const input = formRef.value?.snapshot()
  return input ? serializeAdminPostInput(input) : null
}

const handleFormChange = () => {
  const next = snapshotForm()
  if (next === null) return
  changeVersion.value += 1
  currentSnapshot.value = next
}

const handleFormSync = () => {
  const next = snapshotForm()
  if (next === null) return
  currentSnapshot.value = next
  baseline.value = next
  changeVersion.value = 0
  if (draftCheckPending.value) {
    draftCheckPending.value = false
    offerDraftRecovery()
  }
}

const handleFormCanonical = () => {
  const next = snapshotForm()
  if (next === null) return
  const wasDirty = isAdminPostDraftDirty(currentSnapshot.value, baseline.value)
  currentSnapshot.value = next
  if (!wasDirty) baseline.value = next
}

const persistDraft = () => {
  const storage = draftStorage()
  if (!storage) return
  const input = formRef.value?.snapshot()
  if (!input) return
  if (!isDirty.value) {
    clearAdminPostDraft(storage, draftKey())
    return
  }
  saveAdminPostDraft(storage, draftKey(), input)
}

const persistDraftDebounced = useDebounceFn(persistDraft, 600)
const stopDraftWatch = watch(currentSnapshot, () => {
  persistDraftDebounced()
})

const offerDraftRecovery = () => {
  const storage = draftStorage()
  if (!storage) return
  const draft = readAdminPostDraft(storage, draftKey())
  if (!draft) return
  if (!isAdminPostDraftDirty(serializeAdminPostInput(draft), baseline.value)) {
    clearAdminPostDraft(storage, draftKey())
    return
  }
  draftCandidate.value = draft
  recoveryOpen.value = true
}

const restoreDraft = () => {
  const draft = draftCandidate.value
  draftCandidate.value = null
  recoveryOpen.value = false
  if (!draft) return
  formRef.value?.applyInput(draft)
  void nextTick(() => {
    currentSnapshot.value = serializeAdminPostInput(draft)
  })
}

const discardDraft = () => {
  const storage = draftStorage()
  if (storage) clearAdminPostDraft(storage, draftKey())
  draftCandidate.value = null
  recoveryOpen.value = false
}

const load = async () => {
  if (!session.isAuthenticated) return
  const currentRequest = ++requestNumber
  isLoading.value = Boolean(props.postId)
  draftCheckPending.value = true
  errorMessage.value = null
  isLoadError.value = false
  isNotFound.value = false
  try {
    const [loadedTags, loadedPost] = await session.withSession(() =>
      Promise.all([
        api.listAdminTags(),
        props.postId ? api.getAdminPost(props.postId) : Promise.resolve(null),
      ]),
    )
    if (currentRequest !== requestNumber) return
    tags.value = loadedTags
    post.value = loadedPost
    isLoading.value = false
    if (!props.postId) {
      await nextTick()
      handleFormSync()
    }
  } catch (error: unknown) {
    if (currentRequest !== requestNumber) return
    isLoadError.value = true
    isNotFound.value =
      error instanceof BlogApiError && error.code === 'post_not_found'
    errorMessage.value = friendlyError(
      error,
      '文章编辑器暂时无法加载，请稍后重试。',
    )
  } finally {
    if (currentRequest === requestNumber) isLoading.value = false
  }
}

const retryLoad = () => {
  void load()
}

const save = async (input: AdminPostInput) => {
  isSubmitting.value = true
  errorMessage.value = null
  const versionBefore = changeVersion.value
  try {
    const saved = await session.withSession(() =>
      props.postId
        ? api.updateAdminPost(props.postId, input)
        : api.createAdminPost(input),
    )
    const storage = draftStorage()
    if (storage) {
      clearAdminPostDraft(storage, draftKey())
      if (!props.postId) clearAdminPostDraft(storage, adminPostDraftKey())
    }
    if (!props.postId) {
      baseline.value = serializeAdminPostInput(input)
      await navigateTo(`/admin/posts/${saved.id}/edit`, { replace: true })
      return
    }
    if (changeVersion.value === versionBefore) {
      post.value = saved
    } else {
      baseline.value = serializeAdminPostInput(input)
    }
  } catch (error: unknown) {
    errorMessage.value = friendlyError(
      error,
      '文章保存失败，请检查字段后重试。',
    )
  } finally {
    isSubmitting.value = false
  }
}

const preview = async (input: AdminPostInput) => {
  errorMessage.value = null
  try {
    const previewPost = props.postId
      ? await session.withSession(() =>
          api.previewAdminPost(props.postId!, input),
        )
      : null
    previewSource.value = previewPost?.body ?? input.body
    previewOpen.value = true
  } catch (error: unknown) {
    errorMessage.value = friendlyError(error, '预览暂时无法生成，请稍后重试。')
  }
}

const requestAction = (action: 'delete' | 'publish' | 'unpublish') => {
  pendingAction.value = action
}

const confirmAction = async () => {
  if (!props.postId || !pendingAction.value) return
  const action = pendingAction.value
  pendingAction.value = null
  isSubmitting.value = true
  errorMessage.value = null
  const versionBefore = changeVersion.value
  try {
    if (action === 'delete') {
      await session.withSession(() => api.deleteAdminPost(props.postId!))
      const storage = draftStorage()
      if (storage) clearAdminPostDraft(storage, draftKey())
      baseline.value = currentSnapshot.value
      await navigateTo('/admin/posts')
      return
    }
    const updated = await session.withSession(() =>
      action === 'publish'
        ? api.publishAdminPost(props.postId!)
        : api.unpublishAdminPost(props.postId!),
    )
    if (changeVersion.value === versionBefore) {
      post.value = updated
    }
  } catch (error: unknown) {
    errorMessage.value = friendlyError(
      error,
      '状态更新失败，文章内容仍然保留。',
    )
  } finally {
    isSubmitting.value = false
  }
}

const leaveAfterDiscard = () => {
  const storage = draftStorage()
  if (storage) clearAdminPostDraft(storage, draftKey())
  const resolve = resolveLeave
  resolveLeave = null
  leaveDialogOpen.value = false
  resolve?.(true)
}

const cancelLeave = () => {
  const resolve = resolveLeave
  resolveLeave = null
  leaveDialogOpen.value = false
  resolve?.(false)
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!isDirty.value || !session.isAuthenticated) {
    return true
  }
  return new Promise<boolean>((resolve) => {
    resolveLeave = resolve
    leaveDialogOpen.value = true
  })
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  stopDraftWatch()
})

watch(
  () => session.status,
  (status) => {
    if (status === 'authenticated') void load()
  },
  { immediate: true },
)

useHead(() => ({ title: pageTitle.value }))
</script>

<template>
  <div class="admin-post-editor">
    <header class="admin-editor-heading">
      <div>
        <NuxtLink class="admin-editor-heading__back" to="/admin/posts"
          >← 返回文章管理</NuxtLink
        >
        <p class="admin-editor-heading__eyebrow">
          {{ postId ? 'Continue editing' : 'New publication' }}
        </p>
        <h1>{{ postId ? post?.title || '编辑文章' : '新建文章' }}</h1>
        <p>
          {{
            postId
              ? '保存正文、元数据与发布状态。'
              : '先保存为草稿，再决定何时公开。'
          }}
        </p>
      </div>
      <div v-if="postId && post" class="admin-editor-heading__actions">
        <UiButton
          v-if="post.status === 'draft'"
          variant="primary"
          size="small"
          :disabled="isSubmitting || isLoading"
          @click="requestAction('publish')"
        >
          发布
        </UiButton>
        <UiButton
          v-else
          variant="secondary"
          size="small"
          :disabled="isSubmitting || isLoading"
          @click="requestAction('unpublish')"
        >
          撤回
        </UiButton>
        <UiButton
          variant="danger"
          size="small"
          :disabled="isSubmitting || isLoading"
          @click="requestAction('delete')"
        >
          删除
        </UiButton>
      </div>
    </header>

    <div v-if="isLoadError" class="admin-resource-state" role="alert">
      <strong>{{
        isNotFound ? '没有找到这篇文章' : '文章编辑器暂时无法加载'
      }}</strong>
      <p>{{ errorMessage }}</p>
      <div class="admin-resource-state__actions">
        <UiButton variant="secondary" @click="retryLoad">重新加载</UiButton>
        <NuxtLink class="admin-resource-state__link" to="/admin/posts"
          >返回文章管理</NuxtLink
        >
      </div>
    </div>
    <AdminPostForm
      v-else
      ref="formRef"
      :dirty="isDirty"
      :error-message="errorMessage"
      :is-loading="isLoading"
      :is-submitting="isSubmitting"
      :post="post"
      :tags="tags"
      @canonical="handleFormCanonical"
      @change="handleFormChange"
      @preview="preview"
      @save="save"
      @sync="handleFormSync"
    />

    <UiDialog
      v-model:open="previewOpen"
      title="Markdown 预览"
      description="这是当前表单内容的安全预览，保存前也可以继续修改。"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <article class="admin-markdown-preview" v-html="previewHtml" />
    </UiDialog>

    <UiDialog
      :open="Boolean(pendingAction)"
      :title="actionCopy.title"
      :description="actionCopy.description"
      @update:open="(open) => !open && (pendingAction = null)"
    >
      <template #footer>
        <UiButton variant="ghost" @click="pendingAction = null">取消</UiButton>
        <UiButton
          :variant="pendingAction === 'delete' ? 'danger' : 'primary'"
          :loading="isSubmitting"
          @click="confirmAction"
        >
          {{ actionCopy.confirm }}
        </UiButton>
      </template>
    </UiDialog>

    <UiDialog
      :open="recoveryOpen"
      title="发现未保存的草稿"
      description="上次离开编辑器时还有未保存的改动，已从本地备份中恢复出内容。选择恢复会覆盖当前表单，选择丢弃会删除备份。"
      @update:open="(open) => !open && discardDraft()"
    >
      <template #footer>
        <UiButton variant="ghost" @click="discardDraft">丢弃备份</UiButton>
        <UiButton variant="primary" @click="restoreDraft">恢复草稿</UiButton>
      </template>
    </UiDialog>

    <UiDialog
      :open="leaveDialogOpen"
      title="离开编辑器？"
      description="当前有未保存的更改。离开后可以重新打开这篇文章，并从本地备份恢复；选择留下可以继续编辑。"
      @update:open="(open) => !open && cancelLeave()"
    >
      <template #footer>
        <UiButton variant="secondary" @click="cancelLeave">继续编辑</UiButton>
        <UiButton variant="danger" @click="leaveAfterDiscard">
          放弃更改并离开
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.admin-post-editor {
  display: grid;
  gap: var(--space-4);
}

.admin-editor-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-5);
  padding-top: var(--space-6);
}

.admin-editor-heading h1,
.admin-editor-heading p {
  margin: 0;
}

.admin-editor-heading h1 {
  margin-top: var(--space-2);
  font-size: clamp(2rem, 5vw, 3.5rem);
  letter-spacing: -0.04em;
}

.admin-editor-heading > div > p:last-child {
  margin-top: var(--space-3);
  color: var(--color-text-muted);
}

.admin-editor-heading__back {
  display: inline-flex;
  margin-bottom: var(--space-4);
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-editor-heading__eyebrow {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-editor-heading__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.admin-markdown-preview {
  max-width: 48rem;
  color: var(--color-text-muted);
  line-height: 1.8;
}

.admin-markdown-preview :deep(h1),
.admin-markdown-preview :deep(h2),
.admin-markdown-preview :deep(h3) {
  color: var(--color-text);
  line-height: 1.25;
}

.admin-markdown-preview :deep(pre) {
  overflow: auto;
  padding: var(--space-4);
  border-radius: var(--radius-medium);
  background: var(--color-canvas-raised);
}

.admin-markdown-preview :deep(blockquote) {
  margin-inline: 0;
  padding-inline-start: var(--space-4);
  border-inline-start: 0.2rem solid var(--color-accent-soft);
  color: var(--color-text-subtle);
}

.admin-resource-state {
  display: grid;
  min-height: 18rem;
  place-content: center;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
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

.admin-resource-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.admin-resource-state__link {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  color: var(--color-text-muted);
}

@media (width <= 30rem) {
  .admin-editor-heading {
    align-items: start;
    flex-direction: column;
  }

  .admin-editor-heading__actions {
    width: 100%;
    justify-content: stretch;
  }

  .admin-editor-heading__actions .button {
    flex: 1;
  }
}
</style>
