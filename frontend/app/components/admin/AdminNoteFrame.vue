<script setup lang="ts">
import type { AdminNoteMetadata } from '~/types/admin-notes'

defineProps<{
  label: string
  resource: string
  editing: boolean
  record: AdminNoteMetadata | null
  loading: boolean
  loadFailed: boolean
  busy: boolean
  error: string
  notice: string
}>()
const emit = defineEmits<{
  reload: []
  action: [action: 'publish' | 'unpublish' | 'delete']
}>()
const pending = ref<'publish' | 'unpublish' | 'delete' | null>(null)
const actionLabel = computed(
  () =>
    ({ publish: '发布', unpublish: '撤回', delete: '删除' })[
      pending.value ?? 'publish'
    ],
)
const confirm = () => {
  if (pending.value) emit('action', pending.value)
  pending.value = null
}
</script>

<template>
  <div class="admin-note-page">
    <NuxtLink :to="`/admin/${resource}`">← 返回 {{ label }} 管理</NuxtLink>
    <header class="admin-note-heading">
      <div>
        <p class="admin-note-eyebrow">{{ label }} workspace</p>
        <h1>{{ editing ? '编辑' : '新建' }} {{ label }}</h1>
      </div>
      <UiBadge
        v-if="record"
        :tone="record.status === 'published' ? 'success' : 'neutral'"
        >{{ record.status === 'published' ? '已发布' : '草稿' }}</UiBadge
      >
    </header>
    <p v-if="loading" role="status" aria-busy="true">正在读取 {{ label }}…</p>
    <div v-if="error" role="alert" class="admin-note-error">{{ error }}</div>
    <UiButton
      v-if="loadFailed || error"
      variant="secondary"
      :disabled="busy || loading"
      @click="emit('reload')"
      >重新加载状态和标签</UiButton
    >
    <p v-if="notice" role="status">{{ notice }}</p>
    <slot v-if="!loading && !loadFailed" />
    <div v-if="record && !loading && !loadFailed" class="admin-note-actions">
      <UiButton
        :disabled="busy"
        variant="secondary"
        @click="
          pending = record.status === 'published' ? 'unpublish' : 'publish'
        "
        >{{ record.status === 'published' ? '撤回' : '发布' }}</UiButton
      >
      <UiButton :disabled="busy" variant="danger" @click="pending = 'delete'"
        >删除</UiButton
      >
      <p>发布与撤回仅操作已保存版本。未保存的编辑仍保留在表单中。</p>
    </div>
    <UiDialog
      :open="Boolean(pending)"
      :title="`确认${actionLabel} ${label}？`"
      :description="
        pending === 'delete'
          ? '这会永久删除内容及标签关联，无法恢复。'
          : pending === 'publish'
            ? '发布已保存的版本，使其在公开页面可见。请先保存需要公开的修改。'
            : '撤回后回到草稿状态，公开页面将不再展示。'
      "
      @update:open="(open) => !open && (pending = null)"
    >
      <template #footer
        ><UiButton variant="ghost" @click="pending = null">取消</UiButton
        ><UiButton
          :variant="pending === 'delete' ? 'danger' : 'primary'"
          @click="confirm"
          >确认{{ actionLabel }}</UiButton
        ></template
      >
    </UiDialog>
  </div>
</template>

<style>
.admin-note-page {
  display: grid;
  gap: var(--space-5);
  padding-block: var(--space-6);
  min-width: 0;
}
.admin-note-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding-bottom: clamp(1.5rem, 3vw, 2.5rem);
  border-bottom: 1px solid var(--color-border);
}
.admin-note-heading h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.65rem, 4vw, 4.5rem);
  font-weight: 600;
  letter-spacing: -0.055em;
  line-height: 1.17;
}
.admin-note-eyebrow {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.09em;
}
.admin-note-page .admin-note-form {
  width: min(100%, 58rem);
  margin-inline: auto;
}
.admin-note-form,
.admin-note-fields {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}
.admin-note-fields {
  border: 0;
  margin: 0;
  padding: 0;
}
.admin-note-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}
.admin-note-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.admin-note-actions p {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}
.admin-note-error {
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  color: var(--color-text);
}
.admin-note-tags {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: 0;
  border: 0;
}
.admin-note-tags legend {
  margin-bottom: var(--space-2);
}
.admin-note-tags label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.75rem;
}
.admin-note-image {
  display: grid;
  gap: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  padding: var(--space-4);
  min-width: 0;
}
@media (width <= 30rem) {
  .admin-note-pair {
    grid-template-columns: 1fr;
  }
}
</style>
