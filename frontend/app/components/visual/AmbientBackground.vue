<script setup lang="ts">
const isDocumentHidden = ref(false)

const syncDocumentVisibility = () => {
  isDocumentHidden.value = document.visibilityState === 'hidden'
}

onMounted(() => {
  syncDocumentVisibility()
  document.addEventListener('visibilitychange', syncDocumentVisibility)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', syncDocumentVisibility)
})
</script>

<template>
  <div
    class="ambient-background"
    :class="{ 'ambient-background--paused': isDocumentHidden }"
    aria-hidden="true"
  >
    <VisualResponsiveBackgroundMedia
      class="ambient-background__media"
      sizes="100vw"
      eager
    />
    <div class="ambient-background__veil" />
    <div class="ambient-background__glow ambient-background__glow--indigo" />
    <div class="ambient-background__glow ambient-background__glow--violet" />
  </div>
</template>

<style scoped>
.ambient-background {
  position: fixed;
  z-index: var(--z-background);
  inset: 0;
  overflow: hidden;
  background: var(--color-canvas);
}

.ambient-background__media,
.ambient-background__media :deep(.responsive-background-media__image),
.ambient-background__veil {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ambient-background__media :deep(.responsive-background-media__image) {
  object-fit: cover;
  object-position: 45% center;
  filter: saturate(0.8) contrast(0.95);
}

.ambient-background__veil {
  background:
    linear-gradient(180deg, rgb(5 10 25 / 70%), rgb(5 9 22 / 88%)),
    linear-gradient(
      90deg,
      rgb(4 8 21 / 76%),
      rgb(7 12 28 / 38%) 55%,
      rgb(5 9 22 / 72%) 100%
    );
}

.ambient-background__glow {
  position: absolute;
  width: min(52rem, 72vw);
  aspect-ratio: 1;
  border-radius: var(--radius-round);
  filter: blur(var(--blur-ambient));
  opacity: 0.46;
  animation: ambient-drift 18s var(--motion-ease-standard) infinite alternate;
}

.ambient-background__glow--indigo {
  top: -42%;
  right: -16%;
  background: radial-gradient(circle, var(--glow-accent), transparent 68%);
}

.ambient-background__glow--violet {
  bottom: -54%;
  left: -20%;
  background: radial-gradient(circle, var(--glow-secondary), transparent 68%);
  animation-direction: alternate-reverse;
}

.ambient-background--paused .ambient-background__glow {
  animation-play-state: paused;
}

@keyframes ambient-drift {
  to {
    transform: translate3d(2.5rem, 1.5rem, 0);
  }
}

@media (width <= 48rem) {
  .ambient-background__media :deep(.responsive-background-media__image) {
    object-position: 37% center;
  }

  .ambient-background__veil {
    background: linear-gradient(180deg, rgb(5 10 25 / 76%), rgb(5 9 22 / 94%));
  }

  .ambient-background__glow {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ambient-background__glow {
    animation: none;
  }
}
</style>
