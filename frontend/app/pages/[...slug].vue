<script setup lang="ts">
setResponseStatus(404, 'Not Found')

useSeoMeta({
  title: '页面未找到 · 夜航手记',
  description: '这个地址没有找到，返回首页继续浏览。',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <PublicErrorPage :status-code="404" />
</template>
