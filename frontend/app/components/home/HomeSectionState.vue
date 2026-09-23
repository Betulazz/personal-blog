<script setup lang="ts">
import type { HomepageSectionStatus } from '~/types/homepage'

const props = withDefaults(
  defineProps<{
    errorMessage?: string
    label: string
    status: HomepageSectionStatus
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
    class="home-section-state home-section-state--loading"
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <span
      class="home-section-state__spinner"
      data-continuous-effect
      aria-hidden="true"
    />
    <span>正在加载{{ props.label }}…</span>
  </div>

  <div
    v-else-if="props.status === 'empty'"
    class="home-section-state home-section-state--empty"
    role="status"
    aria-live="polite"
  >
    <span class="home-section-state__symbol" aria-hidden="true">◇</span>
    <span>这里暂时没有{{ props.label }}</span>
  </div>

  <div
    v-else-if="props.status === 'partial-error'"
    class="home-section-state home-section-state--partial-error"
  >
    <div class="home-section-state__partial-message" role="alert">
      <span class="home-section-state__symbol" aria-hidden="true">!</span>
      <div class="home-section-state__copy">
        <strong>部分{{ props.label }}暂时不可用</strong>
        <p>{{ props.errorMessage }}</p>
      </div>
      <button
        class="home-section-state__retry"
        type="button"
        :aria-label="`重新加载${props.label}`"
        @click="emit('retry')"
      >
        重新加载
      </button>
    </div>
    <slot />
  </div>

  <div
    v-else-if="props.status === 'error'"
    class="home-section-state home-section-state--error"
    role="alert"
  >
    <span class="home-section-state__symbol" aria-hidden="true">!</span>
    <div class="home-section-state__copy">
      <strong>暂时无法加载{{ props.label }}</strong>
      <p>{{ props.errorMessage }}</p>
    </div>
    <button
      class="home-section-state__retry"
      type="button"
      :aria-label="`重新加载${props.label}`"
      @click="emit('retry')"
    >
      重新加载
    </button>
  </div>

  <slot v-else />
</template>

<style scoped>
.home-section-state {
  display: flex;
  min-height: 12rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
  box-shadow: var(--glass-highlight);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  text-align: center;
}

.home-section-state__spinner {
  width: 1.1rem;
  height: 1.1rem;
  border: 0.125rem solid var(--color-accent-soft);
  border-right-color: transparent;
  border-radius: var(--radius-round);
  animation: home-section-spin var(--motion-duration-slow) linear infinite;
}

.home-section-state__symbol {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-round);
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
}

.home-section-state--error {
  justify-content: flex-start;
  text-align: left;
}

.home-section-state--partial-error {
  display: grid;
  align-items: stretch;
  justify-content: stretch;
  gap: var(--space-4);
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  text-align: left;
}

.home-section-state__partial-message {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border: var(--border-hairline) solid var(--color-danger-border-soft);
  border-radius: var(--radius-medium);
  background: var(--color-danger-surface);
}

.home-section-state__partial-message .home-section-state__symbol {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.home-section-state--error .home-section-state__symbol {
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.home-section-state__copy {
  min-width: 0;
  flex: 1;
}

.home-section-state__copy strong {
  color: var(--color-text);
  font-size: var(--text-body);
}

.home-section-state__copy p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
}

.home-section-state__retry {
  min-height: 2.75rem;
  flex: 0 0 auto;
  padding: var(--space-2) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-card-bg);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    background-color var(--motion-duration-fast) var(--motion-ease-standard),
    transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.home-section-state__retry:hover {
  background: var(--glass-bg-hover);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

@keyframes home-section-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (width <= 30rem) {
  .home-section-state--error {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .home-section-state__copy {
    flex-basis: calc(100% - 3rem);
  }

  .home-section-state__retry {
    margin-left: 3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-section-state__spinner {
    animation: none;
  }

  .home-section-state__retry:hover {
    transform: none;
  }
}
</style>
