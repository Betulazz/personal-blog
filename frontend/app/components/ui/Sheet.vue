<script setup lang="ts">
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

withDefaults(
  defineProps<{
    description: string
    open?: boolean
    side?: 'left' | 'right'
    title: string
  }>(),
  { open: false, side: 'right' },
)

defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <DialogRoot :open="open" @update:open="$emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="overlay__backdrop" />
      <DialogContent class="overlay__content sheet__content" :data-side="side">
        <DialogClose class="overlay__close" :aria-label="`关闭${title}`">
          <X :size="18" aria-hidden="true" />
        </DialogClose>
        <header class="overlay__header">
          <DialogTitle class="overlay__title">{{ title }}</DialogTitle>
          <DialogDescription class="overlay__description">
            {{ description }}
          </DialogDescription>
        </header>
        <div class="overlay__body"><slot /></div>
        <footer v-if="$slots.footer" class="overlay__footer">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@import './overlay.css';

.sheet__content {
  top: 0;
  right: 0;
  bottom: 0;
  left: auto;
  width: min(28rem, calc(100vw - 1rem));
  max-width: 100%;
  border-block: 0;
  border-right: 0;
  border-radius: var(--radius-panel) 0 0 var(--radius-panel);
  transform: none;
  animation-name: sheet-enter-right;
}

.sheet__content[data-side='left'] {
  right: auto;
  left: 0;
  border-right: var(--border-hairline) solid var(--glass-border-hover);
  border-left: 0;
  border-radius: 0 var(--radius-panel) var(--radius-panel) 0;
  animation-name: sheet-enter-left;
}

@keyframes sheet-enter-right {
  from {
    opacity: 0;
    transform: translateX(2rem);
  }
}

@keyframes sheet-enter-left {
  from {
    opacity: 0;
    transform: translateX(-2rem);
  }
}

@media (width <= 26.875rem) {
  .sheet__content {
    width: calc(100vw - 0.5rem);
  }
}
</style>
