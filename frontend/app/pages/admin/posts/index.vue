<script setup lang="ts">
import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminPost, AdminPostQuery, AdminTaxonomy } from '~/types/admin'

definePageMeta({ layout: 'admin' })

const api = useApiClient()
const session = useAdminSession()
const route = useRoute()
const posts = ref<AdminPost[]>([])
const tags = ref<AdminTaxonomy[]>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0, totalPages: 0 })
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const search = ref('')
const status = ref('all')
const tag = ref('all')
let requestNumber = 0

const queryFromRoute = (): AdminPostQuery => ({
  page: Math.max(1, Number(route.query.page) || 1),
  pageSize: 10,
  q: typeof route.query.q === 'string' ? route.query.q : undefined,
  status:
    route.query.status === 'draft' || route.query.status === 'published'
      ? route.query.status
      : undefined,
  tag: typeof route.query.tag === 'string' ? route.query.tag : undefined,
})

const syncControls = () => {
  const query = queryFromRoute()
  search.value = query.q ?? ''
  status.value = query.status ?? 'all'
  tag.value = query.tag ?? 'all'
}

const load = async () => {
  if (!session.isAuthenticated) return
  const currentRequest = ++requestNumber
  isLoading.value = true
  errorMessage.value = null
  try {
    const query = queryFromRoute()
    const [postResponse, tagResponse] = await session.withSession(() =>
      Promise.all([api.listAdminPosts(query), api.listAdminTags()]),
    )
    if (currentRequest !== requestNumber) return
    posts.value = postResponse.data
    pagination.value = postResponse.pagination
    tags.value = tagResponse
  } catch (error: unknown) {
    if (currentRequest !== requestNumber) return
    errorMessage.value =
      error instanceof BlogApiError && error.status === 403
        ? '当前账号没有管理文章的权限。'
        : '文章工作区暂时无法加载，请稍后重试。'
  } finally {
    if (currentRequest === requestNumber) isLoading.value = false
  }
}

const applyFilters = async () => {
  const query: Record<string, string> = {}
  if (search.value.trim()) query.q = search.value.trim()
  if (status.value !== 'all') query.status = status.value
  if (tag.value !== 'all') query.tag = tag.value
  await navigateTo({ path: '/admin/posts', query })
}

const pageHref = (page: number) => {
  const query: Record<string, string> = {}
  if (search.value.trim()) query.q = search.value.trim()
  if (status.value !== 'all') query.status = status.value
  if (tag.value !== 'all') query.tag = tag.value
  if (page > 1) query.page = String(page)
  return { path: '/admin/posts', query }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

watch(
  () => [session.status, route.fullPath],
  ([statusValue]) => {
    syncControls()
    if (statusValue === 'authenticated') void load()
  },
  { immediate: true },
)

useHead({ title: '文章管理 · 后台空间' })
</script>

<template>
  <div class="admin-posts-page">
    <header class="admin-resource-heading">
      <div>
        <p class="admin-resource-heading__eyebrow">Editorial workspace</p>
        <h1>文章管理</h1>
        <p>搜索、筛选并继续处理正式的长篇内容。</p>
      </div>
      <NuxtLink class="admin-resource-heading__create" to="/admin/posts/new">
        新建文章
      </NuxtLink>
    </header>

    <UiGlassPanel class="admin-posts-filters" padding="compact">
      <form role="search" @submit.prevent="applyFilters">
        <UiInput
          v-model="search"
          label="搜索文章"
          name="post-search"
          type="search"
          placeholder="标题、摘要、正文或标签"
        />
        <UiSelect
          v-model="status"
          label="状态"
          :options="[
            { label: '全部状态', value: 'all' },
            { label: '草稿', value: 'draft' },
            { label: '已发布', value: 'published' },
          ]"
        />
        <UiSelect
          v-model="tag"
          label="标签"
          :options="[
            { label: '全部标签', value: 'all' },
            ...tags.map((item) => ({ label: item.name, value: item.slug })),
          ]"
        />
        <UiButton type="submit" size="small">应用筛选</UiButton>
      </form>
    </UiGlassPanel>

    <section
      v-if="isLoading && !posts.length"
      class="admin-resource-state"
      role="status"
      aria-busy="true"
    >
      <span
        class="admin-resource-state__loader"
        data-continuous-effect
        aria-hidden="true"
      />
      正在读取文章…
    </section>
    <section v-else-if="errorMessage" class="admin-resource-state" role="alert">
      <p>{{ errorMessage }}</p>
      <UiButton variant="secondary" size="small" @click="load"
        >重新加载</UiButton
      >
    </section>
    <section
      v-else-if="!posts.length"
      class="admin-resource-state"
      aria-live="polite"
    >
      <strong>{{
        search || status !== 'all' || tag !== 'all'
          ? '没有符合筛选条件的文章'
          : '还没有文章'
      }}</strong>
      <p>
        {{
          search || status !== 'all' || tag !== 'all'
            ? '可以调整筛选条件，或开始一篇新的草稿。'
            : '从一篇小而完整的草稿开始。'
        }}
      </p>
      <NuxtLink
        v-if="!search && status === 'all' && tag === 'all'"
        class="admin-resource-state__link"
        to="/admin/posts/new"
        >新建第一篇文章</NuxtLink
      >
    </section>
    <section v-else class="admin-post-list" aria-label="文章列表">
      <div class="admin-post-list__summary">
        <span>共 {{ pagination.total }} 篇</span>
        <span
          >第 {{ pagination.page }} /
          {{ Math.max(pagination.totalPages, 1) }} 页</span
        >
      </div>
      <ul>
        <li v-for="post in posts" :key="post.id">
          <NuxtLink class="admin-post-row" :to="`/admin/posts/${post.id}/edit`">
            <span class="admin-post-row__main">
              <strong>{{ post.title }}</strong>
              <span>{{ post.summary || '暂无摘要' }}</span>
              <small>
                {{
                  post.tags.length
                    ? post.tags.map((item) => item.name).join('、')
                    : '暂无标签'
                }}
                · 更新于 {{ formatDate(post.updatedAt) }}
              </small>
            </span>
            <span class="admin-post-row__meta">
              <UiBadge
                :tone="post.status === 'published' ? 'success' : 'neutral'"
              >
                {{ post.status === 'published' ? '已发布' : '草稿' }}
              </UiBadge>
              <span aria-hidden="true">→</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
      <nav
        v-if="pagination.totalPages > 1"
        class="admin-post-pagination"
        aria-label="文章分页"
      >
        <NuxtLink v-if="pagination.page > 1" :to="pageHref(pagination.page - 1)"
          >上一页</NuxtLink
        >
        <span>第 {{ pagination.page }} 页</span>
        <NuxtLink
          v-if="pagination.page < pagination.totalPages"
          :to="pageHref(pagination.page + 1)"
          >下一页</NuxtLink
        >
      </nav>
    </section>
  </div>
