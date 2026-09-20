<script setup lang="ts">
import { motion } from 'motion-v'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { motionTransitions } from '~/config/motion'
import { useMotionPreference } from '~/composables/useMotionPreference'

const revealTarget = ref<HTMLElement | null>(null)
const revealed = ref(false)
const motionEnabled = useMotionPreference({ disableOnMobile: true })
let revealObserver: IntersectionObserver | undefined

function reveal() {
  revealed.value = true
  if (revealTarget.value) {
    revealObserver?.unobserve(revealTarget.value)
  }
}

const setupRevealObserver = async () => {
  await nextTick()

  const target = revealTarget.value
  if (!target) {
    return
  }

  revealObserver?.disconnect()
  revealObserver = undefined

  if (!motionEnabled.value) {
    reveal()
    return
  }

  if (!('IntersectionObserver' in window)) {
    reveal()
    return
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        reveal()
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  )
  revealObserver.observe(target)
}

onMounted(setupRevealObserver)

watch(motionEnabled, () => {
  void setupRevealObserver()
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
})
</script>

<template>
  <component
    :is="motionEnabled ? motion.div : 'div'"
    class="home-reveal__motion"
    :initial="motionEnabled ? { y: 8 } : undefined"
    :animate="motionEnabled ? (revealed ? { y: 0 } : { y: 8 }) : undefined"
    :transition="motionEnabled ? motionTransitions.entry : undefined"
  >
    <div
      ref="revealTarget"
      class="home-reveal"
      data-homepage-section
      :data-revealed="revealed ? 'true' : undefined"
    >
      <slot />
    </div>
  </component>
</template>

<style scoped>
.home-reveal {
  min-width: 0;
}

.home-reveal__motion {
  min-width: 0;
}
</style>
