<script setup lang="ts">
type PanelElement = 'aside' | 'div' | 'header' | 'section'
type PanelPadding = 'compact' | 'default' | 'none' | 'spacious'
type PanelTone = 'elevated' | 'panel' | 'subtle'

withDefaults(
  defineProps<{
    ariaLabel?: string
    as?: PanelElement
    padding?: PanelPadding
    tone?: PanelTone
  }>(),
  {
    ariaLabel: undefined,
    as: 'div',
    padding: 'default',
    tone: 'panel',
  },
)
</script>

<template>
  <component
    :is="as"
    class="glass-panel"
    :data-padding="padding"
    :data-tone="tone"
    :aria-label="ariaLabel"
  >
    <slot />
  </component>
</template>

<style scoped>
.glass-panel {
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-panel))
    saturate(var(--glass-saturation));
}

.glass-panel[data-tone='subtle'] {
  background: var(--glass-subtle-bg);
  backdrop-filter: blur(var(--glass-blur-subtle))
    saturate(var(--glass-saturation));
}

.glass-panel[data-tone='panel'] {
  background: var(--glass-panel-bg);
}

.glass-panel[data-tone='elevated'] {
  background: var(--glass-elevated-bg);
}

.glass-panel[data-padding='compact'] {
  padding: var(--space-4);
}

.glass-panel[data-padding='default'] {
  padding: var(--space-6);
}

.glass-panel[data-padding='spacious'] {
  padding: var(--space-10);
}

.glass-panel[data-padding='none'] {
  padding: 0;
}
</style>
