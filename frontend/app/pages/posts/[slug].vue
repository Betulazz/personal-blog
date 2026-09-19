<script setup lang="ts">
import { computed } from 'vue'

import { siteIdentity } from '~/config/siteIdentity'
import { usePostDetail } from '~/composables/usePostDiscovery'
import { renderPostMarkdown } from '~/utils/post-markdown'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const slug = computed(() =>
  typeof route.params.slug === 'string' ? route.params.slug : '',
)
const { data: post, error, pending, refresh } = await usePostDetail(slug)
const title = computed(() => post.value?.title ?? '文章未找到')
const description = computed(
  () => post.value?.summary ?? '这个文章链接暂时没有对应的公开内容。',
)
const bodyHtml = computed(() =>
  post.value ? renderPostMarkdown(post.value.body) : '',
)

useSeoMeta({
  title: computed(() => `${title.value} · ${siteIdentity.name}`),
  description,
  ogDescription: description,
  ogTitle: computed(() => `${title.value} · ${siteIdentity.name}`),
  ogType: 'article',
  ogUrl: computed(() => `${siteUrl}/posts/${slug.value}`),
  twitterCard: 'summary',
  twitterDescription: description,
  twitterTitle: computed(() => `${title.value} · ${siteIdentity.name}`),
})

useHead({
  link: [
    {
      href: computed(() => `${siteUrl}/posts/${slug.value}`),
      rel: 'canonical',
    },
  ],
})
</script>

<template>
  <main class="post-detail-page">
    <UiPageContainer width="reading">
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
      <article v-else class="post-detail-page__article">
        <header class="post-detail-page__header">
          <UiBadge tone="accent">{{ post.category.name }}</UiBadge>
          <h1>{{ post.title }}</h1>
          <p class="post-detail-page__summary">{{ post.summary }}</p>
          <div class="post-detail-page__meta">
            <time :datetime="post.publishedAt">
              {{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}
            </time>
            <span>{{ post.readingTimeMinutes }} 分钟阅读</span>
            <span>{{ post.readingCount }} 次阅读</span>
          </div>
        </header>

        <!-- The renderer disables raw HTML and linkification before v-html. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="post-detail-page__body" v-html="bodyHtml" />
      </article>
    </UiPageContainer>
  </main>
</template>

<style scoped>
.post-detail-page {
  min-height: 100%;
  padding-top: clamp(9rem, 15vw, 13rem);
  padding-bottom: var(--space-section);
}

.post-detail-page__back {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.post-detail-page__article {
  display: grid;
  gap: var(--space-10);
  margin-top: var(--space-12);
}

.post-detail-page__header {
  display: grid;
  gap: var(--space-5);
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
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.post-detail-page__body {
  display: grid;
  gap: var(--space-5);
  max-width: 42rem;
  color: var(--color-text-muted);
  font-size: var(--text-body-large);
  line-height: var(--leading-body);
}

.post-detail-page__body p {
  margin: 0;
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
</style>
