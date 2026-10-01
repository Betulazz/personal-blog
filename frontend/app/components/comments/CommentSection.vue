<script setup lang="ts">
import {
  Github,
  Heart,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
} from 'lucide-vue-next'

import { BlogApiError, useApiClient } from '~/api/client'
import type {
  BlogComment,
  CommenterProfile,
  PublicCommentThread,
} from '~/types/comments'

const props = defineProps<{
  postId?: string
  resourceType: 'about' | 'post'
}>()

const api = useApiClient()
const route = useRoute()
const router = useRouter()
const profile = ref<CommenterProfile | null>(null)
const thread = ref<PublicCommentThread | null>(null)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isSubmitting = ref(false)
const isPreviewing = ref(false)
const isAuthenticated = ref(false)
const isLoginEnabled = ref(false)
const errorMessage = ref('')
const notice = ref('')
const body = ref('')
const isRestoringDraft = ref(true)
const previewHtml = ref('')
const showPreview = ref(false)
const replyingTo = ref<BlogComment | null>(null)
const editing = ref<BlogComment | null>(null)
let previewRevision = 0

const returnPath = computed(() => route.path)
const draftKey = computed(() =>
  props.resourceType === 'about'
    ? 'comment-draft:about'
    : `comment-draft:post:${props.postId}`,
)
const canParticipate = computed(() =>
  Boolean(profile.value && !profile.value.isBanned && isLoginEnabled.value),
)

const readThread = async (cursor?: string) =>
  props.resourceType === 'about'
    ? api.getAboutComments(cursor)
    : api.getPostComments(props.postId ?? '', cursor)

const load = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [session, result] = await Promise.all([
      api.getCommenterSession(),
      readThread(),
    ])
    profile.value = session.commenter
    isAuthenticated.value = Boolean(session.commenter)
    isLoginEnabled.value = session.githubLoginEnabled
    thread.value = result
  } catch {
    errorMessage.value = '评论暂时无法加载，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (!thread.value?.hasMore || !thread.value.nextCursor || isLoadingMore.value)
    return
  isLoadingMore.value = true
  errorMessage.value = ''
  try {
    const next = await readThread(thread.value.nextCursor)
    const commentsById = new Map<string, BlogComment>()
    for (const comment of [...thread.value.comments, ...next.comments]) {
      commentsById.set(comment.id, comment)
    }
    thread.value = {
      ...next,
      comments: [...commentsById.values()].sort((left, right) =>
        left.id.localeCompare(right.id, undefined, { numeric: true }),
      ),
    }
  } catch {
    errorMessage.value = '更多评论暂时无法加载，请重试。'
  } finally {
    isLoadingMore.value = false
  }
}

const currentDraft = () => {
  if (!import.meta.client) return
  if (isRestoringDraft.value) return
  try {
    localStorage.setItem(
      draftKey.value,
      JSON.stringify({
        body: body.value,
        editingId: editing.value?.id ?? null,
        parentId: replyingTo.value?.id ?? null,
      }),
    )
  } catch {
    // Keep the editor usable when browser storage is disabled.
  }
}

watch([body, replyingTo, editing], currentDraft)

const beginLogin = () => {
  currentDraft()
  window.location.assign(api.commenterLoginUrl(returnPath.value))
}

const resetComposer = () => {
  body.value = ''
  previewHtml.value = ''
  showPreview.value = false
  replyingTo.value = null
  editing.value = null
  currentDraft()
}

const startReply = (comment: BlogComment) => {
  editing.value = null
  replyingTo.value = comment
  body.value = ''
  showPreview.value = false
  nextTick(() =>
    document.querySelector<HTMLTextAreaElement>('#comment-composer')?.focus(),
  )
}

const startEdit = (comment: BlogComment) => {
  replyingTo.value = null
  editing.value = comment
  body.value = comment.bodyMarkdown ?? ''
  showPreview.value = false
  nextTick(() =>
    document.querySelector<HTMLTextAreaElement>('#comment-composer')?.focus(),
  )
}

