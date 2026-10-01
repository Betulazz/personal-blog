<script setup lang="ts">
import { Menu } from 'lucide-vue-next'

import { useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'

const api = useApiClient()
const session = useAdminSession()
const route = useRoute()
const isMenuOpen = ref(false)
const unreadComments = ref(0)

const navigation = [
  {
    label: '概览',
    items: [{ label: '工作台', to: '/admin', number: '00' }],
  },
  {
    label: '写作与内容',
    items: [
      { label: '文章', to: '/admin/posts', number: '01' },
      { label: '标签', to: '/admin/tags', number: '02' },
      { label: 'Chatter', to: '/admin/chatter', number: '03' },
      { label: '项目', to: '/admin/projects', number: '04' },
      { label: '评论', to: '/admin/comments', number: '10' },
    ],
  },
  {
    label: '站点维护',
    items: [
      { label: '友链', to: '/admin/friends', number: '05' },
      { label: '音乐', to: '/admin/music', number: '06' },
      { label: '媒体', to: '/admin/media', number: '07' },
      { label: '关于页面', to: '/admin/about', number: '08' },
      { label: '网站设置', to: '/admin/settings', number: '09' },
    ],
  },
]

const isCurrentRoute = (to: string) =>
  route.path === to || route.path.startsWith(`${to}/`)

const closeMenu = () => {
  isMenuOpen.value = false
}

const refreshUnreadComments = async () => {
  if (!session.isAuthenticated) {
    unreadComments.value = 0
    return
  }
  try {
    unreadComments.value = await session.withSession(() =>
      api.getUnreadCommentCount(),
    )
  } catch {
    unreadComments.value = 0
  }
}

const logout = async () => {
  await session.logout()
  await navigateTo('/admin/login')
}

watch(
  [() => route.path, () => session.status],
  ([path, status]) => {
    closeMenu()
    if (status !== 'authenticated') {
      unreadComments.value = 0
    } else if (
      path === '/admin/comments' ||
      path.startsWith('/admin/comments/')
    ) {
      unreadComments.value = 0
    } else {
      void refreshUnreadComments()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="admin-shell">
    <a class="admin-shell__skip-link" href="#admin-main">跳到后台主要内容</a>
    <header class="admin-shell__header">
      <div class="admin-shell__header-inner">
        <button
          class="admin-shell__menu-button"
          type="button"
          aria-label="打开后台导航"
          aria-controls="admin-mobile-navigation"
          :aria-expanded="isMenuOpen"
          @click="isMenuOpen = true"
        >
          <Menu :size="22" aria-hidden="true" />
        </button>
        <NuxtLink class="admin-shell__brand" to="/admin">
          <span class="admin-shell__brand-mark" aria-hidden="true" />
          <span>Birchtula <small>/ 编辑室</small></span>
        </NuxtLink>
        <div class="admin-shell__actions">
          <span class="admin-shell__user" aria-label="当前管理员">
            {{ session.user?.username || 'Administrator' }}
          </span>
          <a class="admin-shell__public-link" href="/">查看公开站点</a>
          <UiButton
            variant="ghost"
            size="small"
            aria-label="退出后台"
            @click="logout"
          >
            退出
          </UiButton>
        </div>
      </div>
    </header>

    <div class="admin-shell__body">
      <aside class="admin-shell__sidebar" aria-label="后台侧栏">
        <div class="admin-shell__sidebar-intro">
          <p>EDITORIAL DESK / 01</p>
          <strong>内容工作台</strong>
          <span>写作、整理与发布</span>
        </div>
        <nav aria-label="后台导航">
          <div
            v-for="group in navigation"
            :key="group.label"
            class="admin-shell__nav-group"
          >
            <p class="admin-shell__sidebar-label">{{ group.label }}</p>
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              :aria-current="isCurrentRoute(item.to) ? 'page' : undefined"
            >
              <span aria-hidden="true" class="admin-shell__nav-number">{{
                item.number
              }}</span>
              <span>{{ item.label }}</span>
              <span
                v-if="item.to === '/admin/comments' && unreadComments > 0"
                class="admin-shell__nav-badge"
                aria-label="新评论"
              >
                {{ unreadComments > 99 ? '99+' : unreadComments }}
              </span>
              <span aria-hidden="true" class="admin-shell__nav-arrow">↗</span>
            </NuxtLink>
          </div>
        </nav>
        <p class="admin-shell__sidebar-foot">BIRCHTULA / FIELD NOTES</p>
      </aside>

      <main id="admin-main" class="admin-shell__main" tabindex="-1">
        <slot />
      </main>
    </div>

    <UiSheet
      v-model:open="isMenuOpen"
      side="left"
      title="后台导航"
      description="在后台工作区之间切换。"
    >
      <nav
        id="admin-mobile-navigation"
        class="admin-shell__mobile-navigation"
        aria-label="移动端后台导航"
      >
        <div
          v-for="group in navigation"
          :key="group.label"
          class="admin-shell__nav-group"
        >
          <p class="admin-shell__sidebar-label">{{ group.label }}</p>
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :aria-current="isCurrentRoute(item.to) ? 'page' : undefined"
            @click="closeMenu"
          >
            <span aria-hidden="true" class="admin-shell__nav-number">{{
              item.number
            }}</span>
            {{ item.label }}
            <span
              v-if="item.to === '/admin/comments' && unreadComments > 0"
              class="admin-shell__nav-badge"
              aria-label="新评论"
            >
              {{ unreadComments > 99 ? '99+' : unreadComments }}
            </span>
          </NuxtLink>
        </div>
      </nav>
    </UiSheet>
  </div>
</template>

<style scoped>
.admin-shell {
  --admin-shell-gutter: clamp(1rem, 1.6667vw, 2rem);

  position: relative;
  z-index: var(--z-base);
  min-height: 100svh;
  background: var(--color-canvas);
  color: var(--color-text);
}

.admin-shell__skip-link {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--space-3);
  left: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-small);
  background: var(--color-canvas-raised);
  color: var(--color-text);
  transform: translateY(-180%);
}

.admin-shell__skip-link:focus {
  transform: translateY(0);
}

.admin-shell__header {
  position: sticky;
  z-index: var(--z-sticky);
  top: 0;
  border-bottom: var(--border-hairline) solid var(--color-border);
  background: rgb(255 253 247 / 96%);
  backdrop-filter: blur(0.75rem);
}

.admin-shell__header-inner {
  display: flex;
  width: 100%;
  max-width: none;
  min-height: 4.25rem;
  align-items: center;
  gap: var(--space-5);
  margin-inline: auto;
  padding-inline: var(--admin-shell-gutter);
}

.admin-shell__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.035em;
}

.admin-shell__brand-mark {
  display: block;
  width: 0.7rem;
  height: 0.7rem;
  background: var(--color-accent);
  transform: rotate(-8deg);
}

.admin-shell__brand small {
  margin-left: 0.25rem;
  color: var(--color-text-muted);
  font-family: var(--font-ui);
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0;
}

.admin-shell__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.admin-shell__user,
.admin-shell__public-link {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.admin-shell__user {
  padding: 0.45rem 0.75rem;
  border-left: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: 0.74rem;
}

.admin-shell__public-link {
  text-decoration: underline;
  text-decoration-color: var(--color-border-strong);
  text-underline-offset: 0.25em;
}

.admin-shell__public-link:hover {
  color: var(--color-text);
}

.admin-shell__menu-button {
  display: none;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-card-bg);
  color: var(--color-text);
}

.admin-shell__body {
  display: grid;
  width: 100%;
  max-width: none;
  min-height: calc(100svh - 4.25rem);
  grid-template-columns: 14.5rem minmax(0, 1fr);
  gap: clamp(1.5rem, 3vw, 3.5rem);
  margin-inline: auto;
  padding: var(--space-8) var(--admin-shell-gutter) var(--space-16);
}

.admin-shell__sidebar {
  position: sticky;
  top: 5.5rem;
  align-self: start;
  max-height: calc(100svh - 7rem);
  overflow-y: auto;
  padding: 0 var(--space-3);
  border-right: 1px solid var(--color-border);
}

.admin-shell__sidebar-intro {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.admin-shell__sidebar-intro p,
.admin-shell__sidebar-intro strong,
.admin-shell__sidebar-intro span {
  margin: 0;
}

.admin-shell__sidebar-intro p,
.admin-shell__sidebar-foot {
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.07em;
}

.admin-shell__sidebar-intro strong {
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 600;
}

.admin-shell__sidebar-intro span {
  color: var(--color-text-muted);
  font-size: 0.79rem;
}

.admin-shell__sidebar-label {
  margin: 0 0 var(--space-2);
  color: var(--color-text-subtle);
  font-size: 0.73rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.admin-shell__sidebar nav,
.admin-shell__mobile-navigation {
  display: grid;
  gap: var(--space-5);
}

.admin-shell__sidebar nav {
  padding-block: var(--space-5);
}

.admin-shell__nav-group {
  display: grid;
  gap: 0.125rem;
}

.admin-shell__sidebar a,
.admin-shell__mobile-navigation a {
  display: flex;
  min-height: 2.55rem;
  align-items: center;
  gap: var(--space-2);
  padding: 0.5rem 0.7rem;
  border-left: 2px solid transparent;
  border-radius: 0 var(--radius-small) var(--radius-small) 0;
  color: var(--color-text-muted);
  font-size: 0.87rem;
  transition:
    background-color var(--motion-duration-normal) var(--motion-ease-standard),
    color var(--motion-duration-normal) var(--motion-ease-standard);
}

.admin-shell__sidebar a:hover,
.admin-shell__sidebar a[aria-current='page'],
.admin-shell__mobile-navigation a:hover,
.admin-shell__mobile-navigation a[aria-current='page'] {
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.admin-shell__sidebar a[aria-current='page'],
.admin-shell__mobile-navigation a[aria-current='page'] {
  border-left-color: var(--color-accent);
  font-weight: 650;
}

.admin-shell__nav-number {
  min-width: 1.6rem;
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
}

.admin-shell__nav-badge {
  min-width: 1.35rem;
  margin-left: auto;
  border-radius: var(--radius-round);
  padding: 0.12rem 0.35rem;
  background: var(--color-accent);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.admin-shell__nav-arrow {
  margin-left: auto;
  opacity: 0;
}

.admin-shell__sidebar a:hover .admin-shell__nav-arrow,
.admin-shell__sidebar a[aria-current='page'] .admin-shell__nav-arrow {
  opacity: 1;
}

.admin-shell__sidebar-foot {
  margin: 0;
  padding: var(--space-5) var(--space-3) var(--space-6);
  border-top: 1px solid var(--color-border);
}

.admin-shell__main {
  min-width: 0;
}

.admin-shell__main:focus {
  outline: none;
}

.admin-shell__mobile-navigation {
  padding-block: var(--space-5);
}

@media (width <= 64rem) {
  .admin-shell__body {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .admin-shell__sidebar {
    display: none;
  }

  .admin-shell__menu-button {
    display: grid;
  }
}

@media (width <= 30rem) {
  .admin-shell__header-inner {
    gap: var(--space-3);
  }

  .admin-shell__user,
  .admin-shell__public-link {
    display: none;
  }

  .admin-shell__body {
    padding-top: var(--space-5);
  }

  .admin-shell__brand {
    font-size: 1rem;
  }
}
</style>
