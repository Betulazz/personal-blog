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

  const note = settings.value.homepageVisibility.chatter
    ? props.content.chatter.items.find((entry) => entry.body.trim())
    : undefined
  if (note) {
    const title = note.title?.trim() || note.body.trim()
    stories.push({
      key: `note-${note.id}`,
      label: '杂谈 / NOTE',
      summary: note.body.trim() === title ? '' : note.body,
      title,
      to: `/chatter/${encodeURIComponent(note.id)}`,
    })
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
      <HomeProfileSection
        class="hero__profile"
        :stats="content.stats"
        :heading-level="1"
      />

      <div class="hero__editorial" aria-label="最近的内容">
        <div class="hero__editorial-heading" aria-hidden="true">
          <span>最近更新</span><span>THE LATEST ENTRIES</span>
        </div>

        <article v-if="featuredPost" class="hero__feature">
          <div class="hero__feature-topline">
            <span>最新文章 / 01</span>
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
            <span v-if="story.summary" class="hero__index-summary">{{
              story.summary
            }}</span>
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
      <span>BIRCHTULA / FIELD NOTES</span><span>SCROLL ↓</span>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  align-content: start;
  gap: var(--space-4);
  padding-top: 5.5rem;
  padding-bottom: var(--space-5);
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
  grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
  min-height: 30rem;
  border-block: 2px solid var(--color-text);
}

.hero__profile {
  min-width: 0;
  border-right: 2px solid var(--color-text);
}

.hero__profile :deep(.home-profile__panel) {
  height: 100%;
  border: 0;
  border-radius: 0;
  padding: clamp(1.5rem, 2.25vw, 2rem);
  background: transparent;
  box-shadow: none;
}

.hero__profile :deep(.home-profile__name) {
  max-width: 100%;
  font-size: clamp(2.5rem, 3.65vw, 4.6rem);
  letter-spacing: -0.055em;
  line-height: 1.18;
}

.hero__profile :deep(.home-profile__description) {
  max-width: 43ch;
  margin-top: var(--space-3);
  line-height: 1.65;
}

.hero__profile :deep(.home-profile__identity) {
  margin-top: var(--space-4);
}

.hero__profile :deep(.home-profile__avatar),
.hero__profile :deep(.home-profile__avatar img),
.hero__profile :deep(.home-profile__monogram) {
  width: 4rem;
  height: 4rem;
}

.hero__profile :deep(.home-profile__stats) {
  margin-top: var(--space-4);
}

.hero__profile :deep(.home-profile__stat) {
  padding-top: var(--space-2);
}

.hero__profile :deep(.home-profile__social) {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
}

.hero__profile :deep(.home-profile__social a) {
  min-height: 2.25rem;
  padding: var(--space-1) var(--space-2);
}

.hero__profile :deep(.home-profile__read) {
  min-height: 2.25rem;
  margin-top: var(--space-4);
}

.hero__feature-topline,
.hero__editorial-heading,
.hero__index-label,
.hero__empty-label {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.12em;
}

.hero__empty-label {
  color: var(--color-accent-strong);
}

.hero__feature-link {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: var(--space-4);
  border-bottom: 2px solid var(--color-text);
  font-size: var(--text-small);
  font-weight: 700;
}

.hero__feature-link:hover {
  color: var(--color-accent-strong);
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
  min-height: 14rem;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-6) clamp(1.5rem, 2.5vw, 2.5rem);
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
  margin: var(--space-3) 0 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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
  min-height: 6rem;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--space-3) clamp(1.25rem, 2vw, 2rem);
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
  margin-top: var(--space-2);
  overflow: hidden;
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 1.45vw, 1.5rem);
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hero__index-summary {
  display: -webkit-box;
  margin-top: var(--space-1);
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: var(--text-caption);
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
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
  .hero__profile :deep(.home-profile__panel) {
    padding: var(--space-6);
  }
  .hero__profile :deep(.home-profile__name) {
    font-size: clamp(2.35rem, 4vw, 3.5rem);
  }
  .hero__feature,
  .hero__editorial-heading {
    padding-right: var(--space-6);
    padding-left: var(--space-6);
  }
}

@media (width <= 56rem) {
  .hero {
    padding-top: 6rem;
  }
  .hero__spread {
    grid-template-columns: 1fr;
  }
  .hero__profile {
    border-right: 0;
    border-bottom: 2px solid var(--color-text);
  }
  .hero__profile :deep(.home-profile__name) {
    font-size: clamp(2.5rem, 7vw, 4.25rem);
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
