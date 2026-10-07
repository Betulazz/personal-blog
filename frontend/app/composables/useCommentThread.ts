import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import { BlogApiError, useApiClient } from '~/api/client'
import type {
  BlogComment,
  CommenterProfile,
  PublicCommentThread,
} from '~/types/comments'

type Resource = { resourceType: 'about' | 'post'; postId?: string }
type Mode = 'new' | 'reply' | 'edit'
type Draft = {
  body: string
  parentId: string | null
  editingId: string | null
  submissionToken?: string
}
type Settlement = {
  key: string
  token: string
  outcome: 'success' | 'failed' | 'unknown'
}

// Only submission tokens are shared between mounted browser instances, never threads.
const inFlight = new Set<string>()
const settlementEvent = 'blog:comment-submission-settled'
const keyOf = (resource: Resource) =>
  resource.resourceType === 'about'
    ? 'comment-draft:about'
    : `comment-draft:post:${resource.postId}`
const findComment = (
  comments: BlogComment[],
  id: string,
): BlogComment | undefined => {
  for (const comment of comments) {
    if (comment.id === id) return comment
    const reply = comment.replies.find((item) => item.id === id)
    if (reply) return reply
  }
}
const sortComments = (comments: BlogComment[]) =>
  comments.sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true }),
  )

function errorText(error: unknown) {
  const messages: Record<string, string> = {
    commenter_authentication_required:
      '登录状态已失效，请重新使用 GitHub 登录。',
    commenter_banned: '此 GitHub 账号目前不能参与评论。',
    comment_body_too_long: '评论最多 3000 个字符。',
    comment_link_unsafe: '评论中包含不支持的链接。',
    comment_media_unsupported: '评论暂不支持图片或嵌入媒体。',
    comment_rate_limited: '操作太频繁，请稍后再试。',
    comment_thread_closed: '这条讨论已关闭，暂时不能继续参与。',
    comment_parent_invalid: '原回复目标已不可用，正文仍保留，请重新选择。',
    csrf_invalid: '安全校验已过期，请重试；草稿仍保留。',
    github_login_unavailable: 'GitHub 评论服务暂不可用。',
  }
  return error instanceof BlogApiError
    ? (messages[error.code] ?? '操作失败，草稿仍保留在编辑器中。')
    : '操作失败，草稿仍保留在编辑器中。'
}

