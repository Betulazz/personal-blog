<script setup lang="ts">
import { useApiClient } from '~/api/client'
import { adminNoteError } from '~/composables/useAdminNoteEditor'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminChatter, AdminNoteQuery } from '~/types/admin-notes'

const props = defineProps<{ resource: 'chatter'; label: string }>()
const api = useApiClient()
const resourceApi = api.adminChatter
const session = useAdminSession()
const route = useRoute()
const entries = ref<AdminChatter[]>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0, totalPages: 0 })
const loading = ref(true)
const error = ref('')
const search = ref('')
const status = ref('all')
let requestNumber = 0
let loadController: AbortController | null = null
const query = (): AdminNoteQuery => ({
  page: /^\d+$/.test(String(route.query.page))
    ? Math.max(1, Number(route.query.page))
    : 1,
  q:
    typeof route.query.q === 'string'
      ? route.query.q.slice(0, 80) || undefined
      : undefined,
  status:
    route.query.status === 'draft' || route.query.status === 'published'
      ? route.query.status
      : undefined,
})
const load = async () => {
  const current = ++requestNumber
  loadController?.abort()
  loadController = new AbortController()
  loading.value = true
  error.value = ''
  try {
    const result = await session.withSession(
      async () => await resourceApi.list(query(), loadController!.signal),
    )
    if (current !== requestNumber) return
    entries.value = result.data
    pagination.value = result.pagination
  } catch (failure) {
    if (current === requestNumber && !isAbortError(failure)) {
      error.value = adminNoteError(failure)
    }
  } finally {
    if (current === requestNumber) loading.value = false
  }
}
const applyFilters = () =>
  navigateTo({
    path: `/admin/${props.resource}`,
    query: {
      ...(search.value.trim() ? { q: search.value.trim() } : {}),
      ...(status.value !== 'all' ? { status: status.value } : {}),
    },
  })
const pageHref = (page: number) => ({
  path: `/admin/${props.resource}`,
  query: { ...route.query, page: String(page) },
})
const sync = () => {
  search.value = query().q ?? ''
  status.value = query().status ?? 'all'
  void load()
}
onMounted(sync)
watch(() => route.fullPath, sync)
onBeforeUnmount(() => {
  requestNumber++
  loadController?.abort()
})
useHead({ title: `${props.label} 管理 · 后台空间` })

function isAbortError(error: unknown) {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError')
  )
}
</script>

