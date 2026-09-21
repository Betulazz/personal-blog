<script setup lang="ts">
definePageMeta({ layout: 'admin', key: (route) => route.fullPath })

const route = useRoute()
</script>

<template><AdminFriendEditor :id="String(route.params.id)" /></template>
