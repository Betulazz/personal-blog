<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next'

import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import { useAdminCommentNotifications } from '~/stores/adminCommentNotifications'
import type {
  AdminComment,
  AdminCommentThread,
  AdminCommentDiscussion,
} from '~/types/comments'
import AdminCommentCard from '~/components/admin/AdminCommentCard.vue'

definePageMeta({ layout: 'admin' })

const api = useApiClient()
const session = useAdminSession()
const notifications = useAdminCommentNotifications()
const comments = ref<AdminComment[]>([])
const threads = ref<AdminCommentThread[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const replies = ref<Record<string, string>>({})
const isLoading = ref(false)
const workingId = ref<string | null>(null)
const errorMessage = ref('')
const notice = ref('')
let requestId = 0
let discussionRequestId = 0
const discussionOpen = ref(false)
const discussion = ref<AdminCommentDiscussion | null>(null)
const discussionId = ref<string | null>(null)
const discussionLoading = ref(false)
const discussionError = ref('')
const readError = ref('')
const pendingReadIds = new Set<string>()
let discussionTrigger: HTMLElement | null = null
const restoreDiscussionFocus = (event: Event) => {
  if (discussionTrigger?.isConnected) {
    event.preventDefault()
    discussionTrigger.focus()
  }
}

const acknowledge = async (items: AdminComment[]) => {
  for (const item of items) {
    if (!item.isAdministrator && item.state === 'visible')
      pendingReadIds.add(item.id)
  }
  const ids = [...pendingReadIds]
  try {
    await notifications.markRead(ids)
    for (const id of ids) pendingReadIds.delete(id)
    readError.value = pendingReadIds.size ? readError.value : ''
  } catch {
    readError.value = '评论已加载，但已读状态保存失败。请重试。'
    void notifications.refresh().catch(() => undefined)
  }
}

const loadDiscussion = async () => {
  if (!discussionId.value || !discussionOpen.value) return
  const current = ++discussionRequestId
  discussionLoading.value = true
  discussionError.value = ''
  try {
    const result = await session.withSession(() =>
      api.getAdminCommentDiscussion(discussionId.value!),
    )
    if (current !== discussionRequestId || !discussionOpen.value) return
    discussion.value = result
    discussionLoading.value = false
    await nextTick()
    if (current === discussionRequestId && discussionOpen.value)
      await acknowledge([result.root, ...result.replies])
  } catch {
    if (current === discussionRequestId)
      discussionError.value = '完整讨论暂时无法加载，请重试。'
  } finally {
    if (current === discussionRequestId) discussionLoading.value = false
  }
}

const openDiscussion = async (comment: AdminComment) => {
  discussionTrigger =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  discussion.value = null
  discussionId.value = comment.parentId ?? comment.id
  discussionOpen.value = true
  await loadDiscussion()
}

watch(discussionOpen, (open) => {
  if (!open) discussionRequestId++
})
onBeforeUnmount(() => {
  requestId++
  discussionRequestId++
})

const load = async () => {
  if (!session.isAuthenticated) return
  const current = ++requestId
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [result, threadResult] = await session.withSession(() =>
      Promise.all([
        api.listAdminComments(pagination.value.page, pagination.value.pageSize),
        api.listAdminCommentThreads(),
      ]),
    )
    if (current !== requestId) return
    comments.value = result.data
    pagination.value = result.pagination
    threads.value = threadResult
    isLoading.value = false
    await nextTick()
    if (current === requestId) await acknowledge(result.data)
  } catch (error: unknown) {
    if (current !== requestId) return
    errorMessage.value =
      error instanceof BlogApiError && error.status === 403
        ? '当前管理员没有评论管理权限。'
        : '评论管理工作区暂时无法加载。'
  } finally {
    if (current === requestId) isLoading.value = false
  }
}

const refresh = async (message?: string) => {
  if (message) notice.value = message
  await load()
  if (discussionOpen.value) await loadDiscussion()
}

const setVisibility = async (comment: AdminComment) => {
  workingId.value = comment.id
  errorMessage.value = ''
  try {
    await session.withSession(() =>
      api.setAdminCommentVisibility(
        comment.id,
        comment.state === 'hidden' ? 'visible' : 'hidden',
      ),
    )
    await refresh(
      comment.state === 'hidden' ? '评论已恢复显示。' : '评论已隐藏。',
    )
  } catch {
    errorMessage.value = '评论状态更新失败，请重试。'
  } finally {
    workingId.value = null
  }
}

