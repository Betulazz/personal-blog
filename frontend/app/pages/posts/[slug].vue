<script setup lang="ts">
import { ArrowUp, List } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { usePostDetail, usePostNeighbors } from '~/composables/usePostDiscovery'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import {
  renderPostMarkdownDocument,
  type PostTocItem,
} from '~/utils/post-markdown'
import { derivePostDescription } from '~/utils/automatic-metadata'

import 'katex/dist/katex.min.css'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const { identity, settings } = await usePublicSiteSettings()
const slug = computed(() =>
  typeof route.params.slug === 'string' ? route.params.slug : '',
)
const { data: post, error, pending, refresh } = await usePostDetail(slug)
const { data: neighbors } = await usePostNeighbors(slug)
const { data: renderedDocument } = await useAsyncData(
  () =>
    `post-markdown:${slug.value}:${post.value?.updatedAt ?? post.value?.publishedAt ?? ''}`,
  () =>
    post.value
      ? renderPostMarkdownDocument(post.value.body)
      : Promise.resolve({ html: '', toc: [] as PostTocItem[] }),
  {
    deep: false,
    watch: [post],
  },
)

const title = computed(() => post.value?.title ?? '文章未找到')
const description = computed(() =>
  derivePostDescription(
    post.value?.summary ?? '',
    post.value?.body ?? '',
    post.value
      ? identity.value.description
      : '这个文章链接暂时没有对应的公开内容。',
  ),
)
const seoTitle = computed(() => `${title.value} · ${identity.value.name}`)
const canonicalUrl = computed(
  () => `${siteUrl}/posts/${encodeURIComponent(slug.value)}`,
)
const ogImageUrl = computed(
  () => post.value?.cover?.src ?? settings.value.avatarUrl,
)
const structuredData = computed(() => {
  if (!post.value) {
    return null
  }
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    author: { '@type': 'Person', name: identity.value.name },
    dateModified: post.value.updatedAt,
    datePublished: post.value.publishedAt,
    description: description.value,
    headline: title.value,
    mainEntityOfPage: canonicalUrl.value,
    ...(ogImageUrl.value ? { image: ogImageUrl.value } : {}),
  }).replace(/</g, '\\u003c')
})
const bodyHtml = computed(() => renderedDocument.value?.html ?? '')
const toc = computed(() => renderedDocument.value?.toc ?? [])
const tocOpen = ref(false)
const readingProgress = ref(0)
const showBackToTop = ref(false)
const articleBody = ref<HTMLElement | null>(null)
const mediaCleanup = ref<Array<() => void>>([])

const updateReadingState = () => {
  const scrollableHeight =
    document.documentElement.scrollHeight - window.innerHeight
  readingProgress.value =
    scrollableHeight <= 0
      ? 0
      : Math.round(
          Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100)),
        )
  showBackToTop.value = window.scrollY > 480
}

const bindMediaFallbacks = () => {
  mediaCleanup.value.forEach((cleanup) => cleanup())
  mediaCleanup.value = []
  const root = articleBody.value
  if (!root) {
    return
  }

  root
    .querySelectorAll<HTMLImageElement>('img[data-post-media]')
    .forEach((image) => {
      const fallback = image.parentElement?.querySelector<HTMLElement>(
        '[data-media-fallback]',
      )
      if (!fallback) {
        return
      }
      const onError = () => {
        image.hidden = true
        fallback.hidden = false
      }
      image.addEventListener('error', onError)
      mediaCleanup.value.push(() => image.removeEventListener('error', onError))
      if (image.complete && image.naturalWidth === 0) {
        onError()
      }
    })
}

const scrollToTop = () => {
  window.scrollTo({ behavior: 'smooth', top: 0 })
}

const scrollToCurrentFragment = () => {
  if (!import.meta.client || !route.hash) {
    return
  }

  const fragment = route.hash.slice(1)
  let targetId = fragment
  try {
    targetId = decodeURIComponent(fragment)
  } catch {
    // Keep malformed fragments as literal IDs instead of interrupting the page.
  }
  document.getElementById(targetId)?.scrollIntoView({ block: 'start' })
}

const closeToc = () => {
  tocOpen.value = false
}

