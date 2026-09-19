<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    content: string
    delay?: number
    disabled?: boolean
    label: string
    side?: 'bottom' | 'left' | 'right' | 'top'
  }>(),
  { delay: 250, disabled: false, side: 'top' },
)

const open = ref(false)
let openTimer: ReturnType<typeof setTimeout> | undefined

function show(immediate = false) {
  if (props.disabled) return
  clearTimeout(openTimer)
  if (immediate || props.delay === 0) open.value = true
  else openTimer = setTimeout(() => (open.value = true), props.delay)
}

function hide() {
  clearTimeout(openTimer)
  open.value = false
}
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <span
      class="tooltip"
      @focusin="show(true)"
      @focusout="hide"
      @mouseenter="show()"
      @mouseleave="hide"
      @keydown.esc="hide"
    >
      <TooltipRoot :open="open" :disabled="disabled">
        <TooltipTrigger class="tooltip__trigger">{{ label }}</TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            class="tooltip__content"
            :side="side"
            :side-offset="8"
          >
            {{ content }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </span>
  </TooltipProvider>
</template>

<style scoped>
.tooltip {
  position: relative;
  display: inline-flex;
}
.tooltip__trigger {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding-inline: var(--space-5);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-weight: var(--font-weight-semibold);
  cursor: help;
  transition:
    border-color var(--motion-duration-normal) var(--motion-ease-standard),
    background-color var(--motion-duration-normal) var(--motion-ease-standard);
}
@media (hover: hover) {
  .tooltip__trigger:hover {
    border-color: var(--glass-border-hover);
    background: var(--glass-bg-hover);
    color: var(--color-text);
  }
}
.tooltip__content {
  z-index: var(--z-toast);
  width: max-content;
  max-width: min(18rem, calc(100vw - 2rem));
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-small);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-card);
  color: var(--color-text);
  font-size: var(--text-small);
  line-height: 1.5;
  pointer-events: none;
  transform-origin: var(--reka-tooltip-content-transform-origin);
  animation: tooltip-enter var(--motion-duration-fast)
    var(--motion-ease-emphasized);
}
@keyframes tooltip-enter {
  from {
    opacity: 0;
  }
}
</style>
