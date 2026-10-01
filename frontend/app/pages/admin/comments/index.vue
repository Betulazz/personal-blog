<script setup lang="ts">
import { ArrowUpRight, MessageCircle, Shield, ShieldOff } from 'lucide-vue-next'

import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminComment, AdminCommentThread } from '~/types/comments'

definePageMeta({ layout: 'admin' })

const api = useApiClient()
const session = useAdminSession()
const comments = ref<AdminComment[]>([])
const threads = ref<AdminCommentThread[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const replies = ref<Record<string, string>>({})
const isLoading = ref(false)
const workingId = ref<string | null>(null)
const errorMessage = ref('')
const notice = ref('')
let requestId = 0

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
    await session.withSession(() => api.replyAsAdministrator(comment.id, body))
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

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
      <UiGlassPanel
        v-for="comment in comments"
        :key="comment.id"
        class="admin-comment-card"
        padding="spacious"
      >
        <header class="admin-comment-card__header">
          <img
            v-if="comment.authorAvatarUrl"
            :src="comment.authorAvatarUrl"
            :alt="`${comment.authorName} 的头像`"
            referrerpolicy="no-referrer"
          />
          <span v-else class="admin-comment-card__avatar-fallback">
            {{ comment.isAdministrator ? '博' : '✳' }}
          </span>
          <div class="admin-comment-card__byline">
            <strong>{{ comment.authorName }}</strong>
            <span
              v-if="comment.isAdministrator"
              class="admin-comment-card__owner"
              >博主</span
            >
            <span v-else>{{
              comment.commenterIsBanned ? 'GitHub 用户 · 已封禁' : 'GitHub 用户'
            }}</span>
            <time :datetime="comment.createdAt">{{
              formatDate(comment.createdAt)
            }}</time>
          </div>
          <span class="admin-comment-card__state" :data-state="comment.state">
            {{
              comment.state === 'hidden'
                ? '已隐藏'
                : comment.state === 'deleted'
                  ? '已删除'
                  : '公开'
            }}
          </span>
        </header>

        <div class="admin-comment-card__resource">
          <a
            :href="comment.resourcePath"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ comment.resourceLabel }}
            <ArrowUpRight :size="14" aria-hidden="true" />
          </a>
          <span>
            {{ comment.resourceKey === 'about' ? '关于页面讨论' : '文章讨论' }}
            · {{ comment.threadIsOpen ? '开放中' : '已关闭' }}
          </span>
          <span v-if="comment.parentId">回复评论 #{{ comment.parentId }}</span>
        </div>

        <div
          v-if="comment.state === 'deleted'"
          class="admin-comment-card__deleted"
        >
          评论正文已删除，回复仍保留。
        </div>
        <div v-else class="admin-comment-card__body">
          <!-- The API returns HTML sanitized by the server Markdown allowlist. -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="comment.bodyHtml" v-html="comment.bodyHtml" />
        </div>

        <footer class="admin-comment-card__actions">
          <button
            v-if="!comment.isAdministrator && comment.githubUserId"
            type="button"
            :disabled="workingId === comment.id"
            @click="setBan(comment)"
          >
            <Shield :size="15" aria-hidden="true" />
            {{ comment.commenterIsBanned ? '解除封禁' : '封禁账号' }}
          </button>
          <button
            v-if="comment.state !== 'deleted'"
            type="button"
            :disabled="workingId === comment.id"
            @click="setVisibility(comment)"
          >
            <ShieldOff :size="15" aria-hidden="true" />
            {{ comment.state === 'hidden' ? '恢复显示' : '隐藏评论' }}
          </button>
          <button
            type="button"
            :disabled="workingId === comment.resourceKey"
            @click="toggleThread(comment)"
          >
            {{ comment.threadIsOpen ? '关闭这条讨论' : '重新开放讨论' }}
          </button>
        </footer>

        <form
          v-if="comment.state === 'visible' && comment.threadIsOpen"
          class="admin-comment-card__reply"
          @submit.prevent="reply(comment)"
        >
          <label :for="`admin-reply-${comment.id}`">以“博主”身份回复</label>
          <textarea
            :id="`admin-reply-${comment.id}`"
            v-model="replies[comment.id]"
            maxlength="3000"
            rows="3"
            placeholder="写下公开回复…支持 Markdown。"
          />
          <div>
            <span v-if="comment.replyCount"
              >已有 {{ comment.replyCount }} 条回复</span
            >
            <button
              type="submit"
              :disabled="
                !replies[comment.id]?.trim() || workingId === comment.id
              "
            >
              发布回复
            </button>
          </div>
        </form>
      </UiGlassPanel>
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
  </div>
</template>

<style scoped>
.admin-comments-page {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6);
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

.admin-comment-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-canvas-raised);
  box-shadow: none;
}

.admin-comment-card :deep(.glass-card__body) {
  display: grid;
  gap: var(--space-4);
}

.admin-comment-card__header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.admin-comment-card__header img,
.admin-comment-card__avatar-fallback {
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  border-radius: 50%;
  object-fit: cover;
}

.admin-comment-card__avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--badge-accent-bg);
  color: var(--color-accent-strong);
}

.admin-comment-card__byline {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  color: var(--color-text-muted);
  font-size: var(--text-caption);
}

.admin-comment-card__byline strong {
  color: var(--color-text);
  font-size: var(--text-small);
}

.admin-comment-card__byline time {
  color: var(--color-text-subtle);
}

.admin-comment-card__owner,
.admin-comment-card__state {
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-round);
  background: var(--badge-accent-bg);
  color: var(--color-accent-strong);
}

.admin-comment-card__state {
  margin-left: auto;
  font-size: var(--text-caption);
}

.admin-comment-card__state[data-state='hidden'],
.admin-comment-card__state[data-state='deleted'] {
  background: var(--glass-bg-hover);
  color: var(--color-text-subtle);
}

.admin-comment-card__resource {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-comment-card__resource a {
  color: var(--color-accent-soft);
}

.admin-comment-card__body,
.admin-comment-card__deleted {
  color: var(--color-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.admin-comment-card__body :deep(p) {
  margin: 0.45rem 0;
}

.admin-comment-card__body :deep(a) {
  color: var(--color-accent-soft);
  text-decoration: underline;
}

.admin-comment-card__deleted {
  font-style: italic;
}

.admin-comment-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.admin-comment-card__actions button,
.admin-comment-card__reply button {
  min-height: 2.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  padding: 0.4rem 0.7rem;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-caption);
}

.admin-comment-card__actions button:disabled,
.admin-comment-card__reply button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.admin-comment-card__reply {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.admin-comment-card__reply label {
  color: var(--color-text-muted);
  font-size: var(--text-small);
  font-weight: 600;
}

.admin-comment-card__reply textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  padding: 0.75rem;
  background: var(--color-canvas);
  color: var(--color-text);
  font: inherit;
  line-height: 1.6;
}

.admin-comment-card__reply > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-comment-card__reply button {
  border-color: var(--color-text);
  background: var(--color-text);
  color: var(--color-canvas);
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

  .admin-comment-card__header {
    align-items: start;
  }

  .admin-comment-card__state {
    margin-left: auto;
  }
}
</style>