onMounted(() => {
  updateReadingState()
  window.addEventListener('scroll', updateReadingState, { passive: true })
  window.addEventListener('resize', updateReadingState)
  bindMediaFallbacks()
  scrollToCurrentFragment()
})

watch(bodyHtml, async () => {
  await nextTick()
  bindMediaFallbacks()
  scrollToCurrentFragment()
})

watch(
  () => route.hash,
  async () => {
    await nextTick()
    scrollToCurrentFragment()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateReadingState)
  window.removeEventListener('resize', updateReadingState)
  mediaCleanup.value.forEach((cleanup) => cleanup())
})

useSeoMeta({
  title: seoTitle,
  description,
  ogDescription: description,
  ogImage: ogImageUrl,
  ogTitle: seoTitle,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterDescription: description,
  twitterImage: ogImageUrl,
  twitterTitle: seoTitle,
})

useHead({
  link: [
    {
      href: canonicalUrl,
      rel: 'canonical',
    },
  ],
  script: computed(() =>
    structuredData.value
      ? [
          {
            innerHTML: structuredData.value,
            type: 'application/ld+json' as 'application/json',
          },
        ]
      : [],
  ),
})
</script>

<template>
  <div class="post-detail-page">
    <div
      class="post-detail-page__progress"
      role="progressbar"
      aria-label="文章阅读进度"
      :aria-valuenow="readingProgress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ '--reading-progress': readingProgress / 100 }" />
    </div>

    <UiPageContainer width="wide">
      <NuxtLink class="post-detail-page__back" to="/posts">
        ← 返回文章发现
      </NuxtLink>

      <div
        v-if="pending"
        class="post-detail-page__state"
        role="status"
        aria-busy="true"
      >
        正在加载文章…
      </div>
      <div v-else-if="error" class="post-detail-page__state" role="alert">
        <strong>暂时无法加载文章</strong>
        <p>文章服务暂时无法响应，请稍后重试。</p>
        <UiButton variant="secondary" @click="refresh">重新加载</UiButton>
      </div>
      <div v-else-if="!post" class="post-detail-page__state" role="status">
        <strong>没有找到这篇文章</strong>
        <p>它可能已经改名，或者还没有公开。</p>
        <NuxtLink class="post-detail-page__action" to="/posts">
          返回文章发现
        </NuxtLink>
      </div>
      <div v-else class="post-detail-page__layout">
        <aside
          v-if="toc.length"
          class="post-detail-page__toc post-detail-page__toc--desktop"
          aria-label="文章目录"
        >
          <nav aria-label="文章目录">
            <p class="post-detail-page__toc-label">ON THIS PAGE</p>
            <ol>
              <li v-for="item in toc" :key="item.id" :data-level="item.level">
                <a :href="`#${item.id}`">{{ item.text }}</a>
              </li>
            </ol>
          </nav>
        </aside>

        <article class="post-detail-page__article">
          <header class="post-detail-page__header">
            <div class="post-detail-page__eyebrow">
              <span v-if="post.pinned">置顶文章</span>
            </div>
            <h1>{{ post.title }}</h1>
            <p class="post-detail-page__summary">{{ post.summary }}</p>
            <div class="post-detail-page__meta">
              <time :datetime="post.publishedAt">
                {{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}
              </time>
              <span>{{ post.readingTimeMinutes }} 分钟阅读</span>
              <span>{{ post.readingCount }} 次阅读</span>
              <time v-if="post.updatedAt" :datetime="post.updatedAt">
                更新于
                {{ new Date(post.updatedAt).toLocaleDateString('zh-CN') }}
              </time>
            </div>
            <figure v-if="post.cover" class="post-detail-page__cover">
              <img
                :src="post.cover.src"
                :alt="post.cover.alt"
                :width="post.cover.width"
                :height="post.cover.height"
                loading="eager"
              />
            </figure>
            <UiButton
              v-if="toc.length"
              class="post-detail-page__toc-trigger"
              size="small"
              variant="secondary"
              aria-haspopup="dialog"
              @click="tocOpen = true"
            >
              <List :size="16" aria-hidden="true" />
              打开文章目录
            </UiButton>
          </header>

          <div ref="articleBody" class="post-detail-page__body">
            <!-- The renderer disables raw HTML and unsafe links before v-html. -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-html="bodyHtml" />
          </div>

          <footer class="post-detail-page__footer">
            <div class="post-detail-page__tags" aria-label="文章标签">
              <NuxtLink
                v-for="tag in post.tags"
                :key="tag.slug"
                class="post-detail-page__tag"
                :to="{ path: '/posts', query: { tag: tag.slug } }"
              >
                #{{ tag.name }}
              </NuxtLink>
            </div>
            <nav
              v-if="neighbors?.previous || neighbors?.next"
              class="post-detail-page__neighbors"
              aria-label="相邻文章"
            >
              <NuxtLink
                v-if="neighbors?.previous"
                class="post-detail-page__neighbor"
                :to="`/posts/${neighbors.previous.slug}`"
              >
                <span>上一篇</span>
                <strong>{{ neighbors.previous.title }}</strong>
              </NuxtLink>
              <NuxtLink
                v-if="neighbors?.next"
                class="post-detail-page__neighbor post-detail-page__neighbor--next"
                :to="`/posts/${neighbors.next.slug}`"
              >
                <span>下一篇</span>
                <strong>{{ neighbors.next.title }}</strong>
              </NuxtLink>
            </nav>
          </footer>
        </article>
      </div>
    </UiPageContainer>

    <UiSheet
      v-if="toc.length"
      v-model:open="tocOpen"
      description="跳转到文章中的任意章节"
      title="文章目录"
    >
      <nav aria-label="移动端文章目录">
        <ol class="post-detail-page__toc-list">
          <li v-for="item in toc" :key="item.id" :data-level="item.level">
            <a :href="`#${item.id}`" @click="closeToc">{{ item.text }}</a>
          </li>
        </ol>
      </nav>
    </UiSheet>

    <UiButton
      v-if="showBackToTop"
      class="post-detail-page__back-to-top"
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
@import 'katex/dist/katex.min.css';

.post-detail-page {
  min-height: 100%;
  padding-top: clamp(9rem, 15vw, 13rem);
  padding-bottom: var(--space-section);
}

.post-detail-page__progress {
  position: fixed;
  z-index: var(--z-sticky);
  top: 0;
  right: 0;
  left: 0;
  height: 0.1875rem;
  background: transparent;
  pointer-events: none;
}

.post-detail-page__progress span {
  display: block;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-accent),
    var(--color-secondary)
  );
  box-shadow: var(--shadow-glow);
  transform: scaleX(var(--reading-progress, 0));
  transform-origin: left center;
  transition: transform var(--motion-duration-fast) linear;
}

