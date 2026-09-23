<script setup lang="ts">
type PublicPageStatus = 'empty' | 'error' | 'loading' | 'offline' | 'ready'

const props = withDefaults(
  defineProps<{
    errorMessage?: string
    label: string
    recoveryHref: string
    status: PublicPageStatus
  }>(),
  {
    errorMessage: '内容服务暂时没有响应，请稍后再试。',
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div
    v-if="props.status === 'loading'"
    class="public-page-state public-page-state--loading"
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <span>正在加载{{ props.label }}…</span>
    <div
      class="public-page-state__skeleton"
      data-continuous-effect
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </div>
  </div>

  <div
    v-else-if="props.status === 'empty'"
    class="public-page-state"
    role="status"
    aria-live="polite"
  >
    <span class="public-page-state__symbol" aria-hidden="true">◇</span>
    <strong>还没有找到{{ props.label }}</strong>
    <p>这部分内容正在慢慢整理，先回到首页继续浏览。</p>
    <NuxtLink class="public-page-state__action" :to="props.recoveryHref">
      返回首页
    </NuxtLink>
  </div>

  <div
    v-else-if="props.status === 'error'"
    class="public-page-state public-page-state--error"
    role="alert"
  >
    <span class="public-page-state__symbol" aria-hidden="true">!</span>
    <strong>暂时无法加载{{ props.label }}</strong>
    <p>{{ props.errorMessage }}</p>
    <UiButton variant="secondary" @click="emit('retry')">重新加载</UiButton>
  </div>

  <div
    v-else-if="props.status === 'offline'"
    class="public-page-state public-page-state--error"
    role="alert"
  >
    <span class="public-page-state__symbol" aria-hidden="true">⌁</span>
    <strong>当前处于离线状态</strong>
    <p>网络恢复后可以重新加载{{ props.label }}。</p>
    <UiButton variant="secondary" @click="emit('retry')">重新加载</UiButton>
  </div>

  <slot v-else />
</template>

<style scoped>
.public-page-state {
  display: flex;
  min-height: 18rem;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
  box-shadow: var(--glass-highlight);
  color: var(--color-text-muted);
  text-align: center;
}

.public-page-state strong {
  color: var(--color-text);
}

.public-page-state p {
  max-width: 34rem;
  margin: 0;
  line-height: var(--leading-body);
}

.public-page-state__symbol {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-round);
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: var(--text-h3);
}

.public-page-state--error .public-page-state__symbol {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.public-page-state__action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-card-bg);
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
}

.public-page-state--loading {
  align-items: stretch;
  justify-content: flex-start;
  text-align: start;
}

.public-page-state__skeleton {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-6);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: linear-gradient(
    110deg,
    var(--glass-card-bg) 30%,
    var(--glass-bg-hover) 45%,
    var(--glass-card-bg) 60%
  );
  background-size: 220% 100%;
  animation: public-page-skeleton-shimmer var(--motion-duration-shimmer) linear
    infinite;
}

.public-page-state__skeleton span {
  display: block;
  width: 75%;
  height: 0.9rem;
  border-radius: var(--radius-round);
  background: rgb(191 205 255 / 12%);
}

.public-page-state__skeleton span:nth-child(2) {
  width: 92%;
  height: 1.5rem;
}

.public-page-state__skeleton span:last-child {
  width: 58%;
}

@keyframes public-page-skeleton-shimmer {
  to {
    background-position: -120% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .public-page-state__skeleton {
    animation: none;
  }
}
</style>
