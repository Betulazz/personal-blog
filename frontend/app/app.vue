<script setup lang="ts">
import { MotionConfig } from 'motion-v'
</script>

<template>
  <MotionConfig reduced-motion="user">
    <NuxtRouteAnnouncer />
    <VisualAmbientBackground />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </MotionConfig>
</template>
