<script setup lang="ts">
import { MotionConfig } from 'motion-v'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { settings } = await usePublicSiteSettings()

useHead(() => ({
  link: settings.value.faviconUrl
    ? [{ href: settings.value.faviconUrl, rel: 'icon' }]
    : [],
}))
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
