<script setup lang="ts">
import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminActivityType, AdminDashboard } from '~/types/admin'

definePageMeta({ layout: 'admin' })

const api = useApiClient()
const session = useAdminSession()
const dashboard = ref<AdminDashboard | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
let requestNumber = 0

const countCards = computed(() => {
  if (!dashboard.value) return []
  const counts = dashboard.value.counts
  return [
    { label: '文章总数', value: counts.posts, note: '全部文章' },
    { label: '已发布', value: counts.publishedPosts, note: '公开可见' },
    { label: '草稿', value: counts.draftPosts, note: '等待继续编辑' },
    { label: 'Moment', value: counts.moments, note: '生活动态' },
    { label: 'Chatter', value: counts.chatter, note: '短篇记录' },
    { label: '项目', value: counts.projects, note: '作品集项目' },
    { label: '友链', value: counts.friends, note: '已维护链接' },
    {
      label: '总阅读量',
      value: counts.totalReadingCount.toLocaleString('zh-CN'),
      note: '来自文章阅读记录',
    },
  ]
})

const activityLabel: Record<AdminActivityType, string> = {
  chatter: 'Chatter',
  friend: '友链',
  moment: 'Moment',
  post: '文章',
  project: '项目',
}

const activityHref: Record<AdminActivityType, string> = {
  chatter: '/admin/chatter',
  friend: '/admin/friends',
  moment: '/admin/moments',
  post: '/admin/posts',
  project: '/admin/projects',
}

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: '启用',
    draft: '草稿',
    inactive: '停用',
    published: '已发布',
  }
  return labels[status] || status
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))

const loadDashboard = async () => {
  if (!session.isAuthenticated) return
  const currentRequest = ++requestNumber
  isLoading.value = true
  errorMessage.value = null
  try {
    dashboard.value = await session.withSession(() => api.getAdminDashboard())
  } catch (error: unknown) {
    if (currentRequest !== requestNumber) return
    if (error instanceof BlogApiError && error.status === 403) {
      errorMessage.value = '当前账号没有访问 Dashboard 的权限。'
    } else {
      errorMessage.value = 'Dashboard 暂时无法加载，请稍后重试。'
    }
  } finally {
    if (currentRequest === requestNumber) isLoading.value = false
  }
}

watch(
  () => session.status,
  (status) => {
    if (status === 'authenticated') void loadDashboard()
  },
  { immediate: true },
)

useHead({ title: 'Dashboard · 后台空间' })
</script>

<template>
  <div class="admin-dashboard">
    <header class="admin-dashboard__heading">
      <div>
        <p class="admin-dashboard__eyebrow">Workspace overview</p>
        <h1>Dashboard</h1>
        <p>用一眼能读懂的状态，继续今天的编辑工作。</p>
      </div>
      <UiBadge v-if="session.user" tone="success">
        {{ session.user.username }} · 已连接
      </UiBadge>
    </header>

    <section
      v-if="isLoading && !dashboard"
      class="admin-dashboard__status"
      role="status"
      aria-busy="true"
    >
      <span class="admin-dashboard__loader" aria-hidden="true" />
      正在读取站点状态…
    </section>
    <section
      v-else-if="errorMessage"
      class="admin-dashboard__status"
      role="alert"
    >
      <p>{{ errorMessage }}</p>
      <UiButton variant="secondary" size="small" @click="loadDashboard">
        重新加载
      </UiButton>
    </section>
    <template v-else-if="dashboard">
      <section aria-labelledby="dashboard-counts-title">
        <div class="admin-dashboard__section-heading">
          <div>
            <p class="admin-dashboard__eyebrow">Content pulse</p>
            <h2 id="dashboard-counts-title">站点状态</h2>
          </div>
          <span class="admin-dashboard__section-note">来自当前内容库</span>
        </div>
        <div class="admin-dashboard__counts">
          <UiGlassCard
            v-for="card in countCards"
            :key="card.label"
            class="admin-dashboard__count-card"
            padding="compact"
          >
            <p>{{ card.label }}</p>
            <strong>{{ card.value }}</strong>
            <span>{{ card.note }}</span>
          </UiGlassCard>
        </div>
      </section>

      <section
        class="admin-dashboard__activity-section"
        aria-labelledby="dashboard-activity-title"
      >
        <div class="admin-dashboard__section-heading">
          <div>
            <p class="admin-dashboard__eyebrow">Keep the thread</p>
            <h2 id="dashboard-activity-title">最近编辑</h2>
          </div>
          <span class="admin-dashboard__section-note">最多显示 8 条</span>
        </div>
        <UiGlassPanel v-if="dashboard.recentActivity.length" padding="none">
          <ul class="admin-dashboard__activity-list">
            <li
              v-for="item in dashboard.recentActivity"
              :key="`${item.type}-${item.id}`"
            >
              <NuxtLink :to="activityHref[item.type]">
                <span class="admin-dashboard__activity-icon" aria-hidden="true">
                  {{ activityLabel[item.type].slice(0, 1) }}
                </span>
                <span class="admin-dashboard__activity-copy">
                  <strong>{{ item.title }}</strong>
                  <span>
                    {{ activityLabel[item.type] }} ·
                    {{ statusLabel(item.status) }}
                  </span>
                </span>
                <time :datetime="item.updatedAt">{{
                  formatDate(item.updatedAt)
                }}</time>
              </NuxtLink>
            </li>
          </ul>
        </UiGlassPanel>
        <UiGlassPanel v-else class="admin-dashboard__empty" tone="subtle">
          还没有可展示的编辑活动。
        </UiGlassPanel>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-dashboard {
  display: grid;
  gap: var(--space-12);
  padding-block: var(--space-6);
}

