<script setup lang="ts">
import { MoreHorizontal } from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'

import Button from './Button.vue'

export interface DropdownItem {
  disabled?: boolean
  label: string
  tone?: 'danger' | 'neutral'
  value: string
}

withDefaults(
  defineProps<{
    items: DropdownItem[]
    label: string
  }>(),
  {},
)

const emit = defineEmits<{ select: [value: string] }>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" :aria-label="label">
        <span>{{ label }}</span>
        <MoreHorizontal :size="18" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="dropdown__content"
        :side-offset="8"
        align="end"
      >
        <DropdownMenuItem
          v-for="item in items"
          :key="item.value"
          class="dropdown__item"
          :data-tone="item.tone ?? 'neutral'"
          :disabled="item.disabled"
          @select="emit('select', item.value)"
        >
          {{ item.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style scoped>
.dropdown__content {
  z-index: var(--z-overlay);
  min-width: 12rem;
  padding: var(--space-2);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-panel), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-panel));
  transform-origin: var(--reka-dropdown-menu-content-transform-origin);
  animation: dropdown-enter var(--motion-duration-normal)
    var(--motion-ease-emphasized);
}

.dropdown__item {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-3);
  border-radius: var(--radius-small);
  color: var(--color-text-muted);
  outline: none;
  cursor: pointer;
}

.dropdown__item[data-highlighted] {
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.dropdown__item[data-tone='danger'] {
  color: var(--color-danger);
}
.dropdown__item[data-disabled] {
  opacity: 0.45;
  cursor: not-allowed;
}

@keyframes dropdown-enter {
  from {
    opacity: 0;
    transform: translateY(calc(var(--motion-distance-small) * -1));
  }
}
</style>
