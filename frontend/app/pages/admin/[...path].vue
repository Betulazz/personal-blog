<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const section = computed(() => {
  const value = route.params.path
  return Array.isArray(value) ? value.at(-1) || '工作区' : value || '工作区'
})

const labels: Record<string, string> = {
  chatter: 'Chatter',
  friends: '友链',
  media: '媒体',
  moments: 'Moment',
  posts: '文章',
  projects: '项目',
  settings: '网站设置',
}

const title = computed(() => labels[section.value] || '工作区')

useHead(() => ({ title: `${title.value} · 后台空间` }))
</script>

<template>
  <UiGlassPanel class="admin-placeholder" tone="subtle" padding="spacious">
    <p class="admin-placeholder__eyebrow">Coming next</p>
    <h1>{{ title }}</h1>
    <p>这个工作区会在后续管理任务中接入，当前先保留清晰的导航与返回路径。</p>
    <NuxtLink class="admin-placeholder__back" to="/admin">
      返回 Dashboard
    </NuxtLink>
  </UiGlassPanel>
</template>

<style scoped>
.admin-placeholder {
  display: grid;
  max-width: 48rem;
  gap: var(--space-4);
  margin-block: var(--space-6);
}

.admin-placeholder h1,
.admin-placeholder p {
  margin: 0;
}

.admin-placeholder h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
}

.admin-placeholder > p:not(.admin-placeholder__eyebrow) {
  color: var(--color-text-muted);
  line-height: 1.7;
}

.admin-placeholder__eyebrow {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-placeholder__back {
  width: fit-content;
  color: var(--color-accent-soft);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>
