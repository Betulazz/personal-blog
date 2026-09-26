<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { getFireflyCount } from '~/utils/fireflies'

type Firefly = {
  x: number
  y: number
  driftX: number
  driftY: number
  radius: number
  phase: number
  pulseSpeed: number
  color: string
}

const canvas = ref<HTMLCanvasElement | null>(null)
const isEnabled = ref(false)

const colors = ['244, 240, 176', '172, 223, 255', '205, 187, 255']
const frameInterval = 1000 / 30
let reducedMotionQuery: MediaQueryList | undefined
let pageObserver: MutationObserver | undefined
let effectObserver: MutationObserver | undefined
let animationFrame = 0
let lastFrame = 0
let lastDraw = 0
let width = 0
let height = 0
let context: CanvasRenderingContext2D | null = null
let fireflies: Firefly[] = []

function createFireflies() {
  fireflies = Array.from(
    { length: getFireflyCount(width, height) },
    (): Firefly => ({
      x: Math.random() * width,
      y: Math.random() * height,
      driftX: (Math.random() - 0.5) * 9,
      driftY: (Math.random() - 0.5) * 7,
      radius: 1 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.001 + Math.random() * 0.001,
      color: colors[Math.floor(Math.random() * colors.length)]!,
    }),
  )
}

function resizeCanvas() {
  const element = canvas.value
  if (!element) return

  width = window.innerWidth
  height = window.innerHeight
  const scale = Math.min(window.devicePixelRatio || 1, 1.25)
  element.width = Math.round(width * scale)
  element.height = Math.round(height * scale)
  context = element.getContext('2d', { alpha: true })
  context?.setTransform(scale, 0, 0, scale, 0, 0)
  createFireflies()
  element.dataset.fireflyCount = String(fireflies.length)
}

function observeEffectPause() {
  effectObserver?.disconnect()
  effectObserver = undefined
  if (!canvas.value) return

  effectObserver = new MutationObserver(updateVisibility)
  effectObserver.observe(canvas.value, {
    attributes: true,
    attributeFilter: ['data-effect-paused'],
  })
}

function isPaused() {
  return (
    document.hidden ||
    document.documentElement.hasAttribute('data-page-hidden') ||
    canvas.value?.getAttribute('data-effect-paused') === 'true'
  )
}

function stopAnimation() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
  lastFrame = 0
  lastDraw = 0
}

function draw(now: number) {
  animationFrame = 0
  if (!isEnabled.value || isPaused() || !context) return

  if (now - lastDraw >= frameInterval || lastDraw === 0) {
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0
    lastFrame = now
    lastDraw = now
    context.clearRect(0, 0, width, height)

    for (const firefly of fireflies) {
      firefly.x += firefly.driftX * delta
      firefly.y += firefly.driftY * delta
      if (firefly.x < -12) firefly.x = width + 12
      if (firefly.x > width + 12) firefly.x = -12
      if (firefly.y < -12) firefly.y = height + 12
      if (firefly.y > height + 12) firefly.y = -12

      const pulse =
        0.48 + (Math.sin(now * firefly.pulseSpeed + firefly.phase) + 1) * 0.2
      context.fillStyle = `rgba(${firefly.color}, ${pulse * 0.12})`
      context.beginPath()
      context.arc(firefly.x, firefly.y, firefly.radius * 5, 0, Math.PI * 2)
      context.fill()

      context.fillStyle = `rgba(${firefly.color}, ${pulse})`
      context.beginPath()
      context.arc(firefly.x, firefly.y, firefly.radius, 0, Math.PI * 2)
      context.fill()
    }
  }

  animationFrame = window.requestAnimationFrame(draw)
}

function startAnimation() {
  if (!isEnabled.value || isPaused() || animationFrame || !context) return
  animationFrame = window.requestAnimationFrame(draw)
}

function updateVisibility() {
  if (isPaused()) {
    stopAnimation()
    return
  }
  startAnimation()
}

async function updateMotionPreference() {
  if (reducedMotionQuery?.matches) {
    stopAnimation()
    effectObserver?.disconnect()
    effectObserver = undefined
    context = null
    fireflies = []
    isEnabled.value = false
    return
  }

  isEnabled.value = true
  await nextTick()
  observeEffectPause()
  resizeCanvas()
  updateVisibility()
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', updateMotionPreference)
  window.addEventListener('resize', resizeCanvas, { passive: true })
  document.addEventListener('visibilitychange', updateVisibility)

  pageObserver = new MutationObserver(updateVisibility)
  pageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-page-hidden'],
  })

  void updateMotionPreference()
})

onBeforeUnmount(() => {
  stopAnimation()
  reducedMotionQuery?.removeEventListener('change', updateMotionPreference)
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('visibilitychange', updateVisibility)
  pageObserver?.disconnect()
  effectObserver?.disconnect()
})
</script>

<template>
  <canvas
    v-if="isEnabled"
    ref="canvas"
    class="firefly-layer"
    data-continuous-effect
    aria-hidden="true"
  />
</template>

<style scoped>
.firefly-layer {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.72;
  pointer-events: none;
  mix-blend-mode: screen;
}
</style>
