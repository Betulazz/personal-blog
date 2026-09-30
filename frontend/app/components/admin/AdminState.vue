<script setup lang="ts">
import type { AdminSessionStatus } from '~/stores/adminSession'

const props = defineProps<{
  message?: string | null
  status: AdminSessionStatus
}>()

defineEmits<{ retry: [] }>()

const stateCopy = computed(() => {
  switch (props.status) {
    case 'refreshing':
      return {
        description: '正在用安全的刷新会话恢复后台访问。',
        title: '正在恢复后台会话',
      }
    case 'forbidden':
      return {
        description: props.message || '当前账号没有访问后台的权限。',
        title: '暂时无法访问后台',
      }
    case 'unavailable':
      return {
        description: props.message || '后台服务暂时无法响应，请稍后重试。',
        title: '后台服务暂时不可用',
      }
    case 'unauthenticated':
      return {
        description: '请先登录 Administrator 账号。',
        title: '正在返回登录页',
      }
    default:
      return {
        description: '正在确认当前后台会话，请稍候。',
        title: '正在加载后台',
      }
  }
})
</script>

<template>
  <section
    class="admin-state"
    :aria-busy="status === 'loading' || status === 'refreshing'"
    :data-state="status"
    :role="
      status === 'forbidden' || status === 'unavailable' ? 'alert' : 'status'
    "
  >
    <span class="admin-state__mark" aria-hidden="true" />
    <p class="admin-state__eyebrow">BIRCHTULA / EDITORIAL</p>
    <h1>{{ stateCopy.title }}</h1>
    <p>{{ stateCopy.description }}</p>
    <UiButton
      v-if="status === 'forbidden' || status === 'unavailable'"
      variant="secondary"
      @click="$emit('retry')"
    >
      重新尝试
    </UiButton>
    <a class="admin-state__public-link" href="/">返回公开站点</a>
  </section>
</template>

<style scoped>
.admin-state {
  position: relative;
  z-index: var(--z-base);
  display: grid;
  min-height: 100svh;
  place-content: center;
  justify-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
  background: var(--color-canvas);
  color: var(--color-text);
  text-align: center;
}

.admin-state__mark {
  width: 1rem;
  height: 1rem;
  margin-bottom: var(--space-4);
  background: var(--color-accent);
  transform: rotate(-8deg);
}

.admin-state__eyebrow {
  margin: 0;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  font-family: var(--font-mono);
}

.admin-state h1,
.admin-state p {
  max-width: 34rem;
  margin: 0;
}

.admin-state h1 {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 600;
  letter-spacing: -0.05em;
}

.admin-state > p:not(.admin-state__eyebrow) {
  color: var(--color-text-muted);
  line-height: 1.7;
}

.admin-state__public-link {
  color: var(--color-text-subtle);
  font-size: var(--text-small);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>
