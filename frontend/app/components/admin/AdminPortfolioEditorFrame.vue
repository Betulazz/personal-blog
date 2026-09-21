<script setup lang="ts">
defineProps<{
  busy: boolean
  editing: boolean
  error: string
  label: string
  loadFailed: boolean
  loading: boolean
  notice: string
  record: {
    isActive?: boolean
    name: string
    status?: string
  } | null
  resource: string
}>()

const emit = defineEmits<{
  delete: []
  reload: []
}>()

const deleteOpen = ref(false)
const statusLabels: Record<string, string> = {
  active: '进行中',
  archived: '已归档',
  developing: '开发中',
}

const confirmDelete = () => {
  deleteOpen.value = false
  emit('delete')
}
</script>

<template>
  <div class="admin-portfolio-editor-page">
    <header class="admin-editor-heading">
      <div>
        <NuxtLink class="admin-editor-heading__back" :to="`/admin/${resource}`">
          ← 返回{{ label }}管理
        </NuxtLink>
        <p class="admin-editor-heading__eyebrow">
          {{ editing ? 'Continue configuration' : 'New configuration' }}
        </p>
        <h1>{{ editing ? record?.name || `编辑${label}` : `新建${label}` }}</h1>
        <p>
          {{
            editing
              ? `保存${label}信息，公开站点会读取最新配置。`
              : `先保存${label}，再从公开站点预览它的呈现。`
          }}
        </p>
      </div>
      <div v-if="editing && record" class="admin-editor-heading__actions">
        <UiBadge
          v-if="record.status"
          :tone="record.status === 'active' ? 'success' : 'neutral'"
        >
          {{ statusLabels[record.status] || record.status }}
        </UiBadge>
        <UiBadge v-else :tone="record.isActive ? 'success' : 'neutral'">
          {{ record.isActive ? '公开展示' : '已隐藏' }}
        </UiBadge>
        <UiButton
          variant="danger"
          size="small"
          :disabled="busy"
          :aria-label="`删除${label}`"
          @click="deleteOpen = true"
        >
          删除{{ label }}
        </UiButton>
      </div>
    </header>

    <section
      v-if="loading"
      class="admin-portfolio-state"
      role="status"
      aria-busy="true"
    >
      正在读取{{ label }}…
    </section>
    <section v-else-if="loadFailed" class="admin-portfolio-state" role="alert">
      <strong>{{ label }}编辑器暂时无法加载</strong>
      <p>{{ error }}</p>
      <div class="admin-portfolio-state__actions">
        <UiButton variant="secondary" @click="emit('reload')"
          >重新加载</UiButton
        >
        <NuxtLink :to="`/admin/${resource}`">返回{{ label }}管理</NuxtLink>
      </div>
    </section>
    <template v-else>
      <p v-if="error" class="admin-portfolio-error" role="alert">{{ error }}</p>
      <p v-if="notice" class="admin-portfolio-notice" role="status">
        {{ notice }}
      </p>
      <slot />
    </template>

    <UiDialog
      v-model:open="deleteOpen"
      :title="`确认删除这个${label}？`"
      :description="`删除后无法恢复，公开站点将不再展示这条${label}。`"
    >
      <template #footer>
        <UiButton variant="ghost" @click="deleteOpen = false">取消</UiButton>
        <UiButton variant="danger" :loading="busy" @click="confirmDelete">
          确认删除
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.admin-portfolio-editor-page {
  display: grid;
  gap: var(--space-5);
  padding-block: var(--space-6) var(--space-16);
  min-width: 0;
}

.admin-editor-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-5);
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

.admin-editor-heading__actions,
.admin-portfolio-state__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
}

.admin-portfolio-error,
.admin-portfolio-notice {
  margin: 0;
  padding: var(--space-4);
  border-radius: var(--radius-medium);
}

.admin-portfolio-error {
  border: var(--border-hairline) solid var(--color-danger-border);
  background: var(--color-danger-surface);
  color: var(--color-danger);
}

.admin-portfolio-notice {
  border: var(--border-hairline) solid var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.admin-portfolio-state {
  display: grid;
  min-height: 18rem;
  place-content: center;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  text-align: center;
}

.admin-portfolio-state strong,
.admin-portfolio-state p {
  margin: 0;
}

.admin-portfolio-state strong {
  color: var(--color-text);
}

.admin-portfolio-state__actions a {
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
    justify-content: flex-start;
  }
}
</style>