const togglePreview = async () => {
  showPreview.value = !showPreview.value
  if (!showPreview.value) return
  const revision = ++previewRevision
  isPreviewing.value = true
  try {
    previewHtml.value = await api.previewComment(body.value)
  } catch (error: unknown) {
    if (revision === previewRevision) {
      previewHtml.value = ''
      errorMessage.value = errorText(error)
    }
  } finally {
    if (revision === previewRevision) isPreviewing.value = false
  }
}

const submit = async () => {
  if (!canParticipate.value || !body.value.trim() || isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const saved = editing.value
      ? await api.editComment(editing.value.id, body.value)
      : props.resourceType === 'about'
        ? await api.createAboutComment(body.value, replyingTo.value?.id)
        : await api.createPostComment(
            props.postId ?? '',
            body.value,
            replyingTo.value?.id,
          )

    if (editing.value) {
      replaceComment(thread.value?.comments ?? [], saved)
      notice.value = '评论已更新。'
    } else if (replyingTo.value) {
      const parent = findComment(
        thread.value?.comments ?? [],
        replyingTo.value.id,
      )
      if (parent) parent.replies.push(saved)
      if (thread.value) thread.value.commentCount += 1
      notice.value = '回复已发布。'
    } else if (thread.value) {
      thread.value.comments.push(saved)
      thread.value.comments.sort((left, right) =>
        left.id.localeCompare(right.id, undefined, { numeric: true }),
      )
      thread.value.commentCount += 1
      notice.value = '评论已发布。'
    }
    resetComposer()
  } catch (error: unknown) {
    showCommentError(error)
  } finally {
    isSubmitting.value = false
  }
}

const removeOwnComment = async (comment: BlogComment) => {
  if (!window.confirm('删除这条评论？有回复的评论会保留“已删除”提示。')) return
  errorMessage.value = ''
  try {
    await api.deleteComment(comment.id)
    await load()
    notice.value = '评论已删除。'
  } catch (error: unknown) {
    showCommentError(error)
  }
}

const toggleLike = async (comment: BlogComment) => {
  if (!isAuthenticated.value) {
    beginLogin()
    return
  }
  if (profile.value?.isBanned) {
    errorMessage.value = '此 GitHub 账号目前不能参与评论。'
    return
  }
  try {
    const liked = await api.toggleCommentLike(comment.id)
    comment.likeCount = Math.max(0, comment.likeCount + (liked ? 1 : -1))
    comment.likedByMe = liked
  } catch (error: unknown) {
    showCommentError(error)
  }
}

const signOut = async () => {
  try {
    await api.logoutCommenter()
    profile.value = null
    isAuthenticated.value = false
    await load()
    notice.value = '已退出 GitHub 评论登录。'
  } catch (error: unknown) {
    showCommentError(error)
  }
}

const findComment = (
  items: BlogComment[],
  id: string,
): BlogComment | undefined => {
  for (const item of items) {
    if (item.id === id) return item
    const reply = findComment(item.replies, id)
    if (reply) return reply
  }
  return undefined
}

const replaceComment = (items: BlogComment[], replacement: BlogComment) => {
  const existing = findComment(items, replacement.id)
  if (existing) Object.assign(existing, replacement)
}

const errorText = (error: unknown) => {
  if (!(error instanceof BlogApiError))
    return '操作失败，草稿仍保留在编辑器中。'
  const messages: Record<string, string> = {
    commenter_authentication_required:
      '登录状态已失效，请重新使用 GitHub 登录。',
    commenter_banned: '此 GitHub 账号目前不能参与评论。',
    comment_body_too_long: '评论最多 3000 个字符。',
    comment_link_unsafe: '评论中包含不支持的链接。',
    comment_media_unsupported: '评论暂不支持图片或嵌入媒体。',
    comment_rate_limited: '操作太频繁，请稍后再试。',
    comment_thread_closed: '这条讨论已关闭，暂时不能继续参与。',
    csrf_invalid: '安全校验已过期，请重试；草稿仍保留。',
    github_login_unavailable: 'GitHub 评论服务暂不可用。',
  }
  return messages[error.code] ?? '操作失败，草稿仍保留在编辑器中。'
}

