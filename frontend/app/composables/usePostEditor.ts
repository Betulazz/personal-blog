import {
  computed,
  shallowReadonly,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import { BlogApiError, type BlogApiClient } from '~/api/client'
import type { AdminPost, AdminPostInput, AdminTaxonomy } from '~/types/admin'
import {
  adminPostDraftKey,
  clearAdminPostDraft,
  readAdminPostDraftRecord,
  saveAdminPostDraftRecord,
  serializeAdminPostInput,
  type AdminPostDraftRecord,
  type PostWriteAction,
} from '~/utils/admin-post-draft'

type PostAdapter = Pick<
  BlogApiClient,
  | 'getAdminPost'
  | 'listAdminTags'
  | 'createAdminPost'
  | 'updateAdminPost'
  | 'previewAdminPost'
  | 'publishAdminPost'
  | 'unpublishAdminPost'
  | 'deleteAdminPost'
  | 'listAdminPosts'
>
type Options = {
  postId: MaybeRefOrGetter<string | undefined>
  authenticated: MaybeRefOrGetter<boolean>
  api: PostAdapter
  withSession: <T>(request: () => Promise<T>) => Promise<T>
  storage: () => Storage | null
  navigate: (path: string) => Promise<unknown>
}

const emptyInput = (): AdminPostInput => ({
  title: '',
  slug: '',
  summary: '',
  body: '',
  tag_ids: [],
  cover_alt: null,
  cover_url: null,
  is_pinned: false,
})
const copy = (input: AdminPostInput): AdminPostInput => ({
  ...input,
  tag_ids: [...(input.tag_ids ?? [])],
})
const toWriteInput = (input: AdminPostInput): AdminPostInput => ({
  ...copy(input),
  title: input.title.trim(),
  slug: input.slug.trim(),
  summary: input.summary.trim(),
  cover_url: input.cover_url?.trim() || null,
  cover_alt: input.cover_alt?.trim() || null,
})
const fromPost = (post: AdminPost): AdminPostInput => ({
  title: post.title,
  slug: post.slug,
  summary: post.summary,
  body: post.body,
  cover_alt: post.coverAlt ?? null,
  cover_url: post.coverUrl ?? null,
  is_pinned: post.isPinned,
  tag_ids: post.tagIds.map(Number),
})
const same = (left: AdminPostInput, right: AdminPostInput) =>
  serializeAdminPostInput(left) === serializeAdminPostInput(right)
const errorText = (error: unknown, fallback: string) => {
  if (!(error instanceof BlogApiError)) return fallback
  if (error.status === 401)
    return '会话已过期，请重新登录；当前编辑内容已保留。'
  const messages: Record<string, string> = {
    csrf_invalid: '安全校验失败，请刷新页面后重试；当前内容仍保留。',
    post_already_published: '这篇文章已经发布，请重新核对状态。',
    post_body_required: '发布前请先写入 Markdown 正文。',
    post_not_found: '这篇文章已经不存在，可能已被删除。',
    post_not_published: '这篇文章当前不是已发布状态。',
    post_slug_conflict: '这个 slug 已经被其他文章使用，请换一个。',
    tag_not_found: '所选标签已经不存在，请重新选择后保存。',
    validation_error: '请检查表单中的字段格式。',
  }
  return messages[error.code] ?? fallback
}

/** The view and tests use the same editing seam; request and draft ownership stay here. */
export function usePostEditor(options: Options) {
  const input = ref<AdminPostInput>(emptyInput())
  const baseline = ref<AdminPostInput>(emptyInput())
  const post = ref<AdminPost | null>(null)
  const tags = ref<AdminTaxonomy[]>([])
  const isLoading = ref(true)
  const isSubmitting = ref(false)
  const isPreviewing = ref(false)
  const editorReady = ref(false)
  const errorMessage = ref<string | null>(null)
  const notice = ref('')
  const isLoadError = ref(false)
  const isNotFound = ref(false)
  const previewOpen = ref(false)
  const previewSource = ref('')
  const pendingAction = ref<Exclude<PostWriteAction, 'save'> | null>(null)
  const recoveryOpen = ref(false)
  const leaveDialogOpen = ref(false)
  const unknown = ref<AdminPostDraftRecord['unknown']>()
  let candidate: AdminPostDraftRecord | null = null
  let activeId = toValue(options.postId)
  let generation = 0
  let previewRevision = 0
  let disposed = false
  let internalNavigation = false
  let draftChecked = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let resolveLeave: ((allow: boolean) => void) | undefined
  const current = (epoch: number) => !disposed && generation === epoch
  const isDirty = computed(() => !same(input.value, baseline.value))
  const locked = computed(
    () => isLoading.value || isSubmitting.value || recoveryOpen.value,
  )
  const canWrite = computed(
    () => !locked.value && editorReady.value && !unknown.value,
  )

  const storage = () => {
    try {
      return options.storage()
    } catch {
      return null
    }
  }
  const cancelTimer = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const persist = () => {
    cancelTimer()
    if (disposed || recoveryOpen.value || !draftChecked) return
    const target = storage()
    if (!target) {
      notice.value = '本地备份不可用，请及时保存到服务器。'
      return
    }
    const key = adminPostDraftKey(activeId)
    if (!isDirty.value && !unknown.value) clearAdminPostDraft(target, key)
    else if (
      !saveAdminPostDraftRecord(target, key, {
        version: 2,
        input: copy(input.value),
        ...(unknown.value ? { unknown: unknown.value } : {}),
      })
    )
      notice.value = '本地备份失败，请及时保存到服务器。'
  }
  const scheduleDraft = () => {
    cancelTimer()
    const epoch = generation
    timer = setTimeout(() => {
      if (current(epoch)) persist()
    }, 600)
  }
  const edit = (next: AdminPostInput) => {
    if (locked.value || disposed) return
    input.value = copy(next)
    scheduleDraft()
  }
  const canonical = (body: string) => {
    if (disposed || isLoading.value) return
    // Serialization alone must not turn an untouched server body into an edit.
    if (input.value.body === baseline.value.body)
      baseline.value = { ...baseline.value, body }
    input.value = { ...input.value, body }
    editorReady.value = true
    if (!draftChecked) {
      draftChecked = true
      const target = storage()
      candidate = target
        ? readAdminPostDraftRecord(target, adminPostDraftKey(activeId))
        : null
      if (
        candidate &&
        (!same(candidate.input, baseline.value) || candidate.unknown)
      ) {
        recoveryOpen.value = true
      } else {
        candidate = null
        persist()
      }
    } else scheduleDraft()
  }
  const restoreDraft = () => {
    if (!candidate || isSubmitting.value) return
    input.value = copy(candidate.input)
    unknown.value = candidate.unknown
    candidate = null
    recoveryOpen.value = false
    persist()
  }
  const discardDraft = () => {
    if (isSubmitting.value) return
    candidate = null
    recoveryOpen.value = false
    unknown.value = undefined
    cancelTimer()
    const target = storage()
    if (target) clearAdminPostDraft(target, adminPostDraftKey(activeId))
  }
  const load = async () => {
    if (disposed || isSubmitting.value || !toValue(options.authenticated))
      return
    const epoch = ++generation
    const id = activeId
    isLoading.value = true
    editorReady.value = false
    isLoadError.value = false
    isNotFound.value = false
    errorMessage.value = null
    draftChecked = false
    try {
      const [loadedTags, loadedPost] = await options.withSession(() =>
        Promise.all([
          options.api.listAdminTags(),
          id ? options.api.getAdminPost(id) : Promise.resolve(null),
        ]),
      )
      if (!current(epoch)) return
      tags.value = loadedTags
      post.value = loadedPost
      input.value = loadedPost ? fromPost(loadedPost) : emptyInput()
      baseline.value = copy(input.value)
    } catch (error: unknown) {
      if (!current(epoch)) return
      isLoadError.value = true
      isNotFound.value =
        error instanceof BlogApiError && error.code === 'post_not_found'
      errorMessage.value = errorText(
        error,
        '文章编辑器暂时无法加载，请稍后重试。',
      )
    } finally {
      if (current(epoch)) isLoading.value = false
    }
  }
  const navigate = async (path: string) => {
    internalNavigation = true
    try {
      await options.navigate(path)
    } finally {
      internalNavigation = false
    }
  }
  const write = async (action: PostWriteAction) => {
    if (!canWrite.value || disposed || (action !== 'save' && !activeId)) return
    if (action === 'publish' && isDirty.value) {
      errorMessage.value = '有未保存的更改，请先保存再发布。'
      return
    }
    const epoch = generation
    const id = activeId
    const submitted = toWriteInput(input.value)
    const previousBody = baseline.value.body
    isSubmitting.value = true
    errorMessage.value = null
    notice.value = ''
    pendingAction.value = null
    ++previewRevision
    isPreviewing.value = false
    unknown.value = { action, submitted }
    persist() // A reload during the request must retain the uncertainty too.
    try {
      const saved = await options.withSession(() => {
        if (action === 'save')
          return id
            ? options.api.updateAdminPost(id, submitted)
            : options.api.createAdminPost(submitted)
        if (action === 'publish') return options.api.publishAdminPost(id!)
        if (action === 'unpublish') return options.api.unpublishAdminPost(id!)
        return options.api.deleteAdminPost(id!).then(() => null)
      })
      if (!current(epoch)) return
      unknown.value = undefined
      if (action === 'delete') {
        cancelTimer()
        const target = storage()
        if (target) clearAdminPostDraft(target, adminPostDraftKey(id))
        baseline.value = copy(input.value)
        await navigate('/admin/posts')
      } else if (saved) {
        post.value = saved
        const savedInput = fromPost(saved)
        // State actions only change publication state, never the unsaved form.
        baseline.value =
          action === 'save' ? savedInput : { ...savedInput, body: previousBody }
        if (action === 'save') input.value = copy(savedInput)
        persist()
        if (!id) await navigate(`/admin/posts/${saved.id}/edit`)
      }
    } catch (error: unknown) {
      if (!current(epoch)) return
      if (
        error instanceof BlogApiError &&
        error.status > 0 &&
        error.status < 500
      ) {
        unknown.value = undefined
        errorMessage.value = errorText(error, '操作失败，当前编辑内容仍保留。')
      } else {
        errorMessage.value =
          '操作结果暂时无法确认。请先核对服务器结果，当前内容已保留，不会自动重发。'
      }
      persist()
    } finally {
      if (current(epoch)) {
        isSubmitting.value = false
        if (notice.value === '操作正在进行，请等待操作结束后再离开。')
          notice.value = ''
      }
    }
  }
  const requestAction = (action: Exclude<PostWriteAction, 'save'>) => {
    if (!canWrite.value) return
    if (action === 'publish' && isDirty.value) {
      errorMessage.value = '有未保存的更改，请先保存再发布。'
      return
    }
    pendingAction.value = action
  }
  const confirmAction = () =>
    pendingAction.value ? write(pendingAction.value) : Promise.resolve()
  const preview = async () => {
    if (locked.value || !editorReady.value || disposed) return
    const epoch = generation
    const revision = ++previewRevision
    const id = activeId
    const snapshot = toWriteInput(input.value)
    isPreviewing.value = true
    errorMessage.value = null
    try {
      const result = id
        ? await options.withSession(() =>
            options.api.previewAdminPost(id, snapshot),
          )
        : null
      if (!current(epoch) || revision !== previewRevision) return
      previewSource.value = result?.body ?? snapshot.body
      previewOpen.value = true
    } catch (error: unknown) {
      if (current(epoch) && revision === previewRevision)
        errorMessage.value = errorText(error, '预览暂时无法生成，请稍后重试。')
    } finally {
      if (current(epoch) && revision === previewRevision)
        isPreviewing.value = false
    }
  }
  const reconcile = async () => {
    if (!unknown.value || isSubmitting.value || disposed) return
    const epoch = generation
    const id = activeId
    const pending = unknown.value
    isSubmitting.value = true
    try {
      const saved = await options.withSession(async () => {
        if (id) return options.api.getAdminPost(id)
        // Admin search includes the title, but does not search the slug.
        let page = 1
        while (current(epoch)) {
          const result = await options.api.listAdminPosts({
            page,
            pageSize: 100,
            q: pending.submitted.title.trim(),
          })
          const match = result.data.find(
            (item) => item.slug === pending.submitted.slug.trim(),
          )
          if (match) return match
          if (page >= result.pagination.totalPages || !result.data.length)
            return null
          page += 1
        }
        return null
      })
      if (!current(epoch)) return
      const confirmed =
        saved &&
        ((pending.action === 'save' &&
          same(fromPost(saved), pending.submitted)) ||
          (pending.action === 'publish' && saved.status === 'published') ||
          (pending.action === 'unpublish' && saved.status === 'draft'))
      if (!confirmed) {
        errorMessage.value =
          '尚未确认上次操作结果。请在文章管理中核对，确认后再允许操作。'
        return
      }
      post.value = saved
      baseline.value = fromPost(saved)
      unknown.value = undefined
      errorMessage.value = null
      notice.value = '已核对服务器结果；当前编辑内容已保留。'
      persist()
      if (!id) {
        const target = storage()
        if (target && isDirty.value)
          saveAdminPostDraftRecord(target, adminPostDraftKey(saved.id), {
            version: 2,
            input: copy(input.value),
          })
        if (target) clearAdminPostDraft(target, adminPostDraftKey())
        await navigate(`/admin/posts/${saved.id}/edit`)
      }
    } catch (error: unknown) {
      if (!current(epoch)) return
      if (
        pending.action === 'delete' &&
        error instanceof BlogApiError &&
        error.code === 'post_not_found'
      ) {
        unknown.value = undefined
        baseline.value = copy(input.value)
        persist()
        await navigate('/admin/posts')
      } else
        errorMessage.value = errorText(
          error,
          '暂时无法核对服务器结果；备份和提醒仍保留。',
        )
    } finally {
      if (current(epoch)) isSubmitting.value = false
    }
  }
  const acknowledgeUnknown = () => {
    if (isSubmitting.value || recoveryOpen.value) return
    unknown.value = undefined
    errorMessage.value = null
    persist()
  }
  const leave = () => {
    if (internalNavigation || disposed) return true
    persist()
    if (!toValue(options.authenticated)) return true
    if (isSubmitting.value) {
      notice.value = '操作正在进行，请等待操作结束后再离开。'
      return false
    }
    if (!isDirty.value && !unknown.value && !recoveryOpen.value) return true
    if (resolveLeave) return false
    leaveDialogOpen.value = true
    return new Promise<boolean>((resolve) => {
      resolveLeave = resolve
    })
  }
  const finishLeave = (choice: 'stay' | 'keep' | 'discard') => {
    if (choice === 'keep') {
      persist()
      const target = storage()
      const retained = target
        ? readAdminPostDraftRecord(target, adminPostDraftKey(activeId))
        : null
      const expected = candidate?.input ?? input.value
      if (!retained || !same(retained.input, expected)) {
        notice.value =
          '无法保留本地备份，请继续编辑并保存到服务器，或明确选择丢弃。'
        return
      }
    }
    if (choice === 'discard') {
      discardDraft()
      baseline.value = copy(input.value) // No later flush may resurrect this draft.
    }
    leaveDialogOpen.value = false
    const resolve = resolveLeave
    resolveLeave = undefined
    resolve?.(choice !== 'stay')
  }
  const beforeUnload = (event: BeforeUnloadEvent) => {
    persist()
    if (
      !isDirty.value &&
      !unknown.value &&
      !isSubmitting.value &&
      !recoveryOpen.value
    )
      return
    event.preventDefault()
    event.returnValue = ''
  }
  const stop = watch(
    () => [toValue(options.postId), toValue(options.authenticated)] as const,
    ([id, authenticated], previous) => {
      if (previous && id === activeId && previous[1] === authenticated) return
      if (previous && id === activeId && !authenticated) {
        persist()
        return
      }
      persist()
      cancelTimer()
      ++generation
      ++previewRevision
      activeId = id
      input.value = emptyInput()
      baseline.value = emptyInput()
      post.value = null
      candidate = null
      recoveryOpen.value = false
      unknown.value = undefined
      pendingAction.value = null
      isSubmitting.value = false
      isPreviewing.value = false
      previewOpen.value = false
      notice.value = ''
      draftChecked = false
      editorReady.value = false
      isLoading.value = true
      finishLeave('stay')
      if (authenticated) void load()
    },
    { immediate: true, flush: 'sync' },
  )
  const dispose = () => {
    persist()
    cancelTimer()
    disposed = true
    ++generation
    stop()
    finishLeave('stay')
  }
  return {
    input: shallowReadonly(input),
    post: shallowReadonly(post),
    tags: shallowReadonly(tags),
    isLoading,
    isSubmitting,
    isPreviewing,
    editorReady,
    isDirty,
    locked,
    canWrite,
    errorMessage,
    notice,
    isLoadError,
    isNotFound,
    previewOpen,
    previewSource,
    pendingAction,
    recoveryOpen,
    leaveDialogOpen,
    unknown: shallowReadonly(unknown),
    edit,
    canonical,
    load,
    save: () => write('save'),
    preview,
    requestAction,
    confirmAction,
    restoreDraft,
    discardDraft,
    reconcile,
    acknowledgeUnknown,
    leave,
    finishLeave,
    beforeUnload,
    dispose,
  }
}
