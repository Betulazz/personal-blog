<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import { useAdminSession } from '~/stores/adminSession'

const session = useAdminSession()
const route = useRoute()
const isMenuOpen = ref(false)

const navigation = [
  { label: 'Dashboard', to: '/admin' },
  { label: '文章', to: '/admin/posts' },
  { label: '标签', to: '/admin/tags' },
  { label: 'Chatter', to: '/admin/chatter' },
  { label: '项目', to: '/admin/projects' },
  { label: '友链', to: '/admin/friends' },
  { label: '音乐', to: '/admin/music' },
  { label: '媒体', to: '/admin/media' },
  { label: '网站设置', to: '/admin/settings' },
]

const isCurrentRoute = (to: string) =>
  to === '/admin' ? route.path === to : route.path.startsWith(`${to}/`)

const closeMenu = () => {
  isMenuOpen.value = false
}

const logout = async () => {
  await session.logout()
  await navigateTo('/admin/login')
}

watch(
  () => route.path,
  () => closeMenu(),
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
          <span class="admin-shell__brand-mark" aria-hidden="true">✦</span>
          <span>后台空间</span>
        </NuxtLink>
        <div class="admin-shell__actions">
          <span class="admin-shell__user" aria-label="当前 Administrator">
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
        <p class="admin-shell__sidebar-label">Workspace</p>
        <nav aria-label="后台导航">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            :aria-current="isCurrentRoute(item.to) ? 'page' : undefined"
          >
            <span aria-hidden="true" class="admin-shell__nav-dot" />
            {{ item.label }}
          </NuxtLink>
        </nav>
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
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :aria-current="isCurrentRoute(item.to) ? 'page' : undefined"
          @click="closeMenu"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </UiSheet>
  </div>
</template>

<style scoped>
.admin-shell {
  position: relative;
  z-index: var(--z-base);
  min-height: 100svh;
  background:
    radial-gradient(circle at 82% -10%, var(--glow-accent), transparent 28rem),
    var(--color-canvas);
  color: var(--color-text);
}

.admin-shell__header {
  position: sticky;
  z-index: var(--z-sticky);
  top: 0;
  border-bottom: var(--border-hairline) solid var(--glass-border);
  background: rgb(6 10 23 / 84%);
  backdrop-filter: blur(var(--glass-blur-panel));
}

.admin-shell__header-inner {
  display: flex;
  width: min(100%, var(--container-wide));
  min-height: 4.5rem;
  align-items: center;
  gap: var(--space-5);
  margin-inline: auto;
  padding-inline: var(--gutter-page);
}

.admin-shell__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
}

.admin-shell__brand-mark {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-small);
  background: var(--badge-accent-bg);
  color: var(--color-accent-soft);
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
  width: min(100%, var(--container-wide));
  min-height: calc(100svh - 4.5rem);
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: var(--space-10);
  margin-inline: auto;
  padding: var(--space-8) var(--gutter-page) var(--space-16);
}

.admin-shell__sidebar {
  position: sticky;
  top: 6.5rem;
  align-self: start;
  padding: var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
  box-shadow: var(--glass-highlight);
}

.admin-shell__sidebar-label {
  margin: var(--space-2) var(--space-3) var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-shell__sidebar nav,
.admin-shell__mobile-navigation {
  display: grid;
  gap: var(--space-1);
}

.admin-shell__sidebar a,
.admin-shell__mobile-navigation a {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-medium);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  transition:
    background-color var(--motion-duration-normal) var(--motion-ease-standard),
    color var(--motion-duration-normal) var(--motion-ease-standard);
}

.admin-shell__sidebar a:hover,
.admin-shell__sidebar a[aria-current='page'],
.admin-shell__mobile-navigation a:hover,
.admin-shell__mobile-navigation a[aria-current='page'] {
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.admin-shell__nav-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: var(--radius-round);
  background: var(--color-text-subtle);
}

.admin-shell__sidebar a[aria-current='page'] .admin-shell__nav-dot {
  background: var(--color-accent-soft);
  box-shadow: 0 0 0.75rem var(--color-accent);
}

.admin-shell__main {
  min-width: 0;
}

.admin-shell__main:focus {
  outline: none;
}

.admin-shell__mobile-navigation {
  padding-block: var(--space-4);
}

@media (width <= 64rem) {
  .admin-shell__body {
    grid-template-columns: minmax(0, 1fr);
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
}
</style>
