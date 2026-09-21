<script setup lang="ts">
import { ArrowUpRight, Github, Globe2 } from 'lucide-vue-next'

import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import type { HomepageStat } from '~/types/homepage'

defineProps<{
  stats: HomepageStat[]
}>()

const { identity } = await usePublicSiteSettings()
const monogram = computed(() => identity.value.name.slice(0, 1))
const socialIcons = { code: Github, social: Globe2 } as const
</script>

<template>
  <section
    class="home-profile"
    aria-labelledby="home-profile-title"
    data-homepage-profile
  >
    <UiGlassPanel class="home-profile__panel" tone="panel" padding="spacious">
      <div class="home-profile__topline">
        <UiBadge tone="accent">ABOUT THIS SPACE</UiBadge>
        <span class="home-profile__signal" aria-label="站点状态：持续记录">
          <span aria-hidden="true" />持续记录
        </span>
      </div>

      <div class="home-profile__identity">
        <span class="home-profile__monogram" aria-hidden="true">{{
          monogram
        }}</span>
        <div>
          <p class="home-profile__eyebrow">个人简介</p>
          <h2 id="home-profile-title">在这里，记录技术、生活与仍在发生的事</h2>
        </div>
      </div>

      <p class="home-profile__description">{{ identity.description }}</p>

      <dl class="home-profile__stats" aria-label="网站统计">
        <div v-for="stat in stats" :key="stat.label" class="home-profile__stat">
          <dt>{{ stat.label }}</dt>
          <dd>
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.detail }}</span>
          </dd>
        </div>
      </dl>

      <div class="home-profile__social" data-homepage-social-links>
        <span class="home-profile__social-label">找到我</span>
        <ul>
          <li v-for="social in identity.socialLinks" :key="social.href">
            <a
              :href="social.href"
              :aria-label="`${social.label}（外部链接）`"
              target="_blank"
              rel="noopener noreferrer"
              referrerpolicy="no-referrer"
            >
              <component
                :is="socialIcons[social.kind]"
                :size="17"
                aria-hidden="true"
              />
              <span>{{ social.label }}</span>
              <ArrowUpRight :size="15" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </div>
    </UiGlassPanel>
  </section>
</template>

<style scoped>
.home-profile {
  min-width: 0;
}

.home-profile__panel {
  height: 100%;
}

.home-profile__topline,
.home-profile__identity,
.home-profile__social,
.home-profile__social ul {
  display: flex;
  align-items: center;
}

.home-profile__topline {
  justify-content: space-between;
  gap: var(--space-4);
}

.home-profile__signal {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.home-profile__signal span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-round);
  background: var(--color-success);
  box-shadow: var(--shadow-success-glow);
}

.home-profile__identity {
  gap: var(--space-5);
  margin-top: var(--space-10);
}

.home-profile__monogram {
  display: grid;
  width: 4.25rem;
  height: 4.25rem;
  flex: 0 0 auto;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  box-shadow: var(--shadow-glow);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 1.7rem;
  font-weight: var(--font-weight-bold);
}

.home-profile__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.home-profile h2 {
  max-width: 26ch;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2.7vw, 2.35rem);
  line-height: var(--leading-display);
  text-wrap: balance;
}

.home-profile__description {
  max-width: 52ch;
  margin: var(--space-8) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-body);
  line-height: var(--leading-body);
}

.home-profile__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: var(--space-10) 0 0;
}

.home-profile__stat {
  min-width: 0;
  padding-top: var(--space-4);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.home-profile__stat dt,
.home-profile__stat dd {
  margin: 0;
}

.home-profile__stat dt {
  overflow-wrap: anywhere;
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-profile__stat dd {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.home-profile__stat strong {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 1.7rem;
  line-height: 1;
}

.home-profile__stat span {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.home-profile__social {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-10);
  padding-top: var(--space-5);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.home-profile__social-label {
  color: var(--color-text-subtle);
  font-size: var(--text-small);
}

.home-profile__social ul {
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-profile__social a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  transition:
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    color var(--motion-duration-fast) var(--motion-ease-standard),
    transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.home-profile__social a:hover {
  border-color: var(--glass-border-hover);
  color: var(--color-text);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

@media (width <= 48rem) {
  .home-profile__panel {
    padding: var(--space-6);
  }
}

@media (width <= 26.875rem) {
  .home-profile__topline {
    align-items: flex-start;
    flex-direction: column;
  }

  .home-profile__identity {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-4);
  }

  .home-profile__stats {
    gap: var(--space-2);
  }

  .home-profile__stat strong {
    font-size: 1.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-profile__social a:hover {
    transform: none;
  }
}
</style>
