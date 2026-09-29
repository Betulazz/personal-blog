<script setup lang="ts">
import { Menu, Search, X } from 'lucide-vue-next'
import { motion } from 'motion-v'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  VisuallyHidden,
} from 'reka-ui'
import { publicNavigation } from '~/config/siteIdentity'
import { motionTransitions } from '~/config/motion'
import { useMotionPreference } from '~/composables/useMotionPreference'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const isMenuOpen = ref(false)
const isHydrated = ref(false)
const isHeaderHidden = ref(false)
const motionEnabled = useMotionPreference()
const route = useRoute()
const { identity } = await usePublicSiteSettings()

const headerScrollThreshold = 80
const scrollIntentThreshold = 8
let previousScrollY = 0
let scrollDirection = 0
let scrollDirectionDistance = 0

const isCurrentRoute = (href: string) =>
  route.path === href || (href !== '/' && route.path.startsWith(`${href}/`))

const resetScrollIntent = () => {
  scrollDirection = 0
  scrollDirectionDistance = 0
}

const revealHeader = () => {
  isHeaderHidden.value = false
}

const handleWindowScroll = () => {
  const currentScrollY = Math.max(0, window.scrollY)
  const delta = currentScrollY - previousScrollY
  previousScrollY = currentScrollY

  if (currentScrollY <= headerScrollThreshold) {
    revealHeader()
    resetScrollIntent()
    return
  }

  const activeElement = document.activeElement
  if (
    isMenuOpen.value ||
    (activeElement instanceof HTMLElement &&
      activeElement.closest('.site-header') &&
      activeElement.matches(':focus-visible'))
  ) {
    revealHeader()
    resetScrollIntent()
    return
  }

  if (delta === 0) return

  const nextDirection = Math.sign(delta)
  if (nextDirection !== scrollDirection) {
    scrollDirection = nextDirection
    scrollDirectionDistance = 0
  }

  scrollDirectionDistance += Math.abs(delta)
  if (scrollDirectionDistance < scrollIntentThreshold) return

  isHeaderHidden.value = nextDirection > 0
}

watch(
  () => route.fullPath,
  () => {
    revealHeader()
    resetScrollIntent()
    if (import.meta.client) previousScrollY = window.scrollY
  },
  { flush: 'sync' },
)

watch(isMenuOpen, (open) => {
  if (open) revealHeader()
})

onMounted(() => {
  isHydrated.value = true
  previousScrollY = window.scrollY
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowScroll)
})
</script>

<template>
  <UiGlassPanel
    as="header"
    class="site-header"
    :class="{ 'site-header--hidden': isHeaderHidden }"
    tone="subtle"
    padding="compact"
    @focusin="revealHeader"
  >
    <NuxtLink class="site-brand" to="/" :aria-label="`${identity.name}首页`">
      {{ identity.name }}
    </NuxtLink>

    <nav class="desktop-navigation" aria-label="主导航">
      <NuxtLink
        v-for="item in publicNavigation"
        :key="item.label"
        :to="item.href"
        :aria-current="isCurrentRoute(item.href) ? 'page' : undefined"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <NuxtLink
      class="header-search"
      to="/posts#post-search"
      aria-label="搜索文章"
    >
      <Search :size="21" :stroke-width="1.8" aria-hidden="true" />
    </NuxtLink>

    <DialogRoot v-if="isHydrated" v-model:open="isMenuOpen">
      <DialogTrigger as-child>
        <button
          class="menu-button"
          type="button"
          aria-label="打开主导航"
          aria-controls="mobile-navigation"
          :aria-expanded="isMenuOpen"
        >
          <Menu :size="24" aria-hidden="true" />
        </button>
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay as-child>
          <motion.div
            class="mobile-sheet__overlay"
            :initial="motionEnabled ? { opacity: 0 } : false"
            :animate="{ opacity: 1 }"
            :transition="motionTransitions.menu"
          />
        </DialogOverlay>
        <DialogContent as-child :aria-describedby="undefined">
          <motion.div
            class="mobile-sheet"
            :initial="motionEnabled ? { opacity: 0, x: 12 } : false"
            :animate="{ opacity: 1, x: 0 }"
            :transition="motionTransitions.menu"
          >
            <VisuallyHidden>
              <DialogTitle>主导航</DialogTitle>
            </VisuallyHidden>
            <DialogClose as-child>
              <button
                class="mobile-sheet__close"
                type="button"
                aria-label="关闭主导航"
              >
                <X :size="24" aria-hidden="true" />
              </button>
            </DialogClose>
            <nav
              id="mobile-navigation"
              class="mobile-navigation"
              aria-label="移动端主导航"
            >
              <NuxtLink
                v-for="item in publicNavigation"
                :key="item.label"
                :to="item.href"
                :aria-current="isCurrentRoute(item.href) ? 'page' : undefined"
                @click="isMenuOpen = false"
              >
                {{ item.label }}
              </NuxtLink>
            </nav>
          </motion.div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
    <button
      v-else
      class="menu-button"
      type="button"
      aria-label="打开主导航"
      disabled
      aria-expanded="false"
    >
      <Menu :size="24" aria-hidden="true" />
    </button>
  </UiGlassPanel>
