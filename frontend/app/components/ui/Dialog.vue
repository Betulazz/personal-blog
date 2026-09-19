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
    title: string
  }>(),
  { open: false },
)

defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <DialogRoot :open="open" @update:open="$emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="overlay__backdrop" />
      <DialogContent class="overlay__content dialog__content">
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

.dialog__content {
  width: min(calc(100vw - 2rem), 34rem);
  max-height: calc(100svh - 2rem);
  border-radius: var(--radius-panel);
}
</style>