.admin-dashboard__heading,
.admin-dashboard__section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-5);
}

.admin-dashboard__heading h1,
.admin-dashboard__heading p,
.admin-dashboard__section-heading h2,
.admin-dashboard__section-heading p {
  margin: 0;
}

.admin-dashboard__heading h1 {
  margin-top: var(--space-2);
  font-size: clamp(2.25rem, 5vw, 4rem);
  letter-spacing: -0.04em;
}

.admin-dashboard__heading > div > p:last-child {
  margin-top: var(--space-3);
  color: var(--color-text-muted);
}

.admin-dashboard__eyebrow {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-dashboard__section-heading h2 {
  margin-top: var(--space-2);
  font-size: var(--text-h3);
}

.admin-dashboard__section-note {
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-dashboard__counts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.admin-dashboard__count-card {
  display: grid;
  min-height: 8rem;
  align-content: space-between;
  gap: var(--space-3);
}

.admin-dashboard__count-card p,
.admin-dashboard__count-card strong,
.admin-dashboard__count-card span {
  margin: 0;
}

.admin-dashboard__count-card p {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.admin-dashboard__count-card strong {
  color: var(--color-text);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  line-height: 1;
}

.admin-dashboard__count-card span {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.admin-dashboard__activity-section {
  display: grid;
  gap: var(--space-5);
}

.admin-dashboard__activity-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-dashboard__activity-list li + li {
  border-top: var(--border-hairline) solid var(--color-divider-subtle);
}

.admin-dashboard__activity-list a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  transition: background-color var(--motion-duration-normal)
    var(--motion-ease-standard);
}

.admin-dashboard__activity-list a:hover {
  background: var(--glass-bg-hover);
}

.admin-dashboard__activity-icon {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-accent-soft);
  font-size: var(--text-small);
  font-weight: var(--font-weight-bold);
}

.admin-dashboard__activity-copy {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.admin-dashboard__activity-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-dashboard__activity-copy span,
.admin-dashboard__activity-list time {
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.admin-dashboard__activity-list time {
  white-space: nowrap;
}

.admin-dashboard__status,
.admin-dashboard__empty {
  display: flex;
  min-height: 12rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  color: var(--color-text-muted);
  text-align: center;
}

.admin-dashboard__status p {
  margin: 0;
}

.admin-dashboard__loader {
  width: 1rem;
  height: 1rem;
  border: 0.125rem solid var(--color-accent-soft);
  border-right-color: transparent;
  border-radius: var(--radius-round);
  animation: admin-dashboard-spin var(--motion-duration-slow) linear infinite;
}

@keyframes admin-dashboard-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (width <= 64rem) {
  .admin-dashboard__counts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 30rem) {
  .admin-dashboard {
    gap: var(--space-8);
  }

  .admin-dashboard__heading,
  .admin-dashboard__section-heading {
    align-items: start;
    flex-direction: column;
  }

  .admin-dashboard__counts {
    gap: var(--space-3);
  }

  .admin-dashboard__activity-list a {
    grid-template-columns: auto minmax(0, 1fr);
    padding: var(--space-4);
  }

  .admin-dashboard__activity-list time {
    grid-column: 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-dashboard__loader {
    animation: none;
  }
}
</style>