const setBan = async (comment: AdminComment) => {
  if (!comment.githubUserId) return
  const isBanned = !comment.commenterIsBanned
  const confirmed = window.confirm(
    isBanned
      ? `封禁 GitHub 用户 ${comment.authorName}？其旧评论仍保留，可单独隐藏。`
      : `解除 GitHub 用户 ${comment.authorName} 的评论限制？`,
  )
  if (!confirmed) return
  workingId.value = comment.id
  errorMessage.value = ''
  try {
    await session.withSession(() =>
      api.setCommenterBanned(comment.githubUserId ?? '', isBanned),
    )
    await refresh(
      isBanned
        ? `${comment.authorName} 已被禁止继续参与评论。`
        : `${comment.authorName} 已可继续参与评论。`,
    )
  } catch {
    errorMessage.value = '账号封禁失败，请重试。'
  } finally {
    workingId.value = null
  }
}

const reply = async (comment: AdminComment) => {
  const body = replies.value[comment.id]?.trim()
  if (!body || workingId.value) return
  workingId.value = comment.id
  errorMessage.value = ''
  try {
    await session.withSession(() =>
      api.replyAsAdministrator(comment.parentId ?? comment.id, body),
    )
    replies.value[comment.id] = ''
    await refresh('已使用“博主”身份回复。')
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof BlogApiError && error.code === 'comment_thread_closed'
        ? '讨论已关闭，无法继续回复。'
        : '回复发布失败，请重试。'
  } finally {
    workingId.value = null
  }
}

const setThreadOpen = async (resourceKey: string, isOpen: boolean) => {
  workingId.value = resourceKey
  errorMessage.value = ''
  try {
    await session.withSession(() =>
      api.setCommentThreadOpen(resourceKey, isOpen),
    )
    await refresh(isOpen ? '讨论已重新开放。' : '讨论已关闭。')
  } catch {
    errorMessage.value = '讨论状态更新失败，请重试。'
  } finally {
    workingId.value = null
  }
}

const toggleThread = (comment: AdminComment) =>
  setThreadOpen(comment.resourceKey, !comment.threadIsOpen)

const toggleThreadOverview = (thread: AdminCommentThread) =>
  setThreadOpen(thread.resourceKey, !thread.isOpen)

const goToPage = async (page: number) => {
  pagination.value.page = page
  await load()
}

watch(
  () => session.status,
  (status) => {
    if (status === 'authenticated') void load()
  },
  { immediate: true },
)

useHead({ title: '评论管理 · 后台空间' })
</script>

<template>
  <div class="admin-comments-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">Reader conversation</p>
        <h1>评论管理</h1>
        <p>查看读者留言，处理讨论并直接以博主身份回复。</p>
      </div>
      <div class="admin-comments-page__summary">
        <MessageCircle :size="18" aria-hidden="true" />
        {{ pagination.total }} 条评论
      </div>
    </header>

    <p v-if="notice" class="admin-comments-page__notice" role="status">
      {{ notice }}
    </p>
    <p v-if="errorMessage" class="admin-comments-page__error" role="alert">
      {{ errorMessage }}
      <button type="button" :disabled="isLoading" @click="load">
        重新加载评论
      </button>
    </p>
    <p v-if="readError" class="admin-comments-page__error" role="alert">
      {{ readError }}
      <button type="button" @click="acknowledge([])">重试保存已读状态</button>
    </p>

    <section
      class="admin-comments-page__threads"
      aria-labelledby="comment-threads-title"
    >
      <div class="admin-comments-page__section-heading">
        <div>
          <p>THREAD SETTINGS</p>
          <h2 id="comment-threads-title">讨论开关</h2>
        </div>
        <span>可以关闭空讨论；已关闭的讨论仍然公开可读。</span>
      </div>
      <div v-if="threads.length" class="admin-comments-page__thread-list">
        <article v-for="thread in threads" :key="thread.resourceKey">
          <div>
            <a
              :href="thread.resourcePath"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ thread.resourceLabel }}
            </a>
            <span>{{ thread.commentCount }} 条公开评论</span>
          </div>
          <button
            type="button"
            :disabled="workingId === thread.resourceKey"
            @click="toggleThreadOverview(thread)"
          >
            {{ thread.isOpen ? '关闭讨论' : '重新开放' }}
          </button>
        </article>
      </div>
      <p v-else class="admin-comments-page__thread-empty">
        尚无可管理的评论讨论。
      </p>
    </section>

    <div v-if="isLoading" class="admin-comments-page__state" aria-live="polite">
      正在读取评论…
    </div>
    <UiGlassPanel
      v-else-if="!comments.length"
      class="admin-comments-page__state"
      tone="subtle"
    >
      暂时还没有评论。
    </UiGlassPanel>
    <div v-else class="admin-comments-page__list">
      <AdminCommentCard
        v-for="comment in comments"
        :key="comment.id"
        v-model:reply-body="replies[comment.id]"
        :comment="comment"
        :working-id="workingId"
        @ban="setBan"
        @visibility="setVisibility"
        @thread="toggleThread"
        @reply="reply"
        @discussion="openDiscussion"
      />
    </div>

    <nav
      v-if="pagination.totalPages > 1"
      class="admin-comments-page__pagination"
      aria-label="评论分页"
    >
      <UiButton
        variant="secondary"
        size="small"
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        上一页
      </UiButton>
      <span>{{ pagination.page }} / {{ pagination.totalPages }}</span>
      <UiButton
        variant="secondary"
        size="small"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.page + 1)"
      >
        下一页
      </UiButton>
    </nav>
    <UiSheet
      v-model:open="discussionOpen"
      title="完整讨论"
      description="查看原评论及全部一层回复，在后台继续处理讨论。"
      content-class="admin-shell admin-discussion-sheet"
      @close-auto-focus="restoreDiscussionFocus"
    >
      <div class="admin-discussion">
        <p v-if="discussionLoading" role="status">正在读取完整讨论…</p>
        <p v-else-if="discussionError" role="alert">
          {{ discussionError }}
          <button type="button" @click="loadDiscussion">重试加载讨论</button>
        </p>
        <template v-else-if="discussion">
          <p class="admin-discussion__label">
            原评论 · {{ discussion.root.resourceLabel }}
          </p>
          <AdminCommentCard
            v-model:reply-body="replies[discussion.root.id]"
            :comment="discussion.root"
            :working-id="workingId"
            in-discussion
            @ban="setBan"
            @visibility="setVisibility"
            @thread="toggleThread"
            @reply="reply"
          />
          <p class="admin-discussion__label">
            {{ discussion.replies.length }} 条回复
          </p>
          <AdminCommentCard
            v-for="item in discussion.replies"
            :key="item.id"
            v-model:reply-body="replies[item.id]"
            :comment="item"
            :working-id="workingId"
            in-discussion
            @ban="setBan"
            @visibility="setVisibility"
            @thread="toggleThread"
            @reply="reply"
          />
        </template>
        <p v-if="readError" role="alert">
          {{ readError }}
          <button type="button" @click="acknowledge([])">
            重试保存已读状态
          </button>
        </p>
      </div>
    </UiSheet>
  </div>
