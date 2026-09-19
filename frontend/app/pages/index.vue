<script setup lang="ts">
import { siteIdentity } from '~/config/siteIdentity'

useSeoMeta({
  title: siteIdentity.name,
  description: siteIdentity.description,
})
</script>

<template>
  <VisualFoundationPage />
</template>
