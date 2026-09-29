<script setup lang="ts">
import {
  AtSign,
  Github,
  Globe2,
  Instagram,
  Linkedin,
  Send,
  Youtube,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import type { Component } from 'vue'

import type { SiteSocialIcon as SiteSocialIconChoice } from '~/types/site'

const props = withDefaults(
  defineProps<{
    icon?: SiteSocialIconChoice | null
    size?: number
  }>(),
  { icon: null, size: 16 },
)

const presetIcons: Record<string, Component> = {
  github: Github,
  instagram: Instagram,
  linkedin: Linkedin,
  mastodon: AtSign,
  telegram: Send,
  website: Globe2,
  youtube: Youtube,
}

const imageUrl = computed(() =>
  props.icon?.type === 'media' ? props.icon.url : '',
)
const imageUnavailable = ref(false)
const isXPreset = computed(
  () => props.icon?.type === 'preset' && props.icon.preset === 'x',
)
const fallbackIcon = computed(() =>
  props.icon?.type === 'preset'
    ? (presetIcons[props.icon.preset] ?? Globe2)
    : Globe2,
)

watch(imageUrl, () => {
  imageUnavailable.value = false
})
</script>

<template>
  <img
    v-if="imageUrl && !imageUnavailable"
    class="site-social-icon"
    :src="imageUrl"
    :width="size"
    :height="size"
    alt=""
    aria-hidden="true"
    loading="lazy"
    decoding="async"
    @error="imageUnavailable = true"
  />
  <svg
    v-else-if="isXPreset"
    class="site-social-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      d="M18.9 2H22l-6.8 7.8L23.2 22h-6.2l-4.9-7.2L5.8 22H2.7l7.3-8.4L1.4 2h6.4l4.4 6.6L18.9 2Zm-1.1 18h1.7L6.7 3.9H4.9L17.8 20Z"
    />
  </svg>
  <component
    :is="fallbackIcon"
    v-else
    class="site-social-icon"
    :size="size"
    aria-hidden="true"
  />
</template>

<style scoped>
.site-social-icon {
  display: block;
  flex: none;
  object-fit: contain;
}
</style>