</template>

<style scoped>
.admin-posts-page {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6);
}

.admin-resource-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-5);
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
.admin-resource-state__link,
.admin-post-pagination a {
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

.admin-posts-filters form {
  display: grid;
  grid-template-columns: minmax(14rem, 1.5fr) repeat(3, minmax(8rem, 1fr)) auto;
  align-items: end;
  gap: var(--space-4);
}

.admin-post-list {
  display: grid;
  gap: var(--space-4);
}

.admin-post-list__summary {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-post-list ul {
  display: grid;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  box-shadow: var(--glass-highlight);
}

.admin-post-list li + li {
  border-top: var(--border-hairline) solid var(--color-divider-subtle);
}

.admin-post-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  padding: var(--space-5) var(--space-6);
  transition: background-color var(--motion-duration-normal)
    var(--motion-ease-standard);
}

.admin-post-row:hover {
  background: var(--glass-bg-hover);
}

.admin-post-row__main {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
}

.admin-post-row__main strong,
.admin-post-row__main span,
.admin-post-row__main small {
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-post-row__main strong {
  color: var(--color-text);
  font-size: var(--text-body-large);
}

.admin-post-row__main span,
.admin-post-row__main small {
  color: var(--color-text-muted);
  line-height: 1.5;
}

.admin-post-row__main small {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-post-row__meta {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-subtle);
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

.admin-resource-state p,
.admin-resource-state strong {
  margin: 0;
}

.admin-resource-state strong {
  color: var(--color-text);
  font-size: var(--text-h3);
}

.admin-resource-state__loader {
  width: 1.25rem;
  height: 1.25rem;
  border: 0.125rem solid var(--color-accent-soft);
  border-right-color: transparent;
  border-radius: var(--radius-round);
  animation: admin-post-spin var(--motion-duration-slow) linear infinite;
}

.admin-post-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  color: var(--color-text-muted);
}

.admin-post-pagination a {
  background: var(--glass-card-bg);
  font-size: var(--text-small);
}

@keyframes admin-post-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (width <= 64rem) {
  .admin-posts-filters form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-posts-filters form .field:first-child {
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

  .admin-posts-filters form {
    grid-template-columns: 1fr;
  }

  .admin-posts-filters form .field:first-child {
    grid-column: auto;
  }

  .admin-post-row {
    align-items: start;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
  }

  .admin-post-row__meta {
    width: 100%;
    justify-content: space-between;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-resource-state__loader {
    animation: none;
  }
}
</style>
