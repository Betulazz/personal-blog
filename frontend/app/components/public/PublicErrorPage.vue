<script setup lang="ts">
import { ArrowLeft, Home, RefreshCw } from 'lucide-vue-next'

import { siteIdentity } from '../../config/siteIdentity'

const props = withDefaults(
  defineProps<{
    statusCode?: number
  }>(),
  {
    statusCode: 404,
  },
)

const isNotFound = computed(() => props.statusCode === 404)
const title = computed(() =>
  isNotFound.value ? '这片夜空还没有页面' : '页面暂时离开了',
)
const description = computed(() =>
  isNotFound.value
    ? '这个地址没有找到，可能已经移动，或者还在另一条路径上。'
    : '刚才的请求没有顺利完成。可以回到一个确定的地方，再试一次。',
)

const retry = () => {
  if (import.meta.client) {
    window.location.reload()
  }
}
</script>

<template>
  <section class="error-page" data-error-page>
    <UiPageContainer width="reading">
      <UiGlassPanel class="error-page__panel" tone="panel" padding="spacious">
        <div class="error-page__signal" aria-hidden="true">
          <span>{{ props.statusCode }}</span>
        </div>
        <p class="error-page__eyebrow">{{ siteIdentity.name }} · RECOVERY</p>
        <h1>{{ title }}</h1>
        <p class="error-page__description">{{ description }}</p>
        <div class="error-page__actions">
          <NuxtLink
            class="error-page__action error-page__action--primary"
            to="/"
          >
            <Home :size="17" aria-hidden="true" />
            返回首页
          </NuxtLink>
          <NuxtLink
            class="error-page__action error-page__action--secondary"
            to="/posts"
          >
            <ArrowLeft :size="17" aria-hidden="true" />
            阅读文章
          </NuxtLink>
          <button class="error-page__retry" type="button" @click="retry">
            <RefreshCw :size="16" aria-hidden="true" />
            重新尝试
          </button>
        </div>
      </UiGlassPanel>
    </UiPageContainer>
  </section>
</template>

<style scoped>
.error-page {
  display: grid;
  min-height: 100svh;
  align-items: center;
  padding-block: var(--space-16);
}

.error-page__panel {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  text-align: center;
}

.error-page__signal {
  display: grid;
  width: 6rem;
  height: 6rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-large);
  background:
    radial-gradient(circle at 30% 25%, var(--color-accent), transparent 68%),
    linear-gradient(135deg, var(--color-canvas-raised), var(--glass-card-bg));
  box-shadow: var(--shadow-glow);
}

.error-page__signal span {
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--text-h2);
  font-weight: var(--font-weight-bold);
}

.error-page__eyebrow {
  margin: var(--space-4) 0 0;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
}

.error-page h1 {
  max-width: 18ch;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h1);
  line-height: var(--leading-display);
  text-wrap: balance;
}

.error-page__description {
  max-width: 48ch;
  margin: 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.error-page__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.error-page__action,
.error-page__retry {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding-inline: var(--space-4);
  border-radius: var(--radius-medium);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
}

.error-page__action--primary {
  border: var(--border-hairline) solid rgb(164 175 255 / 50%);
  background: linear-gradient(
    135deg,
    var(--color-action-start),
    var(--color-action-end)
  );
  box-shadow: 0 0.75rem 2.5rem rgb(74 93 238 / 30%);
}

.error-page__action--secondary {
  border: var(--border-hairline) solid var(--glass-border);
  background: var(--glass-subtle-bg);
  box-shadow: var(--glass-highlight);
}

.error-page__action:hover {
  border-color: var(--glass-border-hover);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

.error-page__retry {
  border: 0;
  color: var(--color-text-subtle);
}

.error-page__retry:hover {
  color: var(--color-text);
}

@media (width <= 48rem) {
  .error-page {
    padding-top: 9rem;
  }

  .error-page__panel {
    padding: var(--space-6);
  }

  .error-page__actions {
    align-items: stretch;
    flex-direction: column;
    width: 100%;
  }

  .error-page__action,
  .error-page__retry {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-page__action:hover {
    transform: none;
  }
}
</style>
