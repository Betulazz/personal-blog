<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { BackgroundGalleryImage } from '~/types/site'

const props = withDefaults(
  defineProps<{ gallery?: BackgroundGalleryImage[] }>(),
  { gallery: () => [] },
)

const rotationIntervalMs = 10_000
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const pageVisible = ref(true)
const rotatorReady = ref(false)
const activeIndex = ref(0)
const activeUrl = ref(props.gallery[0]?.url ?? null)
const failedUrls = new Set<string>()
let rotationTimer: ReturnType<typeof setTimeout> | undefined
let mounted = false

const clearRotation = () => {
  if (rotationTimer !== undefined) clearTimeout(rotationTimer)
  rotationTimer = undefined
}

const preload = (url: string) =>
  new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Background image failed to load'))
    image.src = url
  })

const loadNextAvailable = async (startIndex: number) => {
  const gallery = props.gallery
  if (!gallery.length) {
    activeUrl.value = null
    return
  }
  for (let offset = 0; offset < gallery.length; offset += 1) {
    const index = (startIndex + offset) % gallery.length
    const image = gallery[index]
    if (!image?.url || failedUrls.has(image.url)) continue
    try {
      await preload(image.url)
    } catch {
      failedUrls.add(image.url)
      continue
    }
    if (!pageVisible.value || reducedMotion.value) return
    activeIndex.value = index
    activeUrl.value = image.url
    return
  }
  activeUrl.value = null
}

const rotate = async () => {
  clearRotation()
  if (
    !mounted ||
    reducedMotion.value ||
    !pageVisible.value ||
    props.gallery.length < 2 ||
    failedUrls.size >= props.gallery.length
  ) {
    return
  }
  await loadNextAvailable((activeIndex.value + 1) % props.gallery.length)
  scheduleRotation()
}

function scheduleRotation() {
  clearRotation()
  if (
    !mounted ||
    reducedMotion.value ||
    !pageVisible.value ||
    props.gallery.length < 2 ||
    failedUrls.size >= props.gallery.length
  ) {
    return
  }
  rotationTimer = setTimeout(() => void rotate(), rotationIntervalMs)
}

const handleImageError = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement
  const failedUrl = image.getAttribute('src')
  const activeImage = props.gallery[activeIndex.value]
  if (
    !activeImage ||
    failedUrl !== activeImage.url ||
    failedUrls.has(activeImage.url)
  ) {
    return
  }
  markImageFailed(activeImage.url)
}

const markImageFailed = (url: string) => {
  if (failedUrls.has(url)) return
  failedUrls.add(url)
  activeUrl.value = null
  if (reducedMotion.value || !props.gallery.length) return
  void loadNextAvailable((activeIndex.value + 1) % props.gallery.length).then(
    scheduleRotation,
  )
}

const updateVisibility = () => {
  pageVisible.value = document.visibilityState !== 'hidden'
  if (
    pageVisible.value &&
    !activeUrl.value &&
    !reducedMotion.value &&
    props.gallery.length
  ) {
    void loadNextAvailable((activeIndex.value + 1) % props.gallery.length).then(
      scheduleRotation,
    )
    return
  }
  scheduleRotation()
}

watch(
  () => props.gallery,
  (gallery) => {
    clearRotation()
    failedUrls.clear()
    activeIndex.value = 0
    activeUrl.value = gallery[0]?.url ?? null
    if (mounted && activeUrl.value && reducedMotion.value) {
      // The first configured image remains the reduced-motion presentation.
      return
    }
    scheduleRotation()
  },
  { deep: true },
)

watch(reducedMotion, (isReduced) => {
  clearRotation()
  if (isReduced) {
    const first = props.gallery[0]
    if (first && !failedUrls.has(first.url)) {
      activeIndex.value = 0
      activeUrl.value = first.url
    } else {
      activeUrl.value = null
    }
    return
  }
  if (!activeUrl.value && props.gallery.length) {
    void loadNextAvailable((activeIndex.value + 1) % props.gallery.length).then(
      scheduleRotation,
    )
    return
  }
  scheduleRotation()
})

onMounted(() => {
  mounted = true
  rotatorReady.value = true
  pageVisible.value = document.visibilityState !== 'hidden'
  document.addEventListener('visibilitychange', updateVisibility)
  scheduleRotation()
  void nextTick(() => {
    const image = document.querySelector<HTMLImageElement>(
      '[data-testid="background-gallery-image"]',
    )
    const activeImage = props.gallery[activeIndex.value]
    if (
      image?.complete &&
      image.naturalWidth === 0 &&
      activeImage &&
      image.getAttribute('src') === activeImage.url
    ) {
      markImageFailed(activeImage.url)
    }
  })
})

onBeforeUnmount(() => {
  mounted = false
  clearRotation()
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>

<template>
  <UiBackgroundLayer
    class="ambient-background"
    :data-rotator-ready="rotatorReady ? 'true' : 'false'"
  >
    <template #media>
      <div
        class="ambient-background__fallback"
        data-testid="background-gallery-fallback"
      >
        <VisualResponsiveBackgroundMedia
          class="ambient-background__media"
          sizes="100vw"
          eager
        />
      </div>
      <Transition name="background-crossfade">
        <img
          v-if="activeUrl"
          :key="activeUrl"
          class="ambient-background__gallery-image"
          data-testid="background-gallery-image"
          :src="activeUrl"
          alt=""
          aria-hidden="true"
          @error="handleImageError"
        />
      </Transition>
    </template>
    <UiGlowLayer
      class="ambient-background__glow"
      tone="accent"
      position="top-end"
    />
    <UiGlowLayer
      class="ambient-background__glow"
      tone="secondary"
      position="bottom-start"
    />
    <VisualFireflyLayer />
  </UiBackgroundLayer>
</template>

<style scoped>
.ambient-background__media,
.ambient-background__fallback,
.ambient-background__media :deep(.responsive-background-media__image) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ambient-background__gallery-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 45% center;
  filter: blur(0.375rem) saturate(0.8) contrast(0.95);
  transform: scale(1.03);
}

.background-crossfade-enter-active,
.background-crossfade-leave-active {
  transition: opacity var(--motion-duration-background-crossfade) ease-in-out;
}

.background-crossfade-enter-from,
.background-crossfade-leave-to {
  opacity: 0;
}

.background-crossfade-leave-active {
  position: absolute;
  inset: 0;
}

.ambient-background__media :deep(.responsive-background-media__image) {
  object-fit: cover;
  object-position: 45% center;
  filter: blur(0.375rem) saturate(0.8) contrast(0.95);
  transform: scale(1.03);
}

@media (width <= 48rem) {
  .ambient-background__media :deep(.responsive-background-media__image) {
    object-position: 37% center;
    filter: blur(0.25rem) saturate(0.76) contrast(0.95);
    transform: scale(1.02);
  }

  .ambient-background__gallery-image {
    object-position: 37% center;
    filter: blur(0.25rem) saturate(0.76) contrast(0.95);
    transform: scale(1.02);
  }

  .ambient-background__glow {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .background-crossfade-enter-active,
  .background-crossfade-leave-active {
    transition: none;
  }

  .ambient-background__glow {
    display: none;
  }
}
</style>