const showCommentError = (error: unknown) => {
  if (
    error instanceof BlogApiError &&
    error.code === 'commenter_authentication_required'
  ) {
    profile.value = null
    isAuthenticated.value = false
  } else if (
    error instanceof BlogApiError &&
    error.code === 'commenter_banned'
  ) {
    if (profile.value) profile.value.isBanned = true
  } else if (
    error instanceof BlogApiError &&
    error.code === 'github_login_unavailable'
  ) {
    isLoginEnabled.value = false
  }
  errorMessage.value = errorText(error)
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const handleAuthOutcome = async () => {
  const outcome = route.query.comment_auth
  if (outcome === 'success') {
    notice.value = 'GitHub 登录成功，草稿已恢复。'
    const session = await api.getCommenterSession().catch(() => null)
    profile.value = session?.commenter ?? null
    isAuthenticated.value = Boolean(profile.value)
    isLoginEnabled.value = session?.githubLoginEnabled ?? false
  } else if (outcome === 'cancelled') {
    notice.value = '已取消 GitHub 登录，草稿仍保留。'
  } else if (outcome === 'failed' || outcome === 'state_error') {
    notice.value = 'GitHub 登录未完成，草稿仍保留。'
  }
  if (outcome) {
    const query = { ...route.query }
    delete query.comment_auth
    await router.replace({ path: route.path, query, hash: route.hash })
  }
}

const restoreDraftAndLoad = async () => {
  isRestoringDraft.value = true
  try {
    const saved = localStorage.getItem(draftKey.value)
    if (!saved) {
      body.value = ''
      replyingTo.value = null
      editing.value = null
    } else {
      try {
        const parsed: unknown = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null && 'body' in parsed) {
          const draft = parsed as {
            body?: unknown
            editingId?: unknown
            parentId?: unknown
          }
          body.value = typeof draft.body === 'string' ? draft.body : ''
          const editId =
            typeof draft.editingId === 'string' ? draft.editingId : null
          const parentId =
            typeof draft.parentId === 'string' ? draft.parentId : null
          editing.value = null
          replyingTo.value = null
          if (editId) {
            const comment = findComment(thread.value?.comments ?? [], editId)
            if (comment?.canEdit) editing.value = comment
          } else if (parentId) {
            replyingTo.value =
              findComment(thread.value?.comments ?? [], parentId) ?? null
          }
        } else {
          body.value = saved
          replyingTo.value = null
          editing.value = null
        }
      } catch {
        body.value = saved
        replyingTo.value = null
        editing.value = null
      }
    }
  } catch {
    body.value = ''
    replyingTo.value = null
    editing.value = null
  }
  await load()
  try {
    const saved = localStorage.getItem(draftKey.value)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (typeof parsed === 'object' && parsed !== null) {
        const draft = parsed as { editingId?: unknown; parentId?: unknown }
        if (typeof draft.editingId === 'string') {
          const comment = findComment(
            thread.value?.comments ?? [],
            draft.editingId,
          )
          editing.value = comment?.canEdit ? comment : null
        } else if (typeof draft.parentId === 'string') {
          replyingTo.value =
            findComment(thread.value?.comments ?? [], draft.parentId) ?? null
        }
      }
    }
  } catch {
    // A damaged draft still leaves its text available in the composer.
  }
  isRestoringDraft.value = false
  currentDraft()
  await handleAuthOutcome()
}

onMounted(() => {
  void restoreDraftAndLoad()
})

watch(draftKey, () => {
  if (import.meta.client) void restoreDraftAndLoad()
})
</script>

