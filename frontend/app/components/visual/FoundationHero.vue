<script setup lang="ts">
import { ArrowDown, ArrowRight } from 'lucide-vue-next'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity } = await usePublicSiteSettings()
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
          <a class="action action--primary" href="/posts">
            开始阅读
            <ArrowRight :size="20" aria-hidden="true" />
          </a>
          <a class="action action--secondary" href="/about">了解我</a>
        </div>

        <UiBadge class="hero__meta">WRITING · BUILDING · LIVING</UiBadge>
      </div>

      <UiGlassCard
        class="hero__window"
        padding="none"
        media
        hoverable
        aria-hidden="true"
      >
        <template #media>
          <VisualResponsiveBackgroundMedia
            sizes="(max-width: 767px) calc(100vw - 32px), 42vw"
          />
        </template>
      </UiGlassCard>
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
  padding-top: 8rem;
  padding-bottom: var(--space-16);
}

.hero__content {
  display: grid;
  width: min(100%, var(--container-wide));
  grid-template-columns: minmax(0, 1.08fr) minmax(24rem, 0.92fr);
  align-items: center;
  gap: clamp(3rem, 6vw, 7rem);
  margin-inline: auto;
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

.hero__window {
  overflow: hidden;
  border-color: var(--glass-border-strong);
}

.hero__window :deep(.responsive-background-media),
.hero__window :deep(.responsive-background-media__image) {
  display: block;
  width: 100%;
}

.hero__window :deep(.responsive-background-media__image) {
  aspect-ratio: 1.2;
  object-fit: cover;
  object-position: 48% center;
  opacity: 0.72;
  filter: saturate(0.78) brightness(0.6) contrast(1.05);
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

@media (width < 64rem) {
  .hero__content {
    grid-template-columns: 1fr 0.8fr;
    gap: var(--space-10);
  }
}

@media (width <= 48rem) {
  .hero {
    align-items: start;
    padding-top: 11rem;
    padding-bottom: var(--space-24);
  }

  .hero__content {
    grid-template-columns: 1fr;
    gap: var(--space-12);
  }

  .hero__heading :deep(h1) {
    font-size: clamp(2.65rem, 11vw, 3.3rem);
    letter-spacing: -0.04em;
  }

  .hero__heading :deep(.section-header__description) {
    font-size: 1rem;
  }

  .hero__actions {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: var(--space-3);
    margin-top: var(--space-8);
  }

  .action {
    min-height: 3.5rem;
    padding-inline: var(--space-4);
  }

  .hero__meta {
    overflow-wrap: anywhere;
    margin-top: var(--space-8);
    padding-top: var(--space-5);
    font-size: 0.6875rem;
    letter-spacing: 0.22em;
  }

  .hero__window :deep(.responsive-background-media__image) {
    aspect-ratio: 1.08;
    opacity: 0.68;
    object-position: 38% center;
  }

  .scroll-cue {
    bottom: var(--space-5);
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
