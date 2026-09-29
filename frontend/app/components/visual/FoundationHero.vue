<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity } = await usePublicSiteSettings()
</script>

<template>
  <UiPageContainer as="section" class="hero" width="wide">
    <div class="hero__chapter" aria-hidden="true">
      <span>PERSONAL JOURNAL</span><span>CHAPTER 001</span>
    </div>

    <div class="hero__spread">
      <figure class="hero__art">
        <img
          src="/images/editorial/manga-writing.png"
          alt="漫画风格插画：女孩在窗前写字，黑猫卧在旁边"
          width="1672"
          height="941"
          fetchpriority="high"
        />
        <figcaption>图鉴 01 / 记录正在发生的日常</figcaption>
      </figure>
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
  grid-template-columns: minmax(0, 1.58fr) minmax(21rem, 0.9fr);
  min-height: 35rem;
  border-block: 2px solid var(--color-text);
}

.hero__art {
  position: relative;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border-right: 2px solid var(--color-text);
  background: #e8e5dc;
}

.hero__art img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 35rem;
  object-fit: cover;
  object-position: 40% center;
  filter: contrast(1.04);
}

.hero__art figcaption {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 0.45rem 0.7rem;
  border-top: 1px solid var(--color-text);
  border-left: 1px solid var(--color-text);
  background: var(--color-canvas-raised);
  font-size: 0.7rem;
}

.hero__copy {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(2rem, 4vw, 4.5rem);
}

.hero__folio {
  color: var(--color-accent-strong);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.14em;
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

.hero__read {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  gap: var(--space-6);
  margin-top: var(--space-10);
  border-bottom: 2px solid var(--color-text);
  font-size: var(--text-body-large);
  font-weight: 700;
}

.hero__read:hover {
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

.hero__endline {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-4);
}

@media (width <= 64rem) {
  .hero__spread {
    grid-template-columns: minmax(0, 1.2fr) minmax(19rem, 1fr);
  }
  .hero__copy {
    padding: var(--space-8);
  }
}

@media (width <= 48rem) {
  .hero {
    min-height: auto;
    gap: var(--space-4);
    padding-top: 6rem;
  }
  .hero__spread {
    grid-template-columns: 1fr;
  }
  .hero__art {
    height: clamp(16rem, 68vw, 24rem);
    border-right: 0;
    border-bottom: 2px solid var(--color-text);
  }
  .hero__art img {
    min-height: 0;
  }
  .hero__copy {
    min-height: 25rem;
    padding: var(--space-8) var(--space-6);
  }
  .hero h1 {
    margin-top: var(--space-5);
    font-size: clamp(3.25rem, 12vw, 5rem);
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
</style>