</template>

<style scoped>
.site-header.glass-panel[data-tone] {
  --site-header-offset-top: 0px;

  position: fixed;
  z-index: var(--z-sticky);
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  max-width: none;
  min-height: 5rem;
  align-items: center;
  justify-content: space-between;
  margin-inline: auto;
  padding: var(--space-2)
    max(var(--gutter-page), calc((100vw - var(--container-wide)) / 2));
  border: 0;
  border-bottom: 1px solid var(--color-border-strong);
  border-radius: 0;
  background: var(--color-canvas-raised);
  box-shadow: none;
  transition:
    transform var(--motion-duration-header) var(--motion-ease-standard),
    opacity var(--motion-duration-header) var(--motion-ease-standard);
  will-change: transform;
}

.site-header--hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(calc(-100% - var(--site-header-offset-top) - 1px));
}

.site-header--hidden:has(:focus-visible) {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.site-header:has(:focus-visible) {
  transition-duration: var(--motion-duration-immediate);
}

.site-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.site-brand::before {
  width: 0.72rem;
  height: 0.72rem;
  flex: none;
  background: var(--color-accent);
  content: '';
}

.desktop-navigation {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-left: auto;
}

.desktop-navigation a {
  position: relative;
  padding: var(--space-3) var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.9375rem;
  font-weight: 600;
  transition: color var(--motion-duration-fast) var(--motion-ease-standard);
}

.desktop-navigation a:hover,
.desktop-navigation a[aria-current='page'] {
  color: var(--color-text);
}

.desktop-navigation a[aria-current='page']::after {
  position: absolute;
  right: var(--space-2);
  bottom: 0.2rem;
  left: var(--space-2);
  height: 0.125rem;
  background: var(--color-accent);
  content: '';
}

.header-search {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  place-items: center;
  margin-left: var(--space-6);
  border-left: 1px solid var(--color-border);
  color: var(--color-text);
}

.header-search:hover {
  color: var(--color-accent-strong);
}

.menu-button,
.mobile-navigation {
  display: none;
}

@media (width <= 48rem) {
  .site-header.glass-panel[data-tone] {
    --site-header-offset-top: 0px;

    top: 0;
    min-height: 4rem;
    padding: var(--space-2) var(--gutter-page);
  }

  .site-brand {
    font-size: 1.1rem;
  }

  .desktop-navigation {
    display: none;
  }

  .header-search {
    margin-left: auto;
    border-left: 0;
  }

  .menu-button {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-small);
    background: var(--color-canvas-raised);
    color: var(--color-text);
  }

  .menu-button:disabled {
    cursor: wait;
  }

  .mobile-sheet__overlay {
    position: fixed;
    z-index: var(--z-overlay);
    inset: 0;
    background: rgb(34 39 32 / 48%);
    backdrop-filter: blur(var(--blur-soft));
  }

  .mobile-sheet {
    position: fixed;
    z-index: calc(var(--z-overlay) + 1);
    top: var(--space-4);
    right: var(--space-4);
    bottom: var(--space-4);
    width: min(24rem, calc(100vw - 2rem));
    padding: var(--space-20) var(--space-5) var(--space-5);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-large);
    background: var(--glass-elevated-bg);
    box-shadow: var(--glass-shadow), var(--glass-highlight);
  }

  .mobile-sheet__close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-small);
    background: var(--glass-card-bg);
    color: var(--color-text);
  }

  .mobile-navigation {
    display: grid;
    gap: var(--space-2);
  }

  .mobile-navigation a {
    display: flex;
    min-height: 3rem;
    align-items: center;
    padding-inline: var(--space-4);
    border-radius: var(--radius-small);
    color: var(--color-text-muted);
    font-size: var(--text-body);
  }

  .mobile-navigation a:hover,
  .mobile-navigation a[aria-current='page'] {
    background: var(--badge-accent-bg);
    color: var(--color-text);
  }
}

@media (prefers-reduced-motion: reduce) {
  .site-header,
  .site-header:has(:focus-visible) {
    transition: none;
  }

  .site-header--hidden {
    transform: none;
  }
}
</style>
