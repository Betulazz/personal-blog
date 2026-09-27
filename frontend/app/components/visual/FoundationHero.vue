<script setup lang="ts">
import { ArrowDown, ArrowRight } from 'lucide-vue-next'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import type { HomepageStat } from '~/types/homepage'

defineProps<{ stats: HomepageStat[] }>()
const { identity, settings } = await usePublicSiteSettings()
</script>

<template>
  <UiPageContainer as="section" class="hero" width="wide">
    <section class="hero__content" aria-labelledby="hero-title">
      <div class="hero__copy">
        <UiSectionHeader
          class="hero__heading"
          :title="identity.tagline"
          :description="identity.description"
          :heading-level="1"
          title-id="hero-title"
        />

        <div class="hero__actions">
          <NuxtLink class="action action--primary" to="/posts">
            开始阅读
            <ArrowRight :size="20" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink class="action action--secondary" to="/about">
            了解我
          </NuxtLink>
        </div>

        <UiBadge class="hero__meta">WRITING · BUILDING · LIVING</UiBadge>
      </div>

      <div class="hero__aside">
        <HomeProfileSection :stats="stats" />
        <HomeMusicCard v-if="settings.homepageVisibility.music" />
      </div>

      <HomeLyricStrip
        v-if="settings.homepageVisibility.music"
        class="hero__lyrics"
      />
    </section>

    <a class="scroll-cue" href="#reading" aria-label="继续浏览">
      <span />
      <ArrowDown :size="22" aria-hidden="true" />
    </a>
  </UiPageContainer>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  min-height: 100svh;
  align-items: center;
  padding-top: clamp(8rem, 9vw, 10rem);
  padding-bottom: var(--space-20);
}

.hero__content {
  display: grid;
  width: min(100%, var(--container-wide));
  grid-template-columns: minmax(0, 1.04fr) minmax(23rem, 0.96fr);
  align-items: center;
  gap: clamp(2.5rem, 5vw, 6rem);
  margin-inline: auto;
}

.hero__aside {
  display: grid;
  min-width: 0;
  gap: var(--space-5);
}

.hero__lyrics {
  grid-column: 1 / -1;
}

.hero__copy {
  max-width: 48rem;
}

.hero__heading :deep(h1) {
  font-size: var(--text-display);
  font-weight: 800;
  letter-spacing: -0.045em;
  text-shadow: 0 0.125rem 1.5rem rgb(0 5 23 / 55%);
}

.hero__heading :deep(.section-header__description) {
  margin-top: var(--space-4);
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  line-height: var(--leading-body);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-10);
}

.action {
  display: inline-flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-8);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-medium);
  font-size: var(--text-small);
  font-weight: 650;
  transition:
    transform var(--motion-duration-fast) var(--motion-ease-standard),
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    background-color var(--motion-duration-fast) var(--motion-ease-standard),
    box-shadow var(--motion-duration-fast) var(--motion-ease-standard);
}

.action:hover {
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

.action--primary {
  border-color: rgb(164 175 255 / 50%);
  background: linear-gradient(
    135deg,
    var(--color-action-start),
    var(--color-action-end)
  );
  box-shadow: 0 0.75rem 2.5rem rgb(74 93 238 / 30%);
}

.action--primary:hover {
  border-color: rgb(215 221 255 / 74%);
  box-shadow: 0 1rem 3rem rgb(74 93 238 / 42%);
}

.action--secondary {
  background: var(--glass-subtle-bg);
  box-shadow: var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-subtle))
    saturate(var(--glass-saturation));
}

.action--secondary:hover {
  border-color: var(--glass-border-hover);
  background: var(--glass-bg-hover);
}

.hero__meta {
  margin-top: var(--space-10);
  letter-spacing: 0.32em;
}

.scroll-cue {
  position: absolute;
  bottom: var(--space-6);
  left: 50%;
  display: grid;
  min-width: 2.75rem;
  min-height: 4.5rem;
  place-items: end center;
  color: var(--color-text-muted);
  transform: translateX(-50%);
}

.scroll-cue span {
  position: absolute;
  top: 0;
  width: 1px;
  height: 2.5rem;
  background: linear-gradient(transparent, var(--color-accent-soft));
}

@media (width <= 64rem) {
  .hero__content {
    grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
    gap: var(--space-8);
  }
}

@media (width <= 48rem) {
  .hero {
    align-items: start;
    padding-top: 11rem;
    padding-bottom: var(--space-16);
    min-height: auto;
  }

  .hero__content {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }

  .hero__heading :deep(h1) {
    font-size: clamp(2.5rem, 10.25vw, 3.15rem);
    letter-spacing: -0.04em;
  }

  .hero__heading :deep(.section-header__description) {
    font-size: 1rem;
  }

  .hero__actions {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }

  .action {
    min-height: 3.5rem;
    padding-inline: var(--space-4);
  }

  .hero__meta {
    overflow-wrap: anywhere;
    margin-top: var(--space-6);
    font-size: 0.6875rem;
    letter-spacing: 0.22em;
  }

  .scroll-cue {
    display: none;
  }
}

@media (width < 22rem) {
  .hero__actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .action:hover {
    transform: none;
  }
}
</style>