export function useCommentThread(resource: MaybeRefOrGetter<Resource>) {
  const api = useApiClient()
  const route = useRoute()
  const router = useRouter()
  const profile = ref<CommenterProfile | null>(null)
  const thread = ref<PublicCommentThread | null>(null)
  const isLoading = ref(true)
  const isLoadingMore = ref(false)
  const isSubmitting = ref(false)
  const isPreviewing = ref(false)
  const isLoginEnabled = ref(false)
  const errorMessage = ref('')
  const notice = ref('')
  const text = ref('')
  const mode = ref<Mode>('new')
  const targetId = ref<string | null>(null)
  const targetStatus = ref<'ready' | 'pending' | 'unavailable'>('ready')
  const submissionToken = ref<string | undefined>()
  const submissionUnknown = ref(false)
  const previewHtml = ref('')
  const showPreview = ref(false)
  let mounted = false
  let generation = 0
  let loadRevision = 0
  let threadRevision = 0
  let previewRevision = 0
  let activeResource = { ...toValue(resource) }
  let readController: AbortController | null = null
  const isAuthenticated = computed(() => Boolean(profile.value))
  const canParticipate = computed(() =>
    Boolean(
      profile.value &&
      !profile.value.isBanned &&
      isLoginEnabled.value &&
      thread.value?.isOpen,
    ),
  )
  const composerLocked = computed(() => isSubmitting.value)
  const canSubmit = computed(
    () =>
      canParticipate.value &&
      !composerLocked.value &&
      !isLoading.value &&
      targetStatus.value === 'ready' &&
      !submissionUnknown.value &&
      Boolean(text.value.trim()),
  )
  const editing = computed(() =>
    mode.value === 'edit' && targetStatus.value === 'ready' && targetId.value
      ? (findComment(thread.value?.comments ?? [], targetId.value) ?? null)
      : null,
  )
  const replyingTo = computed(() =>
    mode.value === 'reply' && targetStatus.value === 'ready' && targetId.value
      ? (thread.value?.comments.find((item) => item.id === targetId.value) ??
        null)
      : null,
  )
  const draftTargetMessage = computed(() =>
    targetStatus.value === 'pending'
      ? '原评论尚未加载，正文已保留；请加载更多评论以恢复目标。'
      : targetStatus.value === 'unavailable'
        ? '原评论已不可用或不能编辑，正文已保留；请选择其他目标或改为独立评论。'
        : '',
  )
  const current = (epoch: number) => mounted && epoch === generation
  const draft = (): Draft => ({
    body: text.value,
    parentId: mode.value === 'reply' ? targetId.value : null,
    editingId: mode.value === 'edit' ? targetId.value : null,
    ...(submissionToken.value
      ? { submissionToken: submissionToken.value }
      : {}),
  })
  const storage = () => {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }
  const persistDraft = () => {
    if (!mounted) return
    try {
      storage()?.setItem(keyOf(activeResource), JSON.stringify(draft()))
    } catch {
      /* Storage is optional. */
    }
  }
  const invalidatePreview = () => {
    previewRevision++
    previewHtml.value = ''
    isPreviewing.value = false
    showPreview.value = false
  }
  const setBody = (value: string) => {
    if (composerLocked.value || value === text.value) return
    text.value = value
    if (!submissionUnknown.value) submissionToken.value = undefined
    invalidatePreview()
    persistDraft()
  }
  const body = computed({ get: () => text.value, set: setBody })
  const resolveTarget = () => {
    if (mode.value === 'new') {
      targetStatus.value = 'ready'
      return
    }
    if (!thread.value || !targetId.value) {
      targetStatus.value = 'pending'
      return
    }
    const comment =
      mode.value === 'reply'
        ? thread.value.comments.find((item) => item.id === targetId.value)
        : findComment(thread.value.comments, targetId.value)
    targetStatus.value = comment
      ? comment.state === 'visible' &&
        (mode.value !== 'edit' || comment.canEdit)
        ? 'ready'
        : 'unavailable'
      : thread.value.hasMore
        ? 'pending'
        : 'unavailable'
  }
  const resetComposer = () => {
    if (composerLocked.value) return
    text.value = ''
    mode.value = 'new'
    targetId.value = null
    targetStatus.value = 'ready'
    submissionToken.value = undefined
    submissionUnknown.value = false
    invalidatePreview()
    persistDraft()
  }
  const useAsRoot = () => {
    if (composerLocked.value) return
    mode.value = 'new'
    targetId.value = null
    targetStatus.value = 'ready'
    if (!submissionUnknown.value) submissionToken.value = undefined
    invalidatePreview()
    persistDraft()
  }
  const chooseTarget = (comment: BlogComment, nextMode: 'reply' | 'edit') => {
    if (
      composerLocked.value ||
      !canParticipate.value ||
      comment.state !== 'visible'
    )
      return false
    const existing =
      nextMode === 'reply'
        ? thread.value?.comments.find((item) => item.id === comment.id)
        : findComment(thread.value?.comments ?? [], comment.id)
    if (!existing || (nextMode === 'edit' && !existing.canEdit)) return false
    const preserve = targetStatus.value !== 'ready'
    mode.value = nextMode
    targetId.value = existing.id
    targetStatus.value = 'ready'
    if (!submissionUnknown.value) submissionToken.value = undefined
    if (!preserve)
      text.value = nextMode === 'edit' ? (existing.bodyMarkdown ?? '') : ''
    invalidatePreview()
    persistDraft()
    return true
  }
  const startReply = (comment: BlogComment) => chooseTarget(comment, 'reply')
  const startEdit = (comment: BlogComment) => chooseTarget(comment, 'edit')
  const readThread = (
    destination: Resource,
    cursor?: string,
    signal?: AbortSignal,
  ) =>
    destination.resourceType === 'about'
      ? api.getAboutComments(cursor, signal)
      : api.getPostComments(destination.postId ?? '', cursor, signal)

  const showCommentError = (error: unknown) => {
    if (error instanceof BlogApiError) {
      if (error.code === 'commenter_authentication_required')
        profile.value = null
      if (error.code === 'commenter_banned' && profile.value)
        profile.value.isBanned = true
      if (error.code === 'github_login_unavailable')
        isLoginEnabled.value = false
      if (error.code === 'comment_parent_invalid')
        targetStatus.value = 'unavailable'
    }
    errorMessage.value = errorText(error)
  }
  const load = async () => {
    if (!mounted) return
    const epoch = generation
    const revision = ++loadRevision
    const contentVersion = threadRevision
    const destination = { ...activeResource }
    readController?.abort()
    const controller = new AbortController()
    readController = controller
    // Refreshing the list must not hide an editor that is awaiting publication.
    isLoading.value = !thread.value || !isSubmitting.value
    isLoadingMore.value = false
    errorMessage.value = ''
    try {
      const [session, result] = await Promise.all([
        api.getCommenterSession(controller.signal),
        readThread(destination, undefined, controller.signal),
      ])
      if (!current(epoch) || revision !== loadRevision) return
      if (contentVersion !== threadRevision) {
        void load()
        return
      }
      profile.value = session.commenter
      isLoginEnabled.value = session.githubLoginEnabled
      thread.value = result
      resolveTarget()
    } catch {
      if (current(epoch) && revision === loadRevision)
        errorMessage.value = '评论暂时无法加载，请稍后重试。'
    } finally {
      if (current(epoch) && revision === loadRevision) isLoading.value = false
    }
  }
  const loadMore = async () => {
    if (
      !thread.value?.hasMore ||
      !thread.value.nextCursor ||
      isLoadingMore.value ||
      isLoading.value
    )
      return
    const epoch = generation
    const revision = loadRevision
    const contentVersion = threadRevision
    const destination = { ...activeResource }
    const cursor = thread.value.nextCursor
    isLoadingMore.value = true
    errorMessage.value = ''
    try {
      const next = await readThread(destination, cursor, readController?.signal)
      if (
        !current(epoch) ||
        revision !== loadRevision ||
        contentVersion !== threadRevision ||
        !thread.value
      )
        return
      const comments = new Map(
        thread.value.comments.map((item) => [item.id, item]),
      )
      for (const item of next.comments) comments.set(item.id, item)
      thread.value = { ...next, comments: sortComments([...comments.values()]) }
      resolveTarget()
    } catch {
      if (current(epoch) && revision === loadRevision)
        errorMessage.value = '更多评论暂时无法加载，请重试。'
    } finally {
      if (current(epoch) && revision === loadRevision)
        isLoadingMore.value = false
    }
  }
  const togglePreview = async () => {
    if (composerLocked.value) return
    showPreview.value = !showPreview.value
    const revision = ++previewRevision
    if (!showPreview.value) {
      isPreviewing.value = false
      return
    }
    const epoch = generation
    const source = text.value
    isPreviewing.value = true
    try {
      const html = await api.previewComment(source)
      if (
        current(epoch) &&
        revision === previewRevision &&
        text.value === source
      )
        previewHtml.value = html
    } catch (error) {
      if (current(epoch) && revision === previewRevision)
        showCommentError(error)
    } finally {
      if (current(epoch) && revision === previewRevision)
        isPreviewing.value = false
    }
  }
  const acknowledgeSubmission = () => {
    if (composerLocked.value) return
    submissionUnknown.value = false
    submissionToken.value = undefined
    persistDraft()
  }
  const applyWrite = (
    saved: BlogComment,
    operation: Mode,
    parentId: string | null,
  ) => {
    if (!thread.value) return
    threadRevision++
    const existing = findComment(thread.value.comments, saved.id)
    if (operation === 'edit') {
      // A write result is not a replacement for the loaded discussion snapshot.
      if (existing?.state === 'visible')
        Object.assign(existing, {
          bodyHtml: saved.bodyHtml,
          bodyMarkdown: saved.bodyMarkdown,
          editedAt: saved.editedAt,
          state: saved.state,
          canEdit: saved.canEdit,
        })
    } else if (!existing) {
      if (operation === 'reply') {
        const parent = thread.value.comments.find(
          (item) => item.id === parentId,
        )
        if (parent) parent.replies = sortComments([...parent.replies, saved])
      } else
        thread.value.comments = sortComments([...thread.value.comments, saved])
      thread.value.commentCount++
    }
  }
  const submit = async () => {
    if (!canSubmit.value) return
    const epoch = generation
    const destination = { ...activeResource }
    const key = keyOf(destination)
    const operation = mode.value
    const target = targetId.value
    const source = text.value
    const token = crypto.randomUUID()
    submissionToken.value = token
    inFlight.add(token)
    isSubmitting.value = true
    errorMessage.value = ''
    notice.value = ''
    persistDraft()
    const submittedDraft = JSON.stringify(draft())
    let outcome: Settlement['outcome'] = 'unknown'
    try {
      const saved =
        operation === 'edit'
          ? await api.editComment(target!, source)
          : destination.resourceType === 'about'
            ? await api.createAboutComment(
                source,
                operation === 'reply' ? target! : undefined,
              )
            : await api.createPostComment(
                destination.postId ?? '',
                source,
                operation === 'reply' ? target! : undefined,
              )
      outcome = 'success'
      try {
        if (storage()?.getItem(key) === submittedDraft)
          storage()?.removeItem(key)
      } catch {
        /* Never discard a different or newer draft. */
      }
      if (current(epoch) && submissionToken.value === token) {
        applyWrite(saved, operation, target)
        isSubmitting.value = false
        resetComposer()
        notice.value =
          operation === 'edit'
            ? '评论已更新。'
            : operation === 'reply'
              ? '回复已发布。'
              : '评论已发布。'
      }
    } catch (error) {
      outcome =
        error instanceof BlogApiError &&
        error.status >= 400 &&
        error.status < 500
          ? 'failed'
          : 'unknown'
      if (current(epoch) && submissionToken.value === token) {
        isSubmitting.value = false
        submissionUnknown.value = outcome === 'unknown'
        if (outcome === 'failed') submissionToken.value = undefined
        showCommentError(error)
        persistDraft()
      } else if (outcome === 'failed') {
        try {
          if (storage()?.getItem(key) === submittedDraft) {
            const retained: Draft = {
              body: source,
              parentId: operation === 'reply' ? target : null,
              editingId: operation === 'edit' ? target : null,
            }
            storage()?.setItem(key, JSON.stringify(retained))
          }
        } catch {
          /* Keep the uncertain draft if storage is unavailable. */
        }
      }
    } finally {
      inFlight.delete(token)
      window.dispatchEvent(
        new CustomEvent<Settlement>(settlementEvent, {
          detail: { key, token, outcome },
        }),
      )
    }
  }
  const toggleLike = async (comment: BlogComment) => {
    if (!thread.value?.isOpen) return
    if (!isAuthenticated.value) {
      beginLogin()
      return
    }
    if (profile.value?.isBanned) {
      errorMessage.value = '此 GitHub 账号目前不能参与评论。'
      return
    }
    const epoch = generation
    try {
      const liked = await api.toggleCommentLike(comment.id)
      if (!current(epoch)) return
      const existing = findComment(thread.value?.comments ?? [], comment.id)
      if (!existing) return
      if (existing.likedByMe !== liked)
        existing.likeCount = Math.max(0, existing.likeCount + (liked ? 1 : -1))
      existing.likedByMe = liked
      threadRevision++
    } catch (error) {
      if (current(epoch)) showCommentError(error)
    }
  }
  const removeOwnComment = async (comment: BlogComment) => {
    if (
      !comment.canEdit ||
      !window.confirm('删除这条评论？有回复的评论会保留“已删除”提示。')
    )
      return
    const epoch = generation
    try {
      await api.deleteComment(comment.id)
      if (!current(epoch)) return
      threadRevision++
      await load()
      if (current(epoch)) notice.value = '评论已删除。'
    } catch (error) {
      if (current(epoch)) showCommentError(error)
    }
  }
  const beginLogin = () => {
    if (composerLocked.value) return
    persistDraft()
    window.location.assign(api.commenterLoginUrl(route.path))
  }
  const signOut = async () => {
    if (composerLocked.value) return
    const epoch = generation
    try {
      await api.logoutCommenter()
      if (!current(epoch)) return
      profile.value = null
      await load()
      if (current(epoch)) notice.value = '已退出 GitHub 评论登录。'
    } catch (error) {
      if (current(epoch)) showCommentError(error)
    }
  }
  const restoreDraft = () => {
    let recovered: Draft = { body: '', parentId: null, editingId: null }
    try {
      const saved = storage()?.getItem(keyOf(activeResource))
      if (saved) {
        try {
          const parsed: unknown = JSON.parse(saved)
          if (parsed && typeof parsed === 'object' && 'body' in parsed) {
            const value = parsed as Record<string, unknown>
            recovered = {
              body: typeof value.body === 'string' ? value.body : '',
              parentId:
                typeof value.parentId === 'string' ? value.parentId : null,
              editingId:
                typeof value.editingId === 'string' ? value.editingId : null,
              ...(typeof value.submissionToken === 'string'
                ? { submissionToken: value.submissionToken }
                : {}),
            }
          } else recovered.body = saved
        } catch {
          recovered.body = saved
        }
      }
    } catch {
      /* Browser storage can be unavailable. */
    }
    text.value = recovered.body
    mode.value = recovered.editingId
      ? 'edit'
      : recovered.parentId
        ? 'reply'
        : 'new'
    targetId.value = recovered.editingId ?? recovered.parentId
    targetStatus.value = mode.value === 'new' ? 'ready' : 'pending'
    submissionToken.value = recovered.submissionToken
    isSubmitting.value = Boolean(
      recovered.submissionToken && inFlight.has(recovered.submissionToken),
    )
    submissionUnknown.value = Boolean(
      recovered.submissionToken && !isSubmitting.value,
    )
  }
  const activate = async () => {
    generation++
    const epoch = generation
    loadRevision++
    readController?.abort()
    activeResource = { ...toValue(resource) }
    thread.value = null
    profile.value = null
    errorMessage.value = ''
    notice.value = ''
    isLoadingMore.value = false
    invalidatePreview()
    restoreDraft()
    await load()
    if (!current(epoch)) return
    const outcome = route.query.comment_auth
    if (outcome === 'success') notice.value = 'GitHub 登录成功，草稿已恢复。'
    else if (outcome === 'cancelled')
      notice.value = '已取消 GitHub 登录，草稿仍保留。'
    else if (outcome === 'failed' || outcome === 'state_error')
      notice.value = 'GitHub 登录未完成，草稿仍保留。'
    if (outcome && current(epoch)) {
      const query = { ...route.query }
      delete query.comment_auth
      await router.replace({ path: route.path, query, hash: route.hash })
    }
  }
  const onSettlement = (event: Event) => {
    const { key, token, outcome } = (event as CustomEvent<Settlement>).detail
    if (key !== keyOf(activeResource) || token !== submissionToken.value) return
    isSubmitting.value = false
    if (outcome === 'success') {
      resetComposer()
      notice.value = '评论已发布，原草稿已清理。'
      void load()
    } else {
      submissionUnknown.value = outcome === 'unknown'
      if (outcome === 'failed') submissionToken.value = undefined
      errorMessage.value = '发布未完成确认，正文仍保留。'
      persistDraft()
    }
  }
  watch(
    () => keyOf(toValue(resource)),
    () => {
      if (mounted) void activate()
    },
    { flush: 'sync' },
  )
  onMounted(() => {
    mounted = true
    window.addEventListener(settlementEvent, onSettlement)
    void activate()
  })
  onBeforeUnmount(() => {
    persistDraft()
    mounted = false
    generation++
    readController?.abort()
    window.removeEventListener(settlementEvent, onSettlement)
  })
  return {
    profile,
    thread,
    isLoading,
    isLoadingMore,
    isSubmitting,
    isPreviewing,
    isAuthenticated,
    isLoginEnabled,
    errorMessage,
    notice,
    body,
    previewHtml,
    showPreview,
    replyingTo,
    editing,
    canParticipate,
    canSubmit,
    composerLocked,
    draftTargetMessage,
    submissionUnknown,
    load,
    loadMore,
    resetComposer,
    useAsRoot,
    startReply,
    startEdit,
    togglePreview,
    submit,
    toggleLike,
    removeOwnComment,
    beginLogin,
    signOut,
    acknowledgeSubmission,
  }
}
