<script setup lang="ts">
import { ArrowUp } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useApiClient } from '~/api/client'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import type { ChatterCollectionResponse } from '~/types/chatter'
import { formatPublicDate } from '~/utils/public-content'

definePageMeta({ hidePublicNavigation: true, scrollToTop: true })

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const chatterId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : '',
)

if (!/^[1-9]\d*$/.test(chatterId.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Chatter not found' })
}

const api = useApiClient()
const {
  data: collection,
  error,
  pending,
  refresh,
} = await useAsyncData<ChatterCollectionResponse>(
  () => `chatter-reader:${chatterId.value}`,
  (_nuxtApp, { signal }) =>
    api.listChatter({ entry: chatterId.value, page: 1, pageSize: 12 }, signal),
  { deep: false },
)
const chatter = computed(() => collection.value?.data[0] ?? null)
const { identity, settings } = await usePublicSiteSettings()
const title = computed(() => chatter.value?.title || '杂谈记录')
const description = computed(
  () =>
    chatter.value?.body.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    '浏览这条公开杂谈记录。',
)
const canonicalUrl = computed(
  () => `${siteUrl}/chatter/${encodeURIComponent(chatterId.value)}`,
)
const ogImageUrl = computed(
  () => chatter.value?.images[0]?.src ?? settings.value.avatarUrl,
)
const readingProgress = ref(0)
const showBackToTop = ref(false)
const failedImages = ref<Record<string, boolean>>({})

const updateReadingState = () => {
  const scrollableHeight = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  )
  readingProgress.value =
    scrollableHeight === 0
      ? 0
      : Math.round(
          Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100)),
        )
  showBackToTop.value = window.scrollY > 480
}

const scrollToTop = () => {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  window.scrollTo({ behavior: reduceMotion ? 'auto' : 'smooth', top: 0 })
}

onMounted(() => {
  window.scrollTo(0, 0)
  updateReadingState()
  window.addEventListener('scroll', updateReadingState, { passive: true })
  window.addEventListener('resize', updateReadingState)
})

watch(chatter, async () => {
  await nextTick()
  updateReadingState()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateReadingState)
  window.removeEventListener('resize', updateReadingState)
})

useSeoMeta({
  title: () => `${title.value} · ${identity.value.name}`,
  description,
  ogDescription: description,
  ogImage: ogImageUrl,
  ogTitle: () => `${title.value} · ${identity.value.name}`,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterDescription: description,
  twitterImage: ogImageUrl,
  twitterTitle: () => `${title.value} · ${identity.value.name}`,
})

useHead(() => ({
  link: [{ href: canonicalUrl.value, rel: 'canonical' }],
}))
</script>

<template>
  <div class="chatter-detail-page" data-chatter-reader>
    <div
      class="chatter-detail-page__progress"
      role="progressbar"
      aria-label="杂谈阅读进度"
      :aria-valuenow="readingProgress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ '--reading-progress': readingProgress / 100 }" />
    </div>

    <UiPageContainer width="wide">
      <NuxtLink class="chatter-detail-page__back" to="/chatter">
        ← 返回杂谈
      </NuxtLink>

      <div
        v-if="pending"
        class="chatter-detail-page__state"
        role="status"
        aria-busy="true"
      >
        正在加载杂谈…
      </div>
      <div v-else-if="error" class="chatter-detail-page__state" role="alert">
        <strong>暂时无法加载这条杂谈</strong>
        <p>杂谈服务暂时无法响应，请稍后重试。</p>
        <UiButton variant="secondary" @click="refresh">重新加载</UiButton>
      </div>
      <div
        v-else-if="!chatter"
        class="chatter-detail-page__state"
        role="status"
      >
        <strong>没有找到这条杂谈</strong>
        <p>它可能已经删除，或者还没有公开。</p>
        <NuxtLink class="chatter-detail-page__action" to="/chatter">
          返回杂谈
        </NuxtLink>
      </div>
      <article v-else class="chatter-detail-page__article">
        <header class="chatter-detail-page__header">
          <p class="chatter-detail-page__eyebrow">
            杂谈 / {{ String(chatter.id).padStart(3, '0') }}
          </p>
          <h1>{{ title }}</h1>
          <p v-if="chatter.mood" class="chatter-detail-page__mood">
            {{ chatter.mood }}
          </p>
          <div class="chatter-detail-page__meta">
            <time :datetime="chatter.publishedAt">
              {{ formatPublicDate(chatter.publishedAt) }}
            </time>
          </div>
        </header>

        <div
          v-if="chatter.images.length"
          class="chatter-detail-page__images"
          :data-count="chatter.images.length"
        >
          <div
            v-for="image in chatter.images"
            :key="image.src"
            class="chatter-detail-page__image-frame"
          >
            <div
              v-if="failedImages[image.src]"
              class="chatter-detail-page__image-fallback"
              role="img"
              :aria-label="`${image.alt} · 媒体暂不可用`"
            >
              媒体暂不可用
            </div>
            <img
              v-else
              :src="image.src"
              :alt="image.alt"
              :width="image.width"
              :height="image.height"
              loading="eager"
              decoding="async"
              @error="failedImages[image.src] = true"
            />
          </div>
        </div>

        <div class="chatter-detail-page__body">
          <p>{{ chatter.body }}</p>
        </div>

        <footer class="chatter-detail-page__footer">
          <NuxtLink to="/chatter">返回杂谈列表</NuxtLink>
        </footer>
      </article>
    </UiPageContainer>

    <UiButton
      v-if="showBackToTop"
      class="chatter-detail-page__back-to-top"
      aria-label="返回顶部"
      size="icon"
      variant="secondary"
      @click="scrollToTop"
    >
      <ArrowUp :size="18" aria-hidden="true" />
    </UiButton>
  </div>
