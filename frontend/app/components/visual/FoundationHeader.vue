<script setup lang="ts">
import { Menu, X } from 'lucide-vue-next'
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
const motionEnabled = useMotionPreference()
const route = useRoute()
const { identity } = await usePublicSiteSettings()

const isCurrentRoute = (href: string) =>
  route.path === href || (href !== '/' && route.path.startsWith(`${href}/`))

onMounted(() => {
  isHydrated.value = true
})
</script>

<template>
  <UiGlassPanel as="header" class="site-header" tone="subtle" padding="compact">
    <NuxtLink class="site-brand" to="/" :aria-label="`${identity.name}首页`">
      {{ identity.name }}
    </NuxtLink>

    <nav class="desktop-navigation" aria-label="主导航">
      <a
        v-for="item in publicNavigation"
        :key="item.label"
        :href="item.href"
        :aria-current="isCurrentRoute(item.href) ? 'page' : undefined"
      >
        {{ item.label }}
      </a>
    </nav>

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
              <a
                v-for="item in publicNavigation"
                :key="item.label"
                :href="item.href"
                :aria-current="isCurrentRoute(item.href) ? 'page' : undefined"
                @click="isMenuOpen = false"
              >
                {{ item.label }}
              </a>
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
.site-header {
  position: fixed;
  z-index: var(--z-sticky);
  top: var(--space-5);
  right: var(--gutter-page);
  left: var(--gutter-page);
  display: flex;
  max-width: var(--container-wide);
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  margin-inline: auto;
  border-radius: var(--radius-medium);
  padding-inline: var(--space-6);
}

.site-brand {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.desktop-navigation {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.desktop-navigation a {
  position: relative;
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  transition: color var(--motion-duration-fast) var(--motion-ease-standard);
}

.desktop-navigation a:hover,
.desktop-navigation a[aria-current='page'] {
  color: var(--color-text);
}

.desktop-navigation a[aria-current='page']::after {
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-1);
  left: var(--space-4);
  height: 0.125rem;
  border-radius: var(--radius-round);
  background: var(--color-accent-soft);
  box-shadow: var(--shadow-glow);
  content: '';
}

.menu-button,
.mobile-navigation {
  display: none;
}

@media (width <= 48rem) {
  .site-header {
    top: var(--space-6);
    min-height: 4rem;
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-5);
  }

  .site-brand {
    font-size: 1.1rem;
  }

  .desktop-navigation {
    display: none;
  }

  .menu-button {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-small);
    background: rgb(20 31 61 / 72%);
    color: var(--color-text);
  }

  .menu-button:disabled {
    cursor: wait;
  }

  .mobile-sheet__overlay {
    position: fixed;
    z-index: var(--z-overlay);
    inset: 0;
    background: rgb(3 7 18 / 68%);
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
    background: rgb(124 131 255 / 15%);
    color: var(--color-text);
  }
}
</style>
