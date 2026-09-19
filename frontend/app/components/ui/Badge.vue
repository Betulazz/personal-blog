<script setup lang="ts">
type BadgeElement = 'div' | 'span'
type BadgeTone = 'accent' | 'neutral' | 'success'

withDefaults(
  defineProps<{
    as?: BadgeElement
    tone?: BadgeTone
  }>(),
  {
    as: 'span',
    tone: 'neutral',
  },
)
</script>

<template>
  <component :is="as" class="badge" :data-tone="tone">
    <slot />
  </component>
</template>

<style scoped>
.badge {
  display: inline-flex;
  min-height: var(--space-6);
  align-items: center;
  width: fit-content;
  padding-inline: var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  font-family: var(--font-ui);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  overflow-wrap: anywhere;
}

.badge[data-tone='accent'] {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.badge[data-tone='success'] {
  border-color: var(--badge-success-border);
  background: var(--badge-success-bg);
  color: var(--color-success);
}
</style>
