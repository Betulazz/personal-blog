<script setup lang="ts">
defineOptions({ inheritAttrs: false })

type ButtonSize = 'icon' | 'large' | 'medium' | 'small'
type ButtonVariant = 'danger' | 'ghost' | 'primary' | 'secondary'

withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
    size?: ButtonSize
    type?: 'button' | 'reset' | 'submit'
    variant?: ButtonVariant
  }>(),
  {
    disabled: false,
    loading: false,
    size: 'medium',
    type: 'button',
    variant: 'primary',
  },
)

const emit = defineEmits<{
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()
</script>

<template>
  <button
    v-bind="$attrs"
    class="button"
    :data-size="size"
    :data-variant="variant"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :type="type"
    @blur="emit('blur', $event)"
    @focus="emit('focus', $event)"
  >
    <span v-if="loading" class="button__spinner" aria-hidden="true" />
    <span class="button__content"><slot /></span>
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  min-width: 0;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding-inline: var(--space-5);
  border: var(--border-hairline) solid transparent;
  border-radius: var(--radius-medium);
  color: var(--color-text);
  font: inherit;
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  cursor: pointer;
  transition:
    transform var(--motion-duration-fast) var(--motion-ease-emphasized),
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard),
    box-shadow var(--motion-duration-normal) var(--motion-ease-standard);
}

.button[data-size='small'] {
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  font-size: var(--text-small);
}

.button[data-size='large'] {
  min-height: 3.25rem;
  padding-inline: var(--space-6);
}

.button[data-size='icon'] {
  width: 2.75rem;
  padding: 0;
}

.button[data-variant='primary'] {
  background: linear-gradient(
    135deg,
    var(--color-accent-strong),
    var(--color-accent)
  );
  box-shadow: 0 0.75rem 2rem rgb(95 109 243 / 24%);
}

.button[data-variant='secondary'] {
  border-color: var(--glass-border-hover);
  background: var(--glass-card-bg);
}

.button[data-variant='ghost'] {
  border-color: var(--glass-border);
  background: transparent;
  color: var(--color-text-muted);
}

.button[data-variant='danger'] {
  border-color: rgb(251 113 133 / 42%);
  background: rgb(159 18 57 / 52%);
}

@media (hover: hover) {
  .button:not(:disabled):hover {
    border-color: var(--glass-border-hover);
    background-color: var(--glass-bg-hover);
    box-shadow: var(--shadow-glow);
    transform: translateY(calc(var(--motion-distance-small) * -1));
  }
}

.button:active:not(:disabled) {
  transform: translateY(0);
}

.button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.button__content {
  overflow-wrap: anywhere;
}

.button__spinner {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  border: 0.125rem solid currentcolor;
  border-right-color: transparent;
  border-radius: var(--radius-round);
  animation: button-spin var(--motion-duration-slow) linear infinite;
}

@keyframes button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .button:not(:disabled):hover,
  .button:active:not(:disabled) {
    transform: none;
  }

  .button__spinner {
    animation: none;
    border-right-color: currentcolor;
  }
}
</style>
