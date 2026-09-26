<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { getFireflyCount } from '~/utils/fireflies'

type Firefly = {
  x: number
  y: number
  size: number
  breatheDuration: number
  breatheOffset: number
  floatDuration: number
  floatOffset: number
  path: number
}

const canvas = ref<HTMLCanvasElement | null>(null)
const isEnabled = ref(false)

const frameInterval = 1000 / 30
const floatPaths = [
  [
    [0, 0],
    [0.1, -0.15],
    [-0.05, -0.2],
    [0, 0],
  ],
  [
    [0, 0],
    [-0.12, 0.1],
    [0.08, 0.15],
    [0, 0],
  ],
  [
    [0, 0],
    [0.15, 0.15],
    [-0.1, 0.05],
    [0, 0],
  ],
  [
    [0, 0],
    [-0.15, -0.1],
    [0.1, -0.15],
    [0, 0],
  ],
] as const
let reducedMotionQuery: MediaQueryList | undefined
let pageObserver: MutationObserver | undefined
let effectObserver: MutationObserver | undefined
let animationFrame = 0
let lastDraw = 0
let width = 0
let height = 0
let context: CanvasRenderingContext2D | null = null
let fireflies: Firefly[] = []
let glowSprite: HTMLCanvasElement | null = null

function createGlowSprite() {
  const sprite = document.createElement('canvas')
  sprite.width = 96
  sprite.height = 96
  const spriteContext = sprite.getContext('2d')
  if (!spriteContext) return sprite

  const glow = spriteContext.createRadialGradient(48, 48, 0, 48, 48, 48)
  glow.addColorStop(0, 'rgba(200, 255, 200, 0.9)')
  glow.addColorStop(0.07, 'rgba(100, 255, 150, 0.8)')
  glow.addColorStop(0.2, 'rgba(100, 255, 150, 0.5)')
  glow.addColorStop(0.43, 'rgba(50, 255, 100, 0.18)')
  glow.addColorStop(1, 'rgba(50, 255, 100, 0)')
  spriteContext.fillStyle = glow
  spriteContext.fillRect(0, 0, 96, 96)
  return sprite
}

function getFloatOffset(firefly: Firefly, seconds: number) {
  const progress = ((seconds + firefly.floatOffset) / firefly.floatDuration) % 1
  const segment = Math.min(Math.floor(progress * 3), 2)
  const segmentProgress = progress * 3 - segment
  const eased = (1 - Math.cos(segmentProgress * Math.PI)) / 2
  const points = floatPaths[firefly.path]!
  const from = points[segment]!
  const to = points[segment + 1]!
  return [
    (from[0] + (to[0] - from[0]) * eased) * width,
    (from[1] + (to[1] - from[1]) * eased) * height,
  ] as const
}

function createFireflies() {
  fireflies = Array.from(
    { length: getFireflyCount(width, height) },
    (): Firefly => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 3 + Math.random() * 4,
      breatheDuration: 3 + Math.random() * 5,
      breatheOffset: Math.random() * 10,
      floatDuration: 15 + Math.random() * 20,
      floatOffset: Math.random() * 20,
      path: Math.floor(Math.random() * floatPaths.length),
    }),
  )
}

function resizeCanvas() {
  const element = canvas.value
  if (!element) return

  width = window.innerWidth
  height = window.innerHeight
  const scale = Math.min(window.devicePixelRatio || 1, 1.5)
  element.width = Math.round(width * scale)
  element.height = Math.round(height * scale)
  context = element.getContext('2d', { alpha: true })
  context?.setTransform(scale, 0, 0, scale, 0, 0)
  glowSprite ??= createGlowSprite()
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
  lastDraw = 0
}

function draw(now: number) {
  animationFrame = 0
  if (!isEnabled.value || isPaused() || !context || !glowSprite) return

  if (now - lastDraw >= frameInterval || lastDraw === 0) {
    lastDraw = now
    context.clearRect(0, 0, width, height)
    const seconds = now / 1000

    for (const firefly of fireflies) {
      const cycle = (seconds + firefly.breatheOffset) / firefly.breatheDuration
      const pulse = (1 - Math.cos(cycle * Math.PI * 2)) / 2
      const scale = 0.3 + pulse * 0.9
      const [offsetX, offsetY] = getFloatOffset(firefly, seconds)
      const x = firefly.x + offsetX
      const y = firefly.y + offsetY
      const glowSize = firefly.size * 6.5 * scale
      context.globalAlpha = pulse
      context.drawImage(
        glowSprite,
        x - glowSize / 2,
        y - glowSize / 2,
        glowSize,
        glowSize,
      )
      context.fillStyle = 'rgba(200, 255, 200, 0.9)'
      context.beginPath()
      context.arc(x, y, (firefly.size * scale) / 2, 0, Math.PI * 2)
      context.fill()
    }
    context.globalAlpha = 1
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
  if (reducedMotionQuery?.matches || window.innerWidth < 768) {
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
  window.addEventListener('resize', updateMotionPreference, { passive: true })
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
  window.removeEventListener('resize', updateMotionPreference)
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
  pointer-events: none;
  mix-blend-mode: screen;
}
</style>
