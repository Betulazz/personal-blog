<script setup lang="ts">
import { motion } from 'motion-v'
import { motionTransitions } from '~/config/motion'
import { useHomepageContent } from '~/composables/useHomepageContent'
import { useMotionPreference } from '~/composables/useMotionPreference'

const motionEnabled = useMotionPreference({ disableOnMobile: true })
const { content, retry } = await useHomepageContent()
</script>

<template>
  <div class="foundation-page" data-homepage>
    <component
      :is="motionEnabled ? motion.div : 'div'"
      class="foundation-page__hero"
      :initial="motionEnabled ? { y: 8 } : false"
      :animate="{ y: 0 }"
      :transition="motionTransitions.entry"
    >
      <VisualFoundationHero :stats="content.stats" />
    </component>
    <component
      :is="motionEnabled ? motion.div : 'div'"
      class="foundation-page__content"
      :initial="motionEnabled ? { y: 8 } : false"
      :animate="{ y: 0 }"
      :transition="motionTransitions.entryStagger"
    >
      <HomeContent :content="content" :retry="retry" />
    </component>
  </div>
</template>

<style scoped>
.foundation-page {
  position: relative;
  isolation: isolate;
}

.foundation-page__hero,
.foundation-page__content {
  min-width: 0;
}
</style>