<template>
  <div class="admin-note-list-page">
    <header class="admin-note-list-heading">
      <div>
        <p class="admin-note-list-eyebrow">SHORT NOTES / EDITORIAL</p>
        <h1>{{ label }} 管理</h1>
        <p>
          {{ '搜索想法与片段，继续整理简短而完整的表达。' }}
        </p>
      </div>
      <NuxtLink :to="`/admin/${resource}/new`" class="admin-note-list-link"
        >新建 {{ label }}</NuxtLink
      >
    </header>
    <UiGlassPanel padding="compact"
      ><form
        class="admin-note-list-filters"
        role="search"
        @submit.prevent="applyFilters"
      >
        <UiInput
          v-if="resource === 'chatter'"
          v-model="search"
          label="搜索 Chatter"
          type="search"
          maxlength="80"
          placeholder="标题或正文"
        /><UiSelect
          v-model="status"
          label="状态"
          :options="[
            { label: '全部状态', value: 'all' },
            { label: '草稿', value: 'draft' },
            { label: '已发布', value: 'published' },
          ]"
        /><UiButton type="submit">应用筛选</UiButton>
      </form></UiGlassPanel
    >
    <p v-if="loading" role="status" aria-busy="true">正在读取 {{ label }}…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <UiButton variant="secondary" @click="load">重新加载</UiButton>
    </div>
    <UiGlassPanel v-else-if="!entries.length" class="admin-note-empty"
      ><span>NO ENTRIES / 00</span>
      <h2>这里还没有记录</h2>
      <p>没有符合筛选条件的 {{ label }}。可以调整筛选，或写下新的片段。</p>
      <NuxtLink :to="`/admin/${resource}/new`"
        >写下第一条 {{ label }} ↗</NuxtLink
      ></UiGlassPanel
    >
    <section v-else :aria-label="`${label} 列表`">
      <p>共 {{ pagination.total }} 条 · 按最近更新排序</p>
      <ol class="admin-note-list">
        <li v-for="entry in entries" :key="entry.id">
          <NuxtLink :to="`/admin/${resource}/${entry.id}/edit`"
            ><div>
              <time :datetime="entry.created_at">{{
                new Date(entry.created_at).toLocaleString('zh-CN')
              }}</time>
              <h2>
                {{ entry.title || entry.body }}
              </h2>
              <p v-if="'title' in entry">{{ entry.body }}</p>
              <p>
                {{
                  ['location' in entry ? entry.location : null, entry.mood]
                    .filter(Boolean)
                    .join(' · ')
                }}
              </p>
            </div>
            <UiBadge
              :tone="entry.status === 'published' ? 'success' : 'neutral'"
              >{{ entry.status === 'published' ? '已发布' : '草稿' }}</UiBadge
            ></NuxtLink
          >
        </li>
      </ol>
    </section>
    <nav
      v-if="!loading && !error && pagination.totalPages > 1"
      class="admin-note-pagination"
      :aria-label="`${label} 分页`"
    >
      <NuxtLink v-if="pagination.page > 1" :to="pageHref(pagination.page - 1)"
        >上一页</NuxtLink
      ><span>第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span
      ><NuxtLink
        v-if="pagination.page < pagination.totalPages"
        :to="pageHref(pagination.page + 1)"
        >下一页</NuxtLink
      >
    </nav>
    <NuxtLink
      v-if="!loading && !error && !entries.length && query().page > 1"
      :to="pageHref(1)"
      >返回第一页</NuxtLink
    >
  </div>
</template>

<style scoped>
.admin-note-list-page {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6);
  min-width: 0;
}
.admin-note-list-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding-bottom: clamp(1.5rem, 3vw, 2.5rem);
  border-bottom: 1px solid var(--color-border);
}
.admin-note-list-eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.09em;
}
.admin-note-list-heading h1 {
  font-family: var(--font-display);
  font-size: clamp(2.65rem, 4vw, 4.5rem);
  font-weight: 600;
  letter-spacing: -0.055em;
  line-height: 1.17;
  margin: 0;
}
.admin-note-list-heading p:last-child {
  margin: var(--space-3) 0 0;
}
p,
time {
  color: var(--color-text-muted);
}
.admin-note-list-link,
.admin-note-pagination a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-small);
  background: var(--color-text);
  color: var(--color-canvas-raised);
  font-weight: 600;
}
.admin-note-list-link:hover,
.admin-note-pagination a:hover {
  background: #3d453c;
}
.admin-note-list-filters {
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.admin-note-list-filters > .field {
  flex: 1 1 12rem;
}
.admin-note-list {
  display: grid;
  padding: 0;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-canvas-raised);
}
.admin-note-list li {
  min-width: 0;
}
.admin-note-list li + li {
  border-top: 1px solid var(--color-border);
}
.admin-note-list li a {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
}
.admin-note-list li a:hover {
  background: var(--glass-bg-hover);
}
.admin-note-list li a > div {
  min-width: 0;
}
.admin-note-list h2,
.admin-note-list p {
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.admin-note-list h2 {
  margin: var(--space-2) 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 1.8vw, 1.7rem);
  font-weight: 600;
  line-height: 1.35;
}
.admin-note-list time {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}
.admin-note-empty {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: clamp(2rem, 5vw, 4rem);
}
.admin-note-empty span {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}
.admin-note-empty h2,
.admin-note-empty p {
  margin: 0;
}
.admin-note-empty h2 {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2.4vw, 2.25rem);
  font-weight: 600;
}
.admin-note-empty a {
  margin-top: var(--space-2);
  border-bottom: 1px solid currentcolor;
  font-weight: 600;
}
.admin-note-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}
@media (width <= 30rem) {
  .admin-note-list li a {
    flex-direction: column;
    padding: var(--space-4);
  }
}
</style>