</template>

<style scoped>
.admin-comments-page {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6);
}

.admin-discussion {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}
.admin-discussion__label {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}
:global(.admin-discussion-sheet.sheet__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: min(46rem, 100vw);
  background: var(--color-canvas);
  color: var(--color-text);
  border-radius: 0;
  padding: clamp(1rem, 3vw, 2rem);
}
:global(.admin-discussion-sheet .overlay__header) {
  flex-shrink: 0;
}
:global(.admin-discussion-sheet .overlay__body) {
  min-height: 0;
  overflow-y: auto;
}
:global(.admin-discussion-sheet .admin-comment-card) {
  padding: 1rem;
}

.admin-comments-page__summary,
.admin-comment-card__resource a,
.admin-comment-card__actions button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-comments-page__summary {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.admin-comments-page__notice,
.admin-comments-page__error {
  margin: 0;
  padding: 0.8rem 1rem;
  border-left: 2px solid var(--color-accent);
  background: var(--color-canvas-raised);
  color: var(--color-text-muted);
}

.admin-comments-page__error {
  border-left-color: #a34534;
  color: #a34534;
}

.admin-comments-page__list {
  display: grid;
  gap: var(--space-4);
}

.admin-comments-page__threads {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  background: var(--color-canvas-raised);
}

.admin-comments-page__section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
}

.admin-comments-page__section-heading p,
.admin-comments-page__section-heading h2 {
  margin: 0;
}

.admin-comments-page__section-heading p {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.1em;
}

.admin-comments-page__section-heading h2 {
  margin-top: 0.4rem;
  font-family: var(--font-display);
  font-size: var(--text-h3);
}

.admin-comments-page__section-heading > span,
.admin-comments-page__thread-list article > div > span,
.admin-comments-page__thread-empty {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-comments-page__thread-list {
  display: grid;
}

.admin-comments-page__thread-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.admin-comments-page__thread-list article > div {
  display: grid;
  gap: 0.25rem;
}

.admin-comments-page__thread-list a {
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: 600;
}

.admin-comments-page__thread-list button {
  min-height: 2.2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  padding: 0.4rem 0.7rem;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-caption);
}

.admin-comments-page__thread-list button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.admin-comments-page__thread-empty {
  margin: 0;
}

.admin-comments-page__state {
  display: grid;
  min-height: 10rem;
  place-items: center;
  color: var(--color-text-muted);
}

.admin-comments-page__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

@media (width <= 34rem) {
  .admin-comments-page__section-heading {
    align-items: start;
    flex-direction: column;
  }
}
</style>
