<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { computed } from 'vue'

import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import type { HomepageContent } from '~/types/homepage'
import { formatHomepageDate } from '~/utils/homepage'

const props = defineProps<{ content: HomepageContent }>()
const { identity, settings } = await usePublicSiteSettings()

interface HeroStory {
  key: string
  label: string
  summary: string
  title: string
  to: string
}

const featuredPost = computed(() =>
  settings.value.homepageVisibility.posts
    ? (props.content.posts.items.find((post) => post.summary.trim()) ??
      props.content.posts.items[0])
    : undefined,
)

const secondaryStories = computed<HeroStory[]>(() => {
  const stories: HeroStory[] = []

  if (settings.value.homepageVisibility.posts) {
    const nextPost = props.content.posts.items.find(
      (post) => post.id !== featuredPost.value?.id && post.summary.trim(),
    )
    if (nextPost) {
      stories.push({
        key: `post-${nextPost.id}`,
        label: '继续阅读 / ARTICLE',
        summary: nextPost.summary,
        title: nextPost.title,
        to: `/posts/${encodeURIComponent(nextPost.slug)}`,
      })
    }
  }

  const project = settings.value.homepageVisibility.projects
    ? props.content.projects.items[0]
    : undefined
  if (project) {
    stories.push({
      key: `project-${project.id}`,
      label: '手边的事 / PROJECT',
      summary: project.description,
      title: project.name,
      to: '/projects#projects-results',
    })
  }

  const note = settings.value.homepageVisibility.chatter
    ? props.content.chatter.items.find((entry) => entry.body.trim().length > 16)
    : undefined
  if (note && stories.length < 2) {
    stories.push({
      key: `note-${note.id}`,
      label: '随手记下 / NOTE',
      summary: note.body,
      title: note.title?.trim() || note.body,
      to: `/chatter?entry=${encodeURIComponent(note.id)}#chatter-${encodeURIComponent(note.id)}`,
    })
  }

  if (stories.length < 2) {
    stories.push({
      key: 'about',
      label: '关于这里 / ABOUT',
      summary: identity.value.description,
      title: identity.value.name,
      to: '/about',
    })
  }

  return stories.slice(0, 2)
})

const featureStatus = computed(() => {
  if (!settings.value.homepageVisibility.posts) {
    return '文章栏目暂时收起，先从这里认识我。'
  }
  if (props.content.posts.status === 'loading') {
    return '正在读取最近的文章。'
  }
  if (props.content.posts.status === 'error') {
    return '文章暂时无法加载，可以先看看其他记录。'
  }
  return '这里还没有公开文章，新的记录会从这里开始。'
})
</script>

<template>
  <UiPageContainer as="section" class="hero" width="wide">
    <div class="hero__chapter" aria-hidden="true">
      <span>PERSONAL JOURNAL</span><span>CHAPTER 001</span>
    </div>

    <div class="hero__spread">
      <div class="hero__copy">
        <span class="hero__folio">01 — 日常手记</span>
        <h1 id="hero-title">这一页，<br /><em>留给今天。</em></h1>
        <p class="hero__tagline">{{ identity.tagline }}</p>
        <p class="hero__description">{{ identity.description }}</p>
        <NuxtLink class="hero__read" to="/posts">
          开始阅读 <ArrowUpRight :size="21" aria-hidden="true" />
        </NuxtLink>
        <span class="hero__scribble" aria-hidden="true"
          >把喜欢的事情<br />写进日常里 ↗</span
        >
      </div>

      <div class="hero__editorial" aria-label="最近的内容">
        <div class="hero__editorial-heading" aria-hidden="true">
          <span>新近写下</span><span>THE LATEST ENTRIES</span>
        </div>

        <article v-if="featuredPost" class="hero__feature">
          <div class="hero__feature-topline">
            <span>文章 / 01</span>
            <time :datetime="featuredPost.publishedAt">{{
              formatHomepageDate(featuredPost.publishedAt)
            }}</time>
          </div>
          <div class="hero__feature-copy">
            <h2>{{ featuredPost.title }}</h2>
            <p v-if="featuredPost.summary">{{ featuredPost.summary }}</p>
          </div>
          <NuxtLink
            class="hero__feature-link"
            :to="`/posts/${encodeURIComponent(featuredPost.slug)}`"
          >
            阅读这篇 <ArrowUpRight :size="19" aria-hidden="true" />
          </NuxtLink>
        </article>

        <div v-else class="hero__feature hero__feature--empty" role="status">
          <span class="hero__empty-label">写作目录</span>
          <h2>{{ identity.name }}</h2>
          <p>{{ featureStatus }}</p>
          <NuxtLink class="hero__feature-link" to="/about">
            了解这里 <ArrowUpRight :size="19" aria-hidden="true" />
          </NuxtLink>
        </div>

        <div class="hero__index" aria-label="继续探索">
          <NuxtLink
            v-for="story in secondaryStories"
            :key="story.key"
            class="hero__index-link"
            :class="{ 'hero__index-link--wide': secondaryStories.length === 1 }"
            :to="story.to"
          >
            <span class="hero__index-label">{{ story.label }}</span>
            <strong>{{ story.title }}</strong>
            <span class="hero__index-summary">{{ story.summary }}</span>
            <ArrowUpRight
              class="hero__index-arrow"
              :size="17"
              aria-hidden="true"
            />
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="hero__endline" aria-hidden="true">
      <span>BIRCHTULA / FIELD NOTES</span><span>文字、漫画与生活</span>
      <span>SCROLL ↓</span>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  min-height: min(100svh, 58rem);
  align-content: center;
  gap: var(--space-6);
  padding-top: 7.5rem;
  padding-bottom: var(--space-8);
  background: var(--color-canvas-raised);
}

