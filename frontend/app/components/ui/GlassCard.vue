<script setup lang="ts">
type CardElement = 'article' | 'div' | 'li' | 'section'
type CardPadding = 'compact' | 'default' | 'none'

withDefaults(
  defineProps<{
    ariaLabel?: string
    as?: CardElement
    hoverable?: boolean
    media?: boolean
    mediaLabel?: string
    padding?: CardPadding
  }>(),
  {
    ariaLabel: undefined,
    as: 'div',
    hoverable: false,
    media: false,
    mediaLabel: '媒体内容暂不可用',
    padding: 'default',
  },
)
</script>

<template>
  <component
    :is="as"
    class="glass-card"
    :class="{ 'glass-card--hoverable': hoverable }"
    :data-padding="padding"
    :aria-label="ariaLabel"
  >
    <div v-if="media" class="glass-card__media">
      <slot v-if="$slots.media" name="media" />
      <div
        v-else
        class="glass-card__media-fallback"
        role="img"
        :aria-label="mediaLabel"
      >
        <span aria-hidden="true">◇</span>
      </div>
    </div>
    <div v-if="$slots.default" class="glass-card__body">
      <slot />
    </div>
  </component>
</template>

<style scoped>
.glass-card {
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-card-bg);
  box-shadow: var(--shadow-card), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-card))
    saturate(var(--glass-saturation));
}

.glass-card--hoverable {
  transition:
    transform var(--motion-duration-normal) var(--motion-ease-emphasized),
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard),
    box-shadow var(--motion-duration-normal) var(--motion-ease-standard);
}

@media (hover: hover) {
  .glass-card--hoverable:hover {
    border-color: var(--glass-border-hover);
    background: var(--glass-bg-hover);
    box-shadow: var(--glass-shadow), var(--glass-highlight);
    transform: translateY(calc(var(--motion-distance-small) * -1));
  }
}

.glass-card__media {
  overflow: hidden;
}

.glass-card__media-fallback {
  display: grid;
  min-height: var(--media-fallback-height);
  place-items: center;
  background: linear-gradient(
    135deg,
    var(--color-canvas-raised),
    var(--glass-card-bg)
  );
  color: var(--color-text-subtle);
  font-size: var(--text-h2);
}

.glass-card[data-padding='compact'] .glass-card__body {
  padding: var(--space-4);
}

.glass-card[data-padding='default'] .glass-card__body {
  padding: var(--space-6);
}

.glass-card[data-padding='none'] .glass-card__body {
  padding: 0;
}

@media (prefers-reduced-motion: reduce) {
  .glass-card--hoverable:hover {
    transform: none;
  }
}
</style>