</template>

<style scoped>
.chatter-detail-page {
  min-height: 100%;
  padding-block: var(--space-8) var(--space-section);
  background: var(--color-canvas);
}

.chatter-detail-page__progress {
  position: fixed;
  z-index: var(--z-sticky);
  top: 0;
  right: 0;
  left: 0;
  height: 0.1875rem;
  pointer-events: none;
}

.chatter-detail-page__progress span {
  display: block;
  height: 100%;
  background: var(--color-accent);
  transform: scaleX(var(--reading-progress, 0));
  transform-origin: left center;
  transition: transform var(--motion-duration-fast) linear;
}

.chatter-detail-page__back {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  margin-bottom: var(--space-10);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.chatter-detail-page__article {
  display: grid;
  max-width: var(--container-reading);
  gap: var(--space-10);
  margin-inline: auto;
}

.chatter-detail-page__header {
  display: grid;
  gap: var(--space-5);
}

.chatter-detail-page__eyebrow {
  margin: 0;
  color: var(--color-accent-strong);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.chatter-detail-page__header h1 {
  max-width: 48rem;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 7vw, 5.5rem);
  line-height: var(--leading-display);
}

.chatter-detail-page__mood {
  margin: 0;
  color: var(--color-secondary);
  font-size: var(--text-h3);
  line-height: var(--leading-body);
}

.chatter-detail-page__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  color: var(--color-text-muted);
  line-height: 1.5;
}

.chatter-detail-page__images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-1);
  overflow: hidden;
  background: var(--color-text);
}

.chatter-detail-page__image-frame {
  min-width: 0;
  background: var(--color-canvas);
}

.chatter-detail-page__image-frame img,
.chatter-detail-page__image-fallback {
  display: block;
  width: 100%;
  max-height: 32rem;
  aspect-ratio: 1.45;
  object-fit: cover;
}

.chatter-detail-page__image-fallback {
  display: grid;
  place-items: center;
  padding: var(--space-5);
  color: var(--color-text-subtle);
  text-align: center;
}

.chatter-detail-page__image-frame:first-child {
  grid-column: 1 / -1;
}

.chatter-detail-page__image-frame:first-child img,
.chatter-detail-page__image-frame:first-child
  .chatter-detail-page__image-fallback {
  aspect-ratio: 2.1;
}

.chatter-detail-page__images[data-count='1'] img,
.chatter-detail-page__images[data-count='1']
  .chatter-detail-page__image-fallback {
  aspect-ratio: 2.1;
}

.chatter-detail-page__body {
  max-width: 42rem;
  color: var(--color-text-muted);
  font-size: var(--text-body-large);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.chatter-detail-page__body p {
  margin: 0;
}

.chatter-detail-page__footer {
  display: flex;
  padding-top: var(--space-8);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.chatter-detail-page__footer a {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.chatter-detail-page__back-to-top {
  position: fixed;
  z-index: var(--z-sticky);
  right: var(--gutter-page);
  bottom: calc(var(--public-shell-safe-bottom) + var(--space-4));
}

.chatter-detail-page__state {
  display: grid;
  min-height: 18rem;
  place-items: center;
  gap: var(--space-3);
  margin-top: var(--space-12);
  padding: var(--space-8);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  text-align: center;
}

.chatter-detail-page__state strong {
  color: var(--color-text);
}

.chatter-detail-page__state p {
  margin: 0;
}

.chatter-detail-page__action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  color: var(--color-text);
}

@media (width <= 48rem) {
  .chatter-detail-page {
    padding-top: var(--space-6);
  }

  .chatter-detail-page__article {
    gap: var(--space-8);
  }

  .chatter-detail-page__header h1 {
    font-size: clamp(2.25rem, 10vw, 4rem);
  }

  .chatter-detail-page__images {
    grid-template-columns: 1fr;
  }

  .chatter-detail-page__image-frame,
  .chatter-detail-page__image-frame:first-child {
    grid-column: auto;
  }

  .chatter-detail-page__image-frame img,
  .chatter-detail-page__image-frame .chatter-detail-page__image-fallback,
  .chatter-detail-page__images[data-count='1'] img,
  .chatter-detail-page__images[data-count='1']
    .chatter-detail-page__image-fallback {
    aspect-ratio: 1.5;
  }
}
</style>
