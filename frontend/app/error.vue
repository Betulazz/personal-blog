<script setup lang="ts">
import type { NuxtError } from '#app'

import PublicErrorPage from './components/public/PublicErrorPage.vue'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error?.statusCode ?? 500)
</script>

<template>
  <main id="main-content" class="public-error-main" tabindex="-1">
    <PublicErrorPage :status-code="statusCode" />
  </main>
</template>
