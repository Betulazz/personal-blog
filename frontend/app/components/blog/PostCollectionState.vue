<script setup lang="ts">
type CollectionStatus =
  'empty' | 'error' | 'loading' | 'not-found' | 'out-of-range' | 'ready'

const props = withDefaults(
  defineProps<{
    errorMessage?: string
    label: string
    recoveryHref?: string
    status: CollectionStatus
  }>(),
  {
    errorMessage: '内容服务暂时没有响应，请稍后再试。',
    recoveryHref: '/posts',
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div
    v-if="props.status === 'loading'"
    class="post-collection-state post-collection-state--loading"
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <span class="post-collection-state__loading-label">
      正在加载{{ props.label }}…
    </span>
    <div class="post-collection-state__skeleton-grid" aria-hidden="true">
      <div
        v-for="index in 3"
        :key="index"
        class="post-collection-state__skeleton"
      >
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>

  <div
    v-else-if="props.status === 'empty'"
    class="post-collection-state"
    role="status"
    aria-live="polite"
  >
    <span class="post-collection-state__symbol" aria-hidden="true">◇</span>
    <strong>还没有找到{{ props.label }}</strong>
    <p>换一个关键词或筛选条件，也许下一次就会遇见它。</p>
    <NuxtLink class="post-collection-state__action" :to="props.recoveryHref">
      查看全部文章
    </NuxtLink>
  </div>

  <div
    v-else-if="props.status === 'out-of-range'"
    class="post-collection-state"
    role="status"
    aria-live="polite"
  >
    <span class="post-collection-state__symbol" aria-hidden="true">↺</span>
    <strong>这一页暂不存在</strong>
    <p>这个分页链接已经过期，返回最后一页继续浏览。</p>
    <NuxtLink class="post-collection-state__action" :to="props.recoveryHref">
      返回可用页面
    </NuxtLink>
  </div>

  <div
    v-else-if="props.status === 'not-found'"
    class="post-collection-state"
    role="status"
    aria-live="polite"
  >
    <span class="post-collection-state__symbol" aria-hidden="true">?</span>
    <strong>没有找到这个{{ props.label }}</strong>
    <p>它可能已经改名，或者还没有公开文章。</p>
    <NuxtLink class="post-collection-state__action" :to="props.recoveryHref">
      返回文章发现
    </NuxtLink>
  </div>

  <div
    v-else-if="props.status === 'error'"
    class="post-collection-state post-collection-state--error"
    role="alert"
  >
    <span class="post-collection-state__symbol" aria-hidden="true">!</span>
    <strong>暂时无法加载{{ props.label }}</strong>
    <p>{{ props.errorMessage }}</p>
    <UiButton variant="secondary" @click="emit('retry')">重新加载</UiButton>
  </div>

  <slot v-else />
</template>

<style scoped>
.post-collection-state {
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

.post-collection-state strong {
  color: var(--color-text);
  font-size: var(--text-body);
}

.post-collection-state p {
  max-width: 34rem;
  margin: 0;
  line-height: var(--leading-body);
}

.post-collection-state__symbol {
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

.post-collection-state--error .post-collection-state__symbol {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.post-collection-state__action {
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

.post-collection-state--loading {
  align-items: stretch;
  justify-content: flex-start;
  text-align: start;
}

.post-collection-state__loading-label {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.post-collection-state__skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
}

.post-collection-state__skeleton {
  display: grid;
  min-height: 15rem;
  gap: var(--space-3);
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
  animation: post-skeleton-shimmer 1.8s linear infinite;
}

.post-collection-state__skeleton span {
  display: block;
  height: 0.85rem;
  border-radius: var(--radius-round);
  background: rgb(191 205 255 / 12%);
}

.post-collection-state__skeleton span:nth-child(2) {
  width: 82%;
  height: 1.8rem;
  margin-top: var(--space-3);
}

.post-collection-state__skeleton span:nth-child(3) {
  width: 94%;
}

.post-collection-state__skeleton span:last-child {
  width: 58%;
  margin-top: auto;
}

@keyframes post-skeleton-shimmer {
  to {
    background-position: -120% 0;
  }
}

@media (width <= 48rem) {
  .post-collection-state__skeleton-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-collection-state__skeleton {
    animation: none;
  }
}
</style>
