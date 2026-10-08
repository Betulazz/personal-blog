<script setup lang="ts">
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApiClient } from '~/api/client'
import { usePostEditor } from '~/composables/usePostEditor'
import { useAdminSession } from '~/stores/adminSession'
import { renderPostMarkdown } from '~/utils/post-markdown'

const props = defineProps<{ postId?: string }>()
const session = useAdminSession()
const flow = usePostEditor({
  postId: () => props.postId,
  authenticated: () =>
    session.isAuthenticated || session.status === 'refreshing',
  api: useApiClient(),
  withSession: (request) => session.withSession(request),
  storage: () => (import.meta.client ? window.sessionStorage : null),
  navigate: async (path) => navigateTo(path, { replace: true }),
})
const {
  input,
  post,
  tags,
  isLoading,
  isSubmitting,
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
  unknown,
} = flow
const acknowledgeOpen = ref(false)
const acknowledge = () => {
  flow.acknowledgeUnknown()
  acknowledgeOpen.value = false
}
const previewHtml = computed(() => renderPostMarkdown(previewSource.value))
const actionCopy = computed(() => {
  if (pendingAction.value === 'delete')
    return {
      confirm: '删除文章',
      title: '确认删除这篇文章？',
      description:
        '这会永久删除文章、标签关联，以及该文章的评论讨论和全部回复与喜欢；删除后无法从后台恢复。',
    }
  if (pendingAction.value === 'publish')
    return {
      confirm: '确认发布',
      title: '确认发布这篇文章？',
      description: '发布后文章会出现在公开文章列表中。你仍可以随时撤回。',
    }
  return {
    confirm: '确认撤回',
    title: '确认撤回这篇文章？',
    description:
      '撤回后文章会回到草稿状态，公开页面将不再展示它；当前未保存的内容会保留。',
  }
})
onBeforeRouteLeave(() => flow.leave())
onBeforeRouteUpdate(() => flow.leave())
onMounted(() => window.addEventListener('beforeunload', flow.beforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', flow.beforeUnload)
  flow.dispose()
})
useHead(() => ({
  title: props.postId ? '编辑文章 · 后台空间' : '新建文章 · 后台空间',
}))
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
          :disabled="!canWrite"
          @click="flow.requestAction('publish')"
        >
          发布
        </UiButton>
        <UiButton
          v-else
          variant="secondary"
          size="small"
          :disabled="!canWrite"
          @click="flow.requestAction('unpublish')"
        >
          撤回
        </UiButton>
        <UiButton
          variant="danger"
          size="small"
          :disabled="!canWrite"
          @click="flow.requestAction('delete')"
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
        <UiButton variant="secondary" @click="flow.load">重新加载</UiButton>
        <NuxtLink class="admin-resource-state__link" to="/admin/posts"
          >返回文章管理</NuxtLink
        >
      </div>
    </div>
    <AdminPostForm
      v-else
      :key="postId ?? 'new'"
      :input="input"
      :locked="locked"
      :can-save="canWrite"
      :editor-ready="editorReady"
      :dirty="isDirty"
      :error-message="errorMessage"
      :is-loading="isLoading"
      :is-submitting="isSubmitting"
      :post="post"
      :tags="tags"
      @canonical="flow.canonical"
      @change="flow.edit"
      @preview="flow.preview"
      @save="flow.save"
    />

    <p v-if="notice" class="admin-resource-state" role="status">{{ notice }}</p>
    <section
      v-if="unknown && !isSubmitting"
      class="admin-resource-state"
      role="alert"
      data-testid="post-write-unknown"
    >
      <strong>上次操作结果尚未确认</strong>
      <p>
        请先核对服务器结果，避免重复操作；当前编辑内容仍保留。新建文章可去文章管理按
        slug 核对。
      </p>
      <div class="admin-resource-state__actions">
        <UiButton :loading="isSubmitting" @click="flow.reconcile"
          >核对服务器结果</UiButton
        >
        <UiButton
          variant="secondary"
          :disabled="isSubmitting"
          @click="acknowledgeOpen = true"
          >已核对，允许再次操作</UiButton
        >
      </div>
    </section>

    <UiDialog
      v-model:open="acknowledgeOpen"
      title="已核对上次操作？"
      description="确认你已查看文章管理或服务器内容。解除提醒不会重发上次请求，下一次操作将使用当前表单。"
    >
      <template #footer>
        <UiButton variant="ghost" @click="acknowledgeOpen = false"
          >取消</UiButton
        >
        <UiButton :disabled="isSubmitting" @click="acknowledge"
          >确认已核对</UiButton
        >
      </template>
    </UiDialog>
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
          @click="flow.confirmAction"
        >
          {{ actionCopy.confirm }}
        </UiButton>
      </template>
    </UiDialog>

    <UiDialog
      :open="recoveryOpen"
      title="发现未保存的草稿"
      description="上次离开编辑器时还有未保存的改动，已从本地备份中恢复出内容。选择恢复会覆盖当前表单，选择丢弃会删除备份。"
      @update:open="(open) => !open && flow.discardDraft()"
    >
      <template #footer>
        <UiButton variant="ghost" @click="flow.discardDraft">丢弃备份</UiButton>
        <UiButton variant="primary" @click="flow.restoreDraft"
          >恢复草稿</UiButton
        >
      </template>
    </UiDialog>

    <UiDialog
      :open="leaveDialogOpen"
      title="离开编辑器？"
      description="当前有未保存的内容或待核对的操作。保留备份后可在当前标签页恢复；丢弃会删除备份，继续编辑则留在这里。"
      @update:open="(open) => !open && flow.finishLeave('stay')"
    >
      <template #footer>
        <UiButton variant="secondary" @click="flow.finishLeave('stay')"
          >继续编辑</UiButton
        >
        <UiButton variant="primary" @click="flow.finishLeave('keep')"
          >保留备份并离开</UiButton
        >
        <UiButton variant="danger" @click="flow.finishLeave('discard')">
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