<template>
  <section class="comment-section" aria-labelledby="comment-section-title">
    <header class="comment-section__heading">
      <div>
        <p class="comment-section__eyebrow">A CONVERSATION, KEPT HERE</p>
        <h2 id="comment-section-title">留下评论</h2>
      </div>
      <span class="comment-section__count">
        <MessageCircle :size="16" aria-hidden="true" />
        {{ thread?.commentCount ?? 0 }} 条
      </span>
    </header>

    <p v-if="notice" class="comment-section__notice" role="status">
      {{ notice }}
    </p>
    <p v-if="errorMessage" class="comment-section__error" role="alert">
      {{ errorMessage }}
    </p>
    <button
      v-if="!isLoading && !thread"
      class="comment-section__load-more"
      type="button"
      @click="load"
    >
      重试加载评论
    </button>

    <div v-if="isLoading" class="comment-section__loading" aria-live="polite">
      正在读取评论…
    </div>
    <template v-else>
      <div v-if="thread && !thread.isOpen" class="comment-section__closed">
        这条讨论已关闭。你仍然可以阅读已有评论。
      </div>

      <form
        v-if="thread?.isOpen"
        class="comment-composer"
        @submit.prevent="submit"
      >
        <div class="comment-composer__identity">
          <img
            v-if="profile?.avatarUrl"
            :src="profile.avatarUrl"
            :alt="`${profile.login} 的头像`"
            referrerpolicy="no-referrer"
          />
          <span v-else class="comment-composer__avatar" aria-hidden="true"
            >✳</span
          >
          <div>
            <template v-if="profile">
              <strong>{{ profile.login }}</strong>
              <button
                class="comment-composer__text-button"
                type="button"
                @click="signOut"
              >
                退出
              </button>
            </template>
            <template v-else>
              <strong>参与这段讨论</strong>
              <span>使用 GitHub 登录后即可发表评论</span>
            </template>
          </div>
          <a
            v-if="profile"
            class="comment-composer__profile"
            :href="profile.profileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看 GitHub
          </a>
        </div>

        <div v-if="replyingTo || editing" class="comment-composer__context">
          <span>{{
            editing ? '正在编辑自己的评论' : `回复 ${replyingTo?.author.name}`
          }}</span>
          <button type="button" @click="resetComposer">取消</button>
        </div>

        <label class="sr-only" for="comment-composer">评论内容</label>
        <textarea
          v-if="!showPreview"
          id="comment-composer"
          v-model="body"
          maxlength="3000"
          :disabled="!canParticipate"
          :placeholder="
            profile?.isBanned
              ? '此 GitHub 账号目前不能参与评论。'
              : profile && !isLoginEnabled
                ? 'GitHub 评论服务暂不可用。'
                : '写下你的想法…支持 Markdown、链接和代码。'
          "
          rows="6"
        />

        <div v-if="showPreview" class="comment-composer__preview">
          <p v-if="isPreviewing">正在生成预览…</p>
          <!-- The API returns HTML sanitized by the server Markdown allowlist. -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-else-if="previewHtml" v-html="previewHtml" />
          <p v-else>输入 Markdown 后会在这里显示预览。</p>
        </div>

        <footer class="comment-composer__footer">
          <span>{{ body.length }} / 3000</span>
          <div>
            <button
              class="comment-composer__preview-button"
              type="button"
              :disabled="!body.trim()"
              @click="togglePreview"
            >
              {{ showPreview ? '继续编辑' : '预览' }}
            </button>
            <button
              v-if="!isAuthenticated"
              class="comment-composer__login"
              type="button"
              :disabled="!isLoginEnabled"
              @click="beginLogin"
            >
              <Github :size="16" aria-hidden="true" />
              {{ isLoginEnabled ? '使用 GitHub 登录' : 'GitHub 登录暂未配置' }}
            </button>
            <button
              v-else
              class="comment-composer__submit"
              type="submit"
              :disabled="!canParticipate || !body.trim() || isSubmitting"
            >
              <Send :size="15" aria-hidden="true" />
              {{
                isSubmitting ? '正在发布…' : editing ? '保存修改' : '发布评论'
              }}
            </button>
          </div>
        </footer>
      </form>

      <div v-if="thread?.comments.length" class="comment-list">
        <article
          v-for="comment in thread.comments"
          :key="comment.id"
          class="comment-item"
        >
          <div class="comment-item__avatar">
            <img
              v-if="comment.author.avatarUrl"
              :src="comment.author.avatarUrl"
              :alt="`${comment.author.name} 的头像`"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
            <span v-else>{{
              comment.author.kind === 'administrator' ? '博' : '✳'
            }}</span>
          </div>
          <div class="comment-item__main">
            <header class="comment-item__meta">
              <a
                v-if="comment.author.profileUrl"
                :href="comment.author.profileUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ comment.author.name }}
              </a>
              <strong v-else>{{ comment.author.name }}</strong>
              <span
                v-if="comment.author.kind === 'administrator'"
                class="comment-item__owner"
              >
                博主
              </span>
              <time :datetime="comment.createdAt">{{
                formatDate(comment.createdAt)
              }}</time>
              <span v-if="comment.editedAt">已编辑</span>
            </header>

            <div
              v-if="comment.state === 'deleted'"
              class="comment-item__placeholder"
            >
              已删除
            </div>
            <div
              v-else-if="comment.state === 'hidden'"
              class="comment-item__placeholder"
            >
              此评论暂不可见
            </div>
            <div v-else class="comment-item__body">
              <!-- The API returns HTML sanitized by the server Markdown allowlist. -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-if="comment.bodyHtml" v-html="comment.bodyHtml" />
            </div>

            <footer class="comment-item__actions">
              <button
                v-if="comment.state === 'visible'"
                type="button"
                :aria-pressed="comment.likedByMe"
                :aria-label="comment.likedByMe ? '取消喜欢' : '喜欢评论'"
                :disabled="
                  !thread.isOpen || (!isAuthenticated && !isLoginEnabled)
                "
                @click="toggleLike(comment)"
              >
                <Heart
                  :size="15"
                  :fill="comment.likedByMe ? 'currentColor' : 'none'"
                />
                {{ comment.likeCount }}
              </button>
              <button
                v-if="thread.isOpen && comment.state === 'visible'"
                type="button"
                @click="startReply(comment)"
              >
                <MessageCircle :size="15" /> 回复
              </button>
              <button
                v-if="comment.canEdit"
                type="button"
                @click="startEdit(comment)"
              >
                <Pencil :size="14" /> 编辑
              </button>
              <button
                v-if="comment.canEdit"
                type="button"
                @click="removeOwnComment(comment)"
              >
                <Trash2 :size="14" /> 删除
              </button>
            </footer>

            <div v-if="comment.replies.length" class="comment-replies">
              <article
                v-for="reply in comment.replies"
                :key="reply.id"
                class="comment-item comment-item--reply"
              >
                <div class="comment-item__avatar comment-item__avatar--small">
                  <img
                    v-if="reply.author.avatarUrl"
                    :src="reply.author.avatarUrl"
                    :alt="`${reply.author.name} 的头像`"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <span v-else>{{
                    reply.author.kind === 'administrator' ? '博' : '✳'
                  }}</span>
                </div>
                <div class="comment-item__main">
                  <header class="comment-item__meta">
                    <a
                      v-if="reply.author.profileUrl"
                      :href="reply.author.profileUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      >{{ reply.author.name }}</a
                    >
                    <strong v-else>{{ reply.author.name }}</strong>
                    <span
                      v-if="reply.author.kind === 'administrator'"
                      class="comment-item__owner"
                    >
                      博主
                    </span>
                    <time :datetime="reply.createdAt">{{
                      formatDate(reply.createdAt)
                    }}</time>
                    <span v-if="reply.editedAt">已编辑</span>
                  </header>
                  <div
                    v-if="reply.state === 'deleted'"
                    class="comment-item__placeholder"
                  >
                    已删除
                  </div>
                  <div
                    v-else-if="reply.state === 'hidden'"
                    class="comment-item__placeholder"
                  >
                    此评论暂不可见
                  </div>
                  <div v-else class="comment-item__body">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div v-if="reply.bodyHtml" v-html="reply.bodyHtml" />
                  </div>
                  <footer class="comment-item__actions">
                    <button
                      v-if="reply.state === 'visible'"
                      type="button"
                      :aria-pressed="reply.likedByMe"
                      :aria-label="reply.likedByMe ? '取消喜欢' : '喜欢评论'"
                      :disabled="
                        !thread.isOpen || (!isAuthenticated && !isLoginEnabled)
                      "
                      @click="toggleLike(reply)"
                    >
                      <Heart
                        :size="15"
                        :fill="reply.likedByMe ? 'currentColor' : 'none'"
                      />
                      {{ reply.likeCount }}
                    </button>
                    <button
                      v-if="reply.canEdit"
                      type="button"
                      @click="startEdit(reply)"
                    >
                      <Pencil :size="14" /> 编辑
                    </button>
                    <button
                      v-if="reply.canEdit"
                      type="button"
                      @click="removeOwnComment(reply)"
                    >
                      <Trash2 :size="14" /> 删除
                    </button>
                  </footer>
                </div>
              </article>
            </div>
          </div>
        </article>
      </div>
      <p v-else-if="thread" class="comment-section__empty">
        这里还没有评论。欢迎成为第一个留下想法的人。
      </p>

      <button
        v-if="thread?.hasMore"
        class="comment-section__load-more"
        type="button"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ isLoadingMore ? '正在读取…' : '加载更多评论' }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.comment-section {
  width: min(100% - 2rem, var(--container-reading));
  margin: clamp(3.5rem, 8vw, 6rem) auto 0;
  padding-top: clamp(2rem, 4vw, 3rem);
  border-top: 1px solid var(--color-border);
  color: var(--color-text);
}

