<script setup lang="ts">
type PublicCollectionStatus =
  'empty' | 'error' | 'loading' | 'offline' | 'out-of-range' | 'ready'

const props = withDefaults(
  defineProps<{
    emptyMessage?: string
    errorMessage?: string
    label: string
    recoveryHref: string
    status: PublicCollectionStatus
  }>(),
  {
    emptyMessage: '换一个关键词或标签，也许下一次就会遇见它。',
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
    class="public-collection-state public-collection-state--loading"
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <span>正在加载{{ props.label }}…</span>
    <div class="public-collection-state__skeleton-grid" aria-hidden="true">
      <div
        v-for="index in 3"
        :key="index"
        class="public-collection-state__skeleton"
        data-continuous-effect
      >
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>

  <div
    v-else-if="props.status === 'empty'"
    class="public-collection-state"
    role="status"
    aria-live="polite"
  >
    <span class="public-collection-state__symbol" aria-hidden="true">◇</span>
    <strong>还没有找到{{ props.label }}</strong>
    <p>{{ props.emptyMessage }}</p>
    <NuxtLink class="public-collection-state__action" :to="props.recoveryHref">
      查看全部{{ props.label }}
    </NuxtLink>
  </div>

  <div
    v-else-if="props.status === 'out-of-range'"
    class="public-collection-state"
    role="status"
    aria-live="polite"
  >
    <span class="public-collection-state__symbol" aria-hidden="true">↺</span>
    <strong>这一页暂不存在</strong>
    <p>这个分页链接已经过期，返回公开{{ props.label }}继续浏览。</p>
    <NuxtLink class="public-collection-state__action" :to="props.recoveryHref">
      返回可用页面
    </NuxtLink>
  </div>

  <div
    v-else-if="props.status === 'offline'"
    class="public-collection-state public-collection-state--error"
    role="alert"
  >
    <span class="public-collection-state__symbol" aria-hidden="true">⌁</span>
    <strong>当前处于离线状态</strong>
    <p>网络恢复后可以重新加载{{ props.label }}，已经看到的内容不会被改写。</p>
    <UiButton variant="secondary" @click="emit('retry')">重新加载</UiButton>
  </div>

  <div
    v-else-if="props.status === 'error'"
    class="public-collection-state public-collection-state--error"
    role="alert"
  >
    <span class="public-collection-state__symbol" aria-hidden="true">!</span>
    <strong>暂时无法加载{{ props.label }}</strong>
    <p>{{ props.errorMessage }}</p>
    <UiButton variant="secondary" @click="emit('retry')">重新加载</UiButton>
  </div>

  <slot v-else />
</template>

<style scoped>
.public-collection-state {
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

.public-collection-state strong {
  color: var(--color-text);
  font-size: var(--text-body);
}

.public-collection-state p {
  max-width: 34rem;
  margin: 0;
  line-height: var(--leading-body);
}

.public-collection-state__symbol {
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

.public-collection-state--error .public-collection-state__symbol {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.public-collection-state__action {
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

.public-collection-state--loading {
  align-items: stretch;
  justify-content: flex-start;
  text-align: start;
}

.public-collection-state__skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
}

.public-collection-state__skeleton {
  display: grid;
  min-height: 12rem;
  align-content: start;
  gap: var(--space-3);
  padding: var(--space-5);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: linear-gradient(
    110deg,
    var(--glass-card-bg) 30%,
    var(--glass-bg-hover) 45%,
    var(--glass-card-bg) 60%
  );
  background-size: 220% 100%;
  animation: public-skeleton-shimmer var(--motion-duration-shimmer) linear
    infinite;
}

.public-collection-state__skeleton span {
  display: block;
  height: 0.85rem;
  border-radius: var(--radius-round);
  background: rgb(191 205 255 / 12%);
}

.public-collection-state__skeleton span:nth-child(2) {
  width: 86%;
  height: 1.6rem;
  margin-top: var(--space-4);
}

.public-collection-state__skeleton span:last-child {
  width: 64%;
}

@keyframes public-skeleton-shimmer {
  to {
    background-position: -120% 0;
  }
}

@media (width <= 48rem) {
  .public-collection-state__skeleton-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .public-collection-state__skeleton {
    animation: none;
  }
}
</style>
