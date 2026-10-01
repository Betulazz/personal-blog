<script setup lang="ts">
import { ArrowUpRight, Shield, ShieldOff } from 'lucide-vue-next'
import type { AdminComment } from '~/types/comments'
withDefaults(
  defineProps<{
    comment: AdminComment
    workingId: string | null
    replyBody?: string
    inDiscussion?: boolean
  }>(),
  { replyBody: '', inDiscussion: false },
)
defineEmits<{
  'update:replyBody': [value: string]
  reply: [comment: AdminComment]
  ban: [comment: AdminComment]
  visibility: [comment: AdminComment]
  thread: [comment: AdminComment]
  discussion: [comment: AdminComment]
}>()
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
</script>
<template>
  <UiGlassPanel class="admin-comment-card" padding="spacious">
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
        <span v-if="comment.isAdministrator" class="admin-comment-card__owner"
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
      <a :href="comment.resourcePath" target="_blank" rel="noopener noreferrer">
        {{ comment.resourceLabel }}
        <ArrowUpRight :size="14" aria-hidden="true" />
      </a>
      <span>
        {{ comment.resourceKey === 'about' ? '关于页面讨论' : '文章讨论' }}
        · {{ comment.threadIsOpen ? '开放中' : '已关闭' }}
      </span>
    </div>

    <div v-if="comment.parentId" class="admin-comment-card__context">
      <strong
        >回复原评论 · @{{ comment.parent?.authorName ?? '原作者' }}</strong
      >
      <span v-if="comment.parent?.state === 'hidden'">原评论已隐藏</span>
      <p>
        {{
          comment.parent?.state === 'deleted'
            ? '原评论已删除'
            : (comment.parent?.bodyExcerpt ?? '原评论内容暂不可用')
        }}
      </p>
    </div>

    <div v-if="comment.state === 'deleted'" class="admin-comment-card__deleted">
      评论正文已删除，回复仍保留。
    </div>
    <div v-else class="admin-comment-card__body">
      <!-- The API returns HTML sanitized by the server Markdown allowlist. -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="comment.bodyHtml"
        class="comment-markdown"
        v-html="comment.bodyHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>

    <footer class="admin-comment-card__actions">
      <button
        v-if="!inDiscussion"
        type="button"
        @click="$emit('discussion', comment)"
      >
        查看完整讨论<span v-if="!comment.parentId && comment.replyCount">
          · {{ comment.replyCount }} 条回复</span
        >
      </button>
      <button
        v-if="!comment.isAdministrator && comment.githubUserId"
        type="button"
        :disabled="workingId !== null"
        @click="$emit('ban', comment)"
      >
        <Shield :size="15" aria-hidden="true" />
        {{ comment.commenterIsBanned ? '解除封禁' : '封禁账号' }}
      </button>
      <button
        v-if="comment.state !== 'deleted'"
        type="button"
        :disabled="workingId !== null"
        @click="$emit('visibility', comment)"
      >
        <ShieldOff :size="15" aria-hidden="true" />
        {{ comment.state === 'hidden' ? '恢复显示' : '隐藏评论' }}
      </button>
      <button
        type="button"
        :disabled="workingId !== null"
        @click="$emit('thread', comment)"
      >
        {{ comment.threadIsOpen ? '关闭这条讨论' : '重新开放讨论' }}
      </button>
    </footer>

    <form
      v-if="
        comment.state === 'visible' &&
        comment.threadIsOpen &&
        (!comment.parent || comment.parent.state === 'visible')
      "
      class="admin-comment-card__reply"
      @submit.prevent="$emit('reply', comment)"
    >
      <label
        :for="`${inDiscussion ? 'discussion' : 'list'}-reply-${comment.id}`"
        >以“博主”身份回复原评论 @{{
          comment.parent?.authorName ?? comment.authorName
        }}</label
      >
      <textarea
        :id="`${inDiscussion ? 'discussion' : 'list'}-reply-${comment.id}`"
        :value="replyBody"
        maxlength="3000"
        rows="3"
        placeholder="写下公开回复…支持 Markdown。"
        @input="
          $emit(
            'update:replyBody',
            ($event.target as HTMLTextAreaElement).value,
          )
        "
      />
      <div>
        <span v-if="comment.replyCount"
          >已有 {{ comment.replyCount }} 条回复</span
        >
        <button
          type="submit"
          :disabled="!replyBody?.trim() || workingId !== null"
        >
          发布回复
        </button>
      </div>
    </form>
  </UiGlassPanel>
</template>
<style scoped>
.admin-comment-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-canvas-raised);
  box-shadow: none;
}

.admin-comment-card__resource a,
.admin-comment-card__actions button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
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

.admin-comment-card {
  min-width: 0;
}
.admin-comment-card__context {
  padding: 0.85rem 1rem;
  margin-block: 0.75rem;
  border-left: 3px solid var(--color-accent);
  background: var(--color-canvas-raised);
  font-size: var(--text-small);
}
.admin-comment-card__context strong {
  display: block;
  color: var(--color-accent-strong);
}
.admin-comment-card__context p {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0.4rem 0 0;
  overflow-wrap: anywhere;
}
@media (width <= 48rem) {
  .admin-comment-card__header {
    flex-wrap: wrap;
  }
  .admin-comment-card__state {
    margin-left: auto;
  }
}
</style>