.comment-section__heading,
.comment-composer__identity,
.comment-composer__footer,
.comment-composer__footer > div,
.comment-item__meta,
.comment-item__actions {
  display: flex;
  align-items: center;
}

.comment-section__heading {
  justify-content: space-between;
  gap: var(--space-4);
}

.comment-section__heading h2,
.comment-section__heading p {
  margin: 0;
}

.comment-section__heading h2 {
  margin-top: 0.5rem;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  letter-spacing: -0.04em;
}

.comment-section__eyebrow {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
}

.comment-section__count {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.comment-section__notice,
.comment-section__error,
.comment-section__closed,
.comment-section__loading {
  margin: var(--space-4) 0 0;
  padding: 0.8rem 1rem;
  border-left: 2px solid var(--color-accent);
  background: var(--color-canvas-raised);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.comment-section__error {
  border-left-color: #a34534;
  color: #a34534;
}

.comment-composer {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-6);
  padding: clamp(1rem, 3vw, 1.5rem);
  border: 1px solid var(--color-border);
  background: var(--color-canvas-raised);
}

.comment-composer__identity {
  gap: 0.75rem;
}

.comment-composer__identity img,
.comment-composer__avatar {
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  border-radius: 50%;
  object-fit: cover;
}

.comment-composer__avatar {
  display: grid;
  place-items: center;
  background: var(--badge-accent-bg);
  color: var(--color-accent-strong);
}

.comment-composer__identity > div {
  display: grid;
  gap: 0.2rem;
}

.comment-composer__identity strong {
  font-size: var(--text-small);
}

.comment-composer__identity span,
.comment-composer__profile,
.comment-composer__text-button {
  color: var(--color-text-muted);
  font-size: var(--text-caption);
}

.comment-composer__profile {
  margin-left: auto;
}

.comment-composer__text-button,
.comment-composer__context button {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-accent-soft);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.comment-composer__context {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0.75rem;
  background: var(--glass-bg-hover);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.comment-composer textarea {
  width: 100%;
  min-height: 8rem;
  resize: vertical;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  padding: 0.9rem 1rem;
  background: var(--color-canvas);
  color: var(--color-text);
  font: inherit;
  line-height: 1.65;
}

.comment-composer textarea:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.comment-composer textarea:disabled {
  color: var(--color-text-subtle);
}

.comment-composer__preview {
  min-height: 4rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}

.comment-composer__footer {
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.comment-composer__footer > div {
  flex-wrap: wrap;
  justify-content: end;
  gap: 0.5rem;
}

.comment-composer__preview-button,
.comment-composer__login,
.comment-composer__submit,
.comment-item__actions button,
.comment-section__load-more {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  padding: 0.45rem 0.8rem;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-small);
}

.comment-composer__login,
.comment-composer__submit {
  border-color: var(--color-text);
  background: var(--color-text);
  color: var(--color-canvas);
}

.comment-composer__login:disabled,
.comment-composer__submit:disabled,
.comment-item__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.comment-composer button:disabled,
.comment-section__load-more:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.comment-list {
  display: grid;
  margin-top: var(--space-7);
}

.comment-item {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  gap: 0.85rem;
  padding: var(--space-5) 0;
  border-bottom: 1px solid var(--color-border);
}

.comment-item__avatar {
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--badge-accent-bg);
  color: var(--color-accent-strong);
}

.comment-item__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-item__avatar span {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}

.comment-item__main {
  min-width: 0;
}

.comment-item__meta {
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: var(--text-small);
}

.comment-item__meta > a,
.comment-item__meta > strong {
  color: var(--color-text);
  font-weight: 650;
}

.comment-item__meta time,
.comment-item__meta > span:not(.comment-item__owner) {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.comment-item__owner {
  padding: 0.12rem 0.4rem;
  border-radius: var(--radius-round);
  background: var(--badge-accent-bg);
  color: var(--color-accent-strong);
  font-size: 0.68rem;
}

.comment-item__body,
.comment-item__placeholder {
  margin-top: 0.65rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.comment-item__body :deep(p) {
  margin: 0.4rem 0;
}

.comment-item__body :deep(p:first-child) {
  margin-top: 0;
}

.comment-item__body :deep(p:last-child) {
  margin-bottom: 0;
}

.comment-item__body :deep(a) {
  color: var(--color-accent-soft);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.comment-item__body :deep(code),
.comment-composer__preview :deep(code) {
  border-radius: 0.25rem;
  padding: 0.1rem 0.3rem;
  background: var(--glass-bg-hover);
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.comment-item__body :deep(pre) {
  overflow-x: auto;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  background: var(--color-canvas);
}

.comment-item__placeholder {
  color: var(--color-text-subtle);
  font-style: italic;
}

.comment-item__actions {
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.55rem;
}

.comment-item__actions button {
  min-height: 2rem;
  border-color: transparent;
  padding: 0.25rem 0.45rem;
  font-size: var(--text-caption);
}

.comment-item__actions button:hover,
.comment-item__actions button[aria-pressed='true'] {
  color: var(--color-accent-strong);
}

.comment-replies {
  margin-top: var(--space-3);
  border-left: 1px solid var(--color-border);
  padding-left: var(--space-4);
}

.comment-item--reply {
  grid-template-columns: 2rem minmax(0, 1fr);
  padding-block: var(--space-3);
  border-bottom: 0;
}

.comment-item__avatar--small {
  width: 1.8rem;
  height: 1.8rem;
}

.comment-section__empty {
  margin: var(--space-7) 0 0;
  padding: var(--space-6);
  border: 1px dashed var(--color-border);
  color: var(--color-text-subtle);
  text-align: center;
}

.comment-section__load-more {
  display: flex;
  min-width: 10rem;
  margin: var(--space-5) auto 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (width <= 34rem) {
  .comment-composer__footer {
    align-items: start;
    flex-direction: column;
  }

  .comment-composer__footer > div {
    width: 100%;
    justify-content: start;
  }

  .comment-item {
    grid-template-columns: 2rem minmax(0, 1fr);
    gap: 0.65rem;
  }

  .comment-item__avatar {
    width: 1.9rem;
    height: 1.9rem;
  }

  .comment-replies {
    padding-left: 0.65rem;
  }
}
</style>
