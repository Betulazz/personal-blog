<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type Ripple = {
  id: number
  x: number
  y: number
}

type PointerGesture = {
  startX: number
  startY: number
  moved: boolean
}

const maxConcurrentRipples = 8
const rippleLifetimeMs = 620
const pointerMoveThreshold = 6

const ripples = ref<Ripple[]>([])
const isReducedMotion = ref(true)
const timers = new Map<number, number>()
let nextRippleId = 0
let motionPreference: MediaQueryList | null = null
let listensForClicks = false
let activePointerGesture: PointerGesture | null = null

const removeRipple = (id: number) => {
  const timer = timers.get(id)
  if (timer !== undefined) window.clearTimeout(timer)
  timers.delete(id)
  ripples.value = ripples.value.filter((ripple) => ripple.id !== id)
}

const clearRipples = () => {
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
  ripples.value = []
}

const handlePointerDown = (event: PointerEvent) => {
  activePointerGesture =
    event.isTrusted && event.button === 0
      ? { startX: event.clientX, startY: event.clientY, moved: false }
      : null
}

const handlePointerMove = (event: PointerEvent) => {
  if (!activePointerGesture || event.buttons === 0) return

  const deltaX = event.clientX - activePointerGesture.startX
  const deltaY = event.clientY - activePointerGesture.startY
  if (deltaX ** 2 + deltaY ** 2 > pointerMoveThreshold ** 2) {
    activePointerGesture.moved = true
  }
}

const handlePointerClick = (event: MouseEvent) => {
  const pointerGesture = activePointerGesture
  activePointerGesture = null

  // Keyboard activation and synthetic clicks have no trusted pointer input.
  if (
    !event.isTrusted ||
    event.detail === 0 ||
    event.button !== 0 ||
    pointerGesture?.moved ||
    !Number.isFinite(event.clientX) ||
    !Number.isFinite(event.clientY)
  ) {
    return
  }

  const id = nextRippleId++
  ripples.value.push({ id, x: event.clientX, y: event.clientY })

  if (ripples.value.length > maxConcurrentRipples) {
    const expiredRipples = ripples.value.splice(
      0,
      ripples.value.length - maxConcurrentRipples,
    )

    for (const ripple of expiredRipples) {
      const timer = timers.get(ripple.id)
      if (timer !== undefined) window.clearTimeout(timer)
      timers.delete(ripple.id)
    }
  }

  timers.set(
    id,
    window.setTimeout(() => removeRipple(id), rippleLifetimeMs),
  )
}

const syncMotionPreference = () => {
  const reduced = motionPreference?.matches ?? true
  isReducedMotion.value = reduced

  if (reduced) {
    if (listensForClicks) {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointermove', handlePointerMove, true)
      document.removeEventListener('click', handlePointerClick, true)
      listensForClicks = false
    }
    activePointerGesture = null
    clearRipples()
    return
  }

  if (!listensForClicks) {
    // A single delegated listener keeps working as Nuxt changes public routes.
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointermove', handlePointerMove, true)
    document.addEventListener('click', handlePointerClick, true)
    listensForClicks = true
  }
}

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', syncMotionPreference)
  syncMotionPreference()
})

onBeforeUnmount(() => {
  motionPreference?.removeEventListener('change', syncMotionPreference)
  if (listensForClicks) {
    document.removeEventListener('pointerdown', handlePointerDown, true)
    document.removeEventListener('pointermove', handlePointerMove, true)
    document.removeEventListener('click', handlePointerClick, true)
  }
  activePointerGesture = null
  clearRipples()
})
</script>

<template>
  <div
    v-if="!isReducedMotion"
    class="public-click-ripple-layer"
    data-testid="public-click-ripple-layer"
    aria-hidden="true"
  >
    <span
      v-for="ripple in ripples"
      :key="ripple.id"
      class="public-click-ripple"
      data-testid="public-click-ripple"
      :style="{ left: `${ripple.x}px`, top: `${ripple.y}px` }"
    />
  </div>
</template>

<style scoped>
.public-click-ripple-layer {
  position: fixed;
  z-index: calc(var(--z-overlay) - 1);
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

.public-click-ripple {
  position: absolute;
  display: block;
  width: 120px;
  height: 120px;
  border: 1.5px solid rgb(204 57 45 / 48%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgb(204 57 45 / 25%) 0 2px,
    rgb(204 57 45 / 9%) 2px 24px,
    transparent 70%
  );
  box-shadow: none;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0.08);
  animation: public-click-ripple var(--motion-duration-ripple)
    cubic-bezier(0.18, 0.65, 0.3, 1) forwards;
  will-change: transform, opacity;
}

@keyframes public-click-ripple {
  0% {
    opacity: 0.76;
    transform: translate(-50%, -50%) scale(0.08);
  }

  64% {
    opacity: 0.42;
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .public-click-ripple-layer {
    display: none;
  }
}
</style>