.hero__chapter,
.hero__endline {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.12em;
}

.hero__chapter span:first-child::before {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  margin-right: var(--space-3);
  background: var(--color-accent);
  content: '';
}

.hero__spread {
  display: grid;
  grid-template-columns: minmax(0, 0.91fr) minmax(0, 1.09fr);
  min-height: 38rem;
  border-block: 2px solid var(--color-text);
}

.hero__copy {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border-right: 2px solid var(--color-text);
  padding: clamp(2rem, 4vw, 4.5rem);
}

.hero__folio,
.hero__feature-topline,
.hero__editorial-heading,
.hero__index-label,
.hero__empty-label {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.12em;
}

.hero__folio,
.hero__empty-label {
  color: var(--color-accent-strong);
}

.hero h1 {
  margin: var(--space-8) 0 0;
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 5.1vw, 6.4rem);
  font-weight: 800;
  letter-spacing: -0.085em;
  line-height: 1.18;
  text-wrap: balance;
}

.hero h1 em {
  color: var(--color-accent);
  font-style: normal;
}

.hero__tagline,
.hero__description {
  max-width: 34ch;
  margin: var(--space-8) 0 0;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: var(--text-body-large);
  line-height: var(--leading-body);
  text-wrap: pretty;
}

.hero__description {
  margin-top: var(--space-3);
  font-size: var(--text-small);
}

.hero__read,
.hero__feature-link {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  gap: var(--space-6);
  border-bottom: 2px solid var(--color-text);
  font-size: var(--text-body-large);
  font-weight: 700;
}

.hero__read {
  margin-top: var(--space-10);
}

.hero__read:hover,
.hero__feature-link:hover {
  color: var(--color-accent-strong);
}

.hero__scribble {
  position: absolute;
  right: 2.5rem;
  bottom: 1.5rem;
  color: var(--color-secondary);
  font-family: 'Segoe Print', 'Kaiti SC', cursive;
  font-size: 0.8rem;
  line-height: 1.5;
  transform: rotate(-8deg);
}

.hero__editorial {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.hero__editorial-heading {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  padding: 0 clamp(1.5rem, 3vw, 3rem);
  color: var(--color-text-subtle);
}

.hero__feature {
  display: flex;
  min-width: 0;
  min-height: 23rem;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  padding: clamp(1.5rem, 3vw, 3rem);
}

.hero__feature-topline {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: var(--space-4);
  color: var(--color-text-subtle);
}

.hero__feature-copy h2,
.hero__feature--empty h2 {
  max-width: 18ch;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.25vw, 4rem);
  font-weight: 750;
  letter-spacing: -0.055em;
  line-height: 1.26;
  text-wrap: balance;
}

.hero__feature-copy p,
.hero__feature--empty p {
  display: -webkit-box;
  max-width: 42ch;
  margin: var(--space-5) 0 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.hero__feature-link {
  min-height: 2.5rem;
  gap: var(--space-4);
  font-size: var(--text-small);
}

.hero__index {
  display: grid;
  grid-auto-flow: dense;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 2px solid var(--color-text);
}

.hero__index-link {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 10.5rem;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--space-5) clamp(1.25rem, 2vw, 2rem);
  transition: background-color 220ms ease;
}

.hero__index-link:first-child:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.hero__index-link--wide {
  grid-column: 1 / -1;
}

.hero__index-link:hover {
  background: var(--color-surface-hover);
}

.hero__index-label {
  color: var(--color-accent-strong);
  font-size: 0.66rem;
}

.hero__index-link strong {
  display: -webkit-box;
  max-width: calc(100% - 1.5rem);
  margin-top: var(--space-4);
  overflow: hidden;
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 1.45vw, 1.5rem);
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hero__index-summary {
  display: -webkit-box;
  margin-top: var(--space-2);
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: var(--text-caption);
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hero__index-arrow {
  position: absolute;
  right: var(--space-5);
  bottom: var(--space-5);
}

.hero__endline {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-4);
}

@media (width <= 64rem) {
  .hero__copy {
    padding: var(--space-8);
  }
  .hero__feature,
  .hero__editorial-heading {
    padding-right: var(--space-6);
    padding-left: var(--space-6);
  }
}

@media (width <= 56rem) {
  .hero {
    min-height: auto;
    gap: var(--space-4);
    padding-top: 6rem;
  }
  .hero__spread {
    grid-template-columns: 1fr;
  }
  .hero__copy {
    min-height: 29rem;
    border-right: 0;
    border-bottom: 2px solid var(--color-text);
    padding: var(--space-8) var(--space-6) var(--space-16);
  }
  .hero h1 {
    margin-top: var(--space-5);
    font-size: clamp(3.25rem, 9vw, 5rem);
  }
  .hero__tagline {
    margin-top: var(--space-6);
  }
  .hero__read {
    margin-top: var(--space-6);
  }
  .hero__scribble {
    right: var(--space-4);
    bottom: var(--space-3);
  }
  .hero__endline span:nth-child(2) {
    display: none;
  }
}

@media (width <= 36rem) {
  .hero__editorial-heading span:last-child {
    display: none;
  }
  .hero__feature {
    min-height: 21rem;
    padding: var(--space-6);
  }
  .hero__feature-copy h2,
  .hero__feature--empty h2 {
    font-size: clamp(2rem, 9vw, 2.8rem);
  }
  .hero__index {
    grid-template-columns: 1fr;
  }
  .hero__index-link {
    min-height: 9rem;
  }
  .hero__index-link:first-child:not(:last-child) {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__index-link {
    transition: none;
  }
}
</style>