.post-detail-page__back {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.post-detail-page__layout {
  display: grid;
  grid-template-columns: minmax(11rem, 14rem) minmax(
      0,
      var(--container-reading)
    );
  justify-content: center;
  gap: clamp(var(--space-8), 5vw, var(--space-16));
}

.post-detail-page__article {
  display: grid;
  gap: var(--space-10);
  min-width: 0;
  margin-top: var(--space-12);
}

.post-detail-page__toc {
  min-width: 0;
  margin-top: var(--space-12);
}

.post-detail-page__toc nav {
  position: sticky;
  top: 6rem;
  max-height: calc(100vh - 8rem);
  overflow: auto;
  padding-block: var(--space-3);
}

.post-detail-page__toc-label,
.post-detail-page__meta,
.post-detail-page__eyebrow > span,
.post-detail-page__neighbor span {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.post-detail-page__toc-label {
  margin: 0 0 var(--space-4);
}

.post-detail-page__toc ol,
.post-detail-page__toc-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-detail-page__toc li,
.post-detail-page__toc-list li {
  min-width: 0;
}

.post-detail-page__toc li[data-level='1'] > a,
.post-detail-page__toc-list li[data-level='1'] > a {
  color: var(--color-text);
  font-weight: 650;
}

.post-detail-page__toc li[data-level='2'],
.post-detail-page__toc-list li[data-level='2'] {
  padding-inline-start: var(--space-3);
}

.post-detail-page__toc li[data-level='2'] > a,
.post-detail-page__toc-list li[data-level='2'] > a {
  font-weight: 550;
}

.post-detail-page__toc li[data-level='3'],
.post-detail-page__toc-list li[data-level='3'] {
  padding-inline-start: var(--space-6);
}

.post-detail-page__toc li[data-level='4'],
.post-detail-page__toc-list li[data-level='4'] {
  padding-inline-start: var(--space-8);
}

.post-detail-page__toc li[data-level='5'],
.post-detail-page__toc-list li[data-level='5'] {
  padding-inline-start: var(--space-10);
}

.post-detail-page__toc li[data-level='6'],
.post-detail-page__toc-list li[data-level='6'] {
  padding-inline-start: var(--space-12);
}

.post-detail-page__toc a,
.post-detail-page__toc-list a {
  display: block;
  min-width: 0;
  padding-block: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.post-detail-page__toc a:hover,
.post-detail-page__toc-list a:hover {
  color: var(--color-text);
}

.post-detail-page__header {
  display: grid;
  gap: var(--space-5);
}

.post-detail-page__eyebrow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.post-detail-page__header h1 {
  max-width: 48rem;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 7vw, 5.5rem);
  line-height: var(--leading-display);
}

.post-detail-page__summary {
  max-width: 42rem;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-h3);
  line-height: var(--leading-body);
}

.post-detail-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: center;
  line-height: 1.5;
}

