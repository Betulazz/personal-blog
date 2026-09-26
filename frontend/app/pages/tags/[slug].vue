<script setup lang="ts">
import { buildPostQuery, buildPostRouteQuery } from '~/utils/post-discovery'
const route = useRoute()
await navigateTo(
  {
    path: '/posts',
    query: buildPostRouteQuery(
      buildPostQuery(route.query, { tagSlug: String(route.params.slug) }),
    ),
  },
  { redirectCode: 301, replace: true },
)
</script>
<template><span /></template>
