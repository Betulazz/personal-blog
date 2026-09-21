<script setup lang="ts">
import AdminPostEditor from '~/components/admin/AdminPostEditor.vue'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const postId = computed(() => String(route.params.id))
</script>

<template>
  <AdminPostEditor :post-id="postId" />
</template>