.post-detail-page__cover {
  overflow: hidden;
  margin: var(--space-4) 0 0;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-large);
  background: var(--glass-card-bg);
  box-shadow: var(--shadow-card), var(--glass-highlight);
}

.post-detail-page__cover img {
  display: block;
  width: 100%;
  height: auto;
}

.post-detail-page__toc-trigger {
  display: none !important;
  justify-self: start;
}

.post-detail-page__body {
  min-width: 0;
  max-width: 42rem;
  color: var(--color-text-muted);
  font-size: var(--text-body-large);
  line-height: var(--leading-body);
}

.post-detail-page__body :deep(p) {
  margin: 0;
}

.post-detail-page__body :deep(p + p),
.post-detail-page__body :deep(p + blockquote),
.post-detail-page__body :deep(blockquote + p),
.post-detail-page__body :deep(ul + p),
.post-detail-page__body :deep(ol + p),
.post-detail-page__body :deep(pre + p),
.post-detail-page__body :deep(table + p) {
  margin-top: var(--space-6);
}

.post-detail-page__body :deep(h2),
.post-detail-page__body :deep(h3),
.post-detail-page__body :deep(h4),
.post-detail-page__body :deep(h5),
.post-detail-page__body :deep(h6) {
  min-width: 0;
  margin: var(--space-12) 0 var(--space-4);
  scroll-margin-top: 6rem;
  color: var(--color-text);
  font-family: var(--font-display);
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.post-detail-page__body :deep(h2) {
  font-size: var(--text-h2);
}

.post-detail-page__body :deep(h3) {
  font-size: var(--text-h3);
}

.post-detail-page__body :deep(h4) {
  font-size: 1.15rem;
}

.post-detail-page__body :deep(a) {
  color: var(--color-accent-soft);
  text-decoration: underline;
  text-decoration-color: rgb(163 168 255 / 44%);
  text-underline-offset: 0.2em;
}

.post-detail-page__body :deep(strong) {
  color: var(--color-text);
}

.post-detail-page__body :deep(blockquote) {
  margin: var(--space-8) 0;
  padding: var(--space-4) var(--space-6);
  border-left: 0.1875rem solid var(--color-accent);
  border-radius: 0 var(--radius-medium) var(--radius-medium) 0;
  background: var(--glass-subtle-bg);
  color: var(--color-text);
}

.post-detail-page__body :deep(ul),
.post-detail-page__body :deep(ol) {
  margin: var(--space-5) 0;
  padding-left: 1.4em;
}

.post-detail-page__body :deep(li + li) {
  margin-top: var(--space-2);
}

.post-detail-page__body :deep(code) {
  padding: 0.12em 0.35em;
  border-radius: var(--radius-small);
  background: rgb(3 8 22 / 62%);
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.88em;
}

.post-detail-page__body :deep(pre) {
  overflow: auto;
  margin: var(--space-8) 0;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: rgb(3 8 22 / 82%);
  box-shadow: var(--shadow-card);
  font-size: 0.85em;
  line-height: 1.65;
  tab-size: 2;
}

.post-detail-page__body :deep(h4) {
  font-size: 1.2em;
}

.post-detail-page__body :deep(h5) {
  font-size: 1.1em;
  font-weight: 600;
}

.post-detail-page__body :deep(h6) {
  font-size: 1em;
  font-weight: 600;
}

.post-detail-page__body :deep(pre code) {
  display: block;
  min-width: max-content;
  padding: var(--space-5);
  background: transparent;
  color: inherit;
}

.post-detail-page__body :deep(.post-markdown__code .shiki) {
  margin: 0;
  border: 0;
  border-radius: 0;
}

.post-detail-page__body :deep(.post-markdown__figure) {
  margin: var(--space-8) 0;
}

.post-detail-page__body :deep(.post-markdown__figure img) {
  display: block;
  max-width: 100%;
  height: auto;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
}

.post-detail-page__body :deep(.post-markdown__media-fallback) {
  display: grid;
  min-height: 8rem;
  place-items: center;
  border: var(--border-hairline) dashed var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.post-detail-page__body
  :deep(.post-markdown__figure .post-markdown__media-fallback) {
  width: 100%;
}

.post-detail-page__body :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  margin: var(--space-8) 0;
  border-collapse: collapse;
  font-size: 0.9em;
}

.post-detail-page__body :deep(th),
.post-detail-page__body :deep(td) {
  min-width: 8rem;
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  text-align: start;
  white-space: nowrap;
}

.post-detail-page__body :deep(th) {
  background: var(--glass-subtle-bg);
  color: var(--color-text);
}

.post-detail-page__body :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
  padding-block: var(--space-4);
}

