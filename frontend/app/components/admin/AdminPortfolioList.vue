<script setup lang="ts">
import { useApiClient } from '~/api/client'
import { adminPortfolioError } from '~/composables/useAdminPortfolioEditor'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminFriendLink, AdminProject } from '~/types/admin-portfolio'

const props = defineProps<{ resource: 'friends' | 'projects' }>()
const api = useApiClient()
const session = useAdminSession()
const route = useRoute()
const entries = ref<Array<AdminFriendLink | AdminProject>>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0, totalPages: 0 })
const loading = ref(false)
const error = ref('')
const search = ref('')
const filter = ref('all')
let requestNumber = 0
let loadController: AbortController | null = null

const isProjects = computed(() => props.resource === 'projects')
const copy = computed(() =>
  isProjects.value
    ? {
        description: '维护作品集内容、公开链接与首页精选排序。',
        label: '项目',
        title: '项目管理',
      }
    : {
        description: '维护人工整理的友链，并明确哪些链接公开展示。',
        label: '友链',
        title: '友链管理',
      },
)

const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isInteger(value) && value > 0 ? value : 1
})

const load = async () => {
  if (!session.isAuthenticated) return
  const currentRequest = ++requestNumber
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  error.value = ''
  try {
    if (isProjects.value) {
      const result = await session.withSession(() =>
        api.listAdminProjects(
          {
            page: page.value,
            pageSize: 10,
            q: search.value.trim() || undefined,
            status:
              filter.value !== 'all'
                ? (filter.value as 'active' | 'archived' | 'developing')
                : undefined,
          },
          controller.signal,
        ),
      )
      if (currentRequest !== requestNumber) return
      entries.value = result.data
      pagination.value = result.pagination
    } else {
      const result = await session.withSession(() =>
        api.listAdminFriends(
          {
            active: filter.value as 'active' | 'all' | 'inactive',
            page: page.value,
            pageSize: 10,
            q: search.value.trim() || undefined,
          },
          controller.signal,
        ),
      )
      if (currentRequest !== requestNumber) return
      entries.value = result.data
      pagination.value = result.pagination
    }
  } catch (failure) {
    if (currentRequest === requestNumber && !isAbortError(failure)) {
      error.value = adminPortfolioError(failure, copy.value.label)
    }
  } finally {
    if (currentRequest === requestNumber) loading.value = false
  }
}

const syncFromRoute = () => {
  search.value = typeof route.query.q === 'string' ? route.query.q : ''
  filter.value =
    typeof route.query.filter === 'string' ? route.query.filter : 'all'
  void load()
}

const applyFilters = () =>
  navigateTo({
    path: `/admin/${props.resource}`,
    query: {
      ...(search.value.trim() ? { q: search.value.trim() } : {}),
      ...(filter.value !== 'all' ? { filter: filter.value } : {}),
    },
  })

const pageHref = (nextPage: number) => ({
  path: `/admin/${props.resource}`,
  query: {
    ...(search.value.trim() ? { q: search.value.trim() } : {}),
    ...(filter.value !== 'all' ? { filter: filter.value } : {}),
    ...(nextPage > 1 ? { page: String(nextPage) } : {}),
  },
})

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

const statusLabel = (status: string) =>
  ({ active: '进行中', archived: '已归档', developing: '开发中' })[status] ||
  status

