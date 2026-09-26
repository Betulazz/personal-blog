<script setup lang="ts">
import { MotionConfig } from 'motion-v'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { settings } = await usePublicSiteSettings()
</script>

<template>
  <MotionConfig reduced-motion="user">
    <NuxtRouteAnnouncer />
    <VisualAmbientBackground :gallery="settings.backgroundGallery" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </MotionConfig>
</template>