.post-detail-page__body :deep(.katex) {
  color: var(--color-text);
}

.post-detail-page__footer {
  display: grid;
  gap: var(--space-8);
  padding-top: var(--space-8);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.post-detail-page__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.post-detail-page__tag {
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.post-detail-page__neighbors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.post-detail-page__neighbor {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-5);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
}

.post-detail-page__neighbor strong {
  overflow: hidden;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-detail-page__neighbor--next {
  text-align: end;
}

.post-detail-page__back-to-top {
  position: fixed;
  z-index: var(--z-sticky);
  right: var(--gutter-page);
  bottom: calc(var(--public-shell-safe-bottom) + var(--space-4));
}

.post-detail-page__state {
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

.post-detail-page__state strong {
  color: var(--color-text);
}

.post-detail-page__state p {
  margin: 0;
}

.post-detail-page__action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  color: var(--color-text);
}

@media (width <= 64rem) {
  .post-detail-page__layout {
    display: block;
  }

  .post-detail-page__toc--desktop {
    display: none;
  }

  .post-detail-page__toc-trigger {
    display: inline-flex !important;
  }

  .post-detail-page__body {
    max-width: none;
  }
}

@media (width <= 48rem) {
  .post-detail-page {
    padding-top: 9rem;
  }

  .post-detail-page__article {
    margin-top: var(--space-10);
  }

  .post-detail-page__neighbors {
    grid-template-columns: 1fr;
  }

  .post-detail-page__neighbor--next {
    text-align: start;
  }

  .post-detail-page__toc-list li[data-level='2'] {
    padding-inline-start: var(--space-2);
  }

  .post-detail-page__toc-list li[data-level='3'] {
    padding-inline-start: var(--space-3);
  }

  .post-detail-page__toc-list li[data-level='4'],
  .post-detail-page__toc-list li[data-level='5'],
  .post-detail-page__toc-list li[data-level='6'] {
    padding-inline-start: var(--space-4);
  }
}

@media (width <= 36rem) {
  .post-detail-page__header h1 {
    font-size: clamp(2.25rem, 12vw, 3.5rem);
  }

  .post-detail-page__body :deep(th),
  .post-detail-page__body :deep(td) {
    min-width: 7rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-detail-page__progress span {
    transition: none;
  }
}
</style>