onMounted(syncFromRoute)
watch(() => route.fullPath, syncFromRoute)
onBeforeUnmount(() => {
  requestNumber++
  loadController?.abort()
})
useHead(() => ({ title: `${copy.value.title} · 后台空间` }))

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
  <div class="admin-portfolio-list-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">
          {{ isProjects ? 'Portfolio workspace' : 'Curated connections' }}
        </p>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.description }}</p>
      </div>
      <NuxtLink
        class="admin-resource-heading__create"
        :to="`/admin/${resource}/new`"
        >新建{{ copy.label }}</NuxtLink
      >
    </header>

    <UiGlassPanel padding="compact">
      <form
        class="admin-portfolio-filters"
        role="search"
        @submit.prevent="applyFilters"
      >
        <UiInput
          v-model="search"
          :label="`搜索${copy.label}`"
          type="search"
          :placeholder="isProjects ? '名称或描述' : '名称、描述或地址'"
        />
        <UiSelect
          v-model="filter"
          label="筛选状态"
          :options="
            isProjects
              ? [
                  { label: '全部状态', value: 'all' },
                  { label: '开发中', value: 'developing' },
                  { label: '进行中', value: 'active' },
                  { label: '已归档', value: 'archived' },
                ]
              : [
                  { label: '全部状态', value: 'all' },
                  { label: '公开展示', value: 'active' },
                  { label: '已隐藏', value: 'inactive' },
                ]
          "
        />
        <UiButton type="submit" size="small">应用筛选</UiButton>
      </form>
    </UiGlassPanel>

    <section
      v-if="loading && !entries.length"
      class="admin-resource-state"
      role="status"
    >
      正在读取{{ copy.label }}…
    </section>
    <section v-else-if="error" class="admin-resource-state" role="alert">
      <strong>暂时无法加载{{ copy.label }}</strong>
      <p>{{ error }}</p>
      <UiButton variant="secondary" @click="load">重新加载</UiButton>
    </section>
    <section v-else-if="!entries.length" class="admin-resource-state">
      <strong>还没有{{ copy.label }}</strong>
      <p>创建后，公开站点就可以使用这组可配置内容。</p>
      <NuxtLink :to="`/admin/${resource}/new`">新建{{ copy.label }}</NuxtLink>
    </section>
    <section v-else :aria-label="`${copy.label}列表`">
      <div class="admin-portfolio-summary">
        <span>共 {{ pagination.total }} 条</span>
        <span
          >第 {{ pagination.page }} /
          {{ Math.max(pagination.totalPages, 1) }} 页</span
        >
      </div>
      <ul class="admin-portfolio-list">
        <li v-for="entry in entries" :key="entry.id">
          <NuxtLink
            class="admin-portfolio-row"
            :to="`/admin/${resource}/${entry.id}/edit`"
          >
            <span class="admin-portfolio-row__main">
              <strong>{{ entry.name }}</strong>
              <span>{{ entry.description }}</span>
              <small v-if="'status' in entry">
                {{ statusLabel(entry.status) }} ·
                {{ entry.featured ? '首页精选' : '普通项目' }} ·
                {{ entry.stack.join('、') || '暂无技术栈' }} ·
                {{ entry.timeSpan }}
              </small>
              <small v-else>
                {{ entry.isActive ? '公开展示' : '已隐藏' }} · 展示顺序
                {{ entry.displayOrder }} · 更新于
                {{ formatDate(entry.updatedAt) }}
              </small>
            </span>
            <UiBadge
              :tone="
                'status' in entry
                  ? entry.status === 'active'
                    ? 'success'
                    : 'neutral'
                  : entry.isActive
                    ? 'success'
                    : 'neutral'
              "
            >
              {{
                'status' in entry
                  ? statusLabel(entry.status)
                  : entry.isActive
                    ? '公开'
                    : '隐藏'
              }}
            </UiBadge>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <nav
      v-if="!loading && !error && pagination.totalPages > 1"
      class="admin-portfolio-pagination"
      :aria-label="`${copy.label}分页`"
    >
      <NuxtLink v-if="pagination.page > 1" :to="pageHref(pagination.page - 1)">
        上一页
      </NuxtLink>
      <span>第 {{ pagination.page }} 页</span>
      <NuxtLink
        v-if="pagination.page < pagination.totalPages"
        :to="pageHref(pagination.page + 1)"
      >
        下一页
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.admin-portfolio-list-page {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6) var(--space-16);
  min-width: 0;
}

.admin-resource-heading h1,
.admin-resource-heading p {
  margin: 0;
}

.admin-resource-heading h1 {
  margin-top: var(--space-2);
  font-size: clamp(2.25rem, 5vw, 4rem);
  letter-spacing: -0.04em;
}

.admin-resource-heading > div > p:last-child {
  margin-top: var(--space-3);
  color: var(--color-text-muted);
}

.admin-resource-heading__eyebrow {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-resource-heading__create,
.admin-resource-state a,
.admin-portfolio-pagination a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

.admin-portfolio-filters {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(10rem, 0.6fr) auto;
  align-items: end;
  gap: var(--space-4);
}

.admin-portfolio-summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-portfolio-list {
  display: grid;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
}

.admin-portfolio-list li + li {
  border-top: var(--border-hairline) solid var(--color-divider-subtle);
}

.admin-portfolio-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-6);
  transition: background-color var(--motion-duration-normal)
    var(--motion-ease-standard);
}

.admin-portfolio-row:hover {
  background: var(--glass-bg-hover);
}

.admin-portfolio-row__main {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
}

.admin-portfolio-row__main strong,
.admin-portfolio-row__main span,
.admin-portfolio-row__main small {
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-portfolio-row__main strong {
  color: var(--color-text);
  font-size: var(--text-body-large);
}

.admin-portfolio-row__main span,
.admin-portfolio-row__main small {
  color: var(--color-text-muted);
  line-height: 1.5;
}

.admin-portfolio-row__main small {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-resource-state {
  display: grid;
  min-height: 14rem;
  place-content: center;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
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
  font-size: var(--text-h3);
}

.admin-portfolio-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
  color: var(--color-text-muted);
}

.admin-portfolio-pagination a {
  background: var(--glass-card-bg);
  font-size: var(--text-small);
}

@media (width <= 52rem) {
  .admin-portfolio-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-portfolio-filters .field:first-child {
    grid-column: 1 / -1;
  }
}

@media (width <= 30rem) {
  .admin-resource-heading {
    align-items: start;
    flex-direction: column;
  }

  .admin-resource-heading__create {
    width: 100%;
  }

  .admin-portfolio-filters {
    grid-template-columns: 1fr;
  }

  .admin-portfolio-filters .field:first-child {
    grid-column: auto;
  }

  .admin-portfolio-row {
    align-items: start;
    flex-direction: column;
    padding: var(--space-4);
  }

  .admin-portfolio-row .badge {
    align-self: start;
  }
}
</style>
