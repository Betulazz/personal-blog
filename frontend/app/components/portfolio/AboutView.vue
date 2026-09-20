<script setup lang="ts">
import { ArrowUpRight, Github, Globe2, Mail } from 'lucide-vue-next'
import { computed } from 'vue'

import { siteIdentity } from '~/config/siteIdentity'
import type { AboutProfile } from '~/types/portfolio'
import { getSafeExternalUrl } from '~/utils/external-links'

const props = defineProps<{
  error?: unknown
  pending: boolean
  profile: AboutProfile | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const status = computed(() => {
  if (props.pending) return 'loading' as const
  if (props.error) return 'error' as const
  if (!props.profile) return 'empty' as const
  return 'ready' as const
})

const socialIcons = { code: Github, social: Globe2 } as const
</script>

<template>
  <div class="about-page" data-about-page>
    <UiPageContainer as="section" class="about-page__intro" width="wide">
      <UiSectionHeader
        :description="profile?.profile ?? siteIdentity.description"
        eyebrow="A LITTLE CONTEXT"
        :title="profile?.tagline ?? siteIdentity.tagline"
        :heading-level="1"
      />
    </UiPageContainer>

    <UiPageContainer as="section" class="about-page__content" width="wide">
      <PublicPageState
        label="关于页面"
        recovery-href="/"
        :status="status"
        @retry="emit('retry')"
      >
        <template v-if="profile" #default>
          <div class="about-page__layout">
            <aside class="about-page__aside">
              <UiGlassPanel
                class="about-page__profile-panel"
                tone="panel"
                padding="spacious"
              >
                <div
                  class="about-page__avatar"
                  role="img"
                  :aria-label="`${profile.name}头像`"
                >
                  <span aria-hidden="true">{{ profile.name.slice(0, 1) }}</span>
                </div>
                <p class="about-page__eyebrow">PROFILE</p>
                <h2 id="about-profile-title">{{ profile.name }}</h2>
                <p>{{ profile.profile }}</p>
                <a
                  class="about-page__contact-link"
                  :href="`mailto:${profile.contact.email}`"
                >
                  <Mail :size="16" aria-hidden="true" />
                  联系我
                </a>
              </UiGlassPanel>

              <UiGlassPanel
                class="about-page__skills-panel"
                tone="subtle"
                padding="default"
              >
                <h2>技能</h2>
                <div class="about-page__skill-groups">
                  <div v-for="group in profile.skills" :key="group.name">
                    <h3>{{ group.name }}</h3>
                    <ul>
                      <li v-for="item in group.items" :key="item">
                        {{ item }}
                      </li>
                    </ul>
                  </div>
                </div>
              </UiGlassPanel>
            </aside>

            <div class="about-page__main">
              <section aria-labelledby="about-story-title">
                <UiSectionHeader
                  description="这不是完成时的简历，而是一份仍在生长中的公开记录。"
                  eyebrow="THE STORY"
                  title="我为什么写这里"
                  title-id="about-story-title"
                />
                <div class="about-page__story">
                  <p v-for="paragraph in profile.story" :key="paragraph">
                    {{ paragraph }}
                  </p>
                </div>
              </section>

              <section aria-labelledby="about-timeline-title">
                <UiSectionHeader
                  description="几个让我继续走下去的节点。"
                  eyebrow="A SMALL TIMELINE"
                  title="时间线"
                  title-id="about-timeline-title"
                />
                <ol class="about-page__timeline">
                  <li v-for="item in profile.timeline" :key="item.period">
                    <time>{{ item.period }}</time>
                    <div>
                      <h3>{{ item.title }}</h3>
                      <p>{{ item.description }}</p>
                    </div>
                  </li>
                </ol>
              </section>

              <section aria-labelledby="about-interests-title">
                <UiSectionHeader
                  description="让工作之外的生活也保留一点好奇心。"
                  eyebrow="OFF THE SCREEN"
                  title="兴趣"
                  title-id="about-interests-title"
                />
                <ul class="about-page__interests">
                  <li v-for="interest in profile.interests" :key="interest">
                    {{ interest }}
                  </li>
                </ul>
              </section>

              <UiGlassPanel
                as="section"
                class="about-page__contact"
                tone="subtle"
                padding="spacious"
                aria-labelledby="about-contact-title"
              >
                <div>
                  <p class="about-page__eyebrow">KEEP IN TOUCH</p>
                  <h2 id="about-contact-title">保持联系</h2>
                  <p>{{ profile.contact.note }}</p>
                </div>
                <div class="about-page__socials">
                  <a :href="`mailto:${profile.contact.email}`">
                    <Mail :size="16" aria-hidden="true" />
                    {{ profile.contact.email }}
                  </a>
                  <a
                    v-for="social in profile.socialLinks"
                    :key="social.href"
                    :href="getSafeExternalUrl(social.href)"
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerpolicy="no-referrer"
                  >
                    <component
                      :is="socialIcons[social.kind]"
                      :size="16"
                      aria-hidden="true"
                    />
                    {{ social.label }}
                    <ArrowUpRight :size="15" aria-hidden="true" />
                  </a>
                </div>
              </UiGlassPanel>
            </div>
          </div>
        </template>
      </PublicPageState>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.about-page,
.about-page__content {
  min-height: 100%;
}

.about-page__intro {
  padding-top: clamp(10rem, 17vw, 14rem);
  padding-bottom: var(--space-12);
}

.about-page__content {
  padding-bottom: var(--space-section);
}

.about-page__layout {
  display: grid;
  grid-template-columns: minmax(16rem, 0.72fr) minmax(0, 1.28fr);
  align-items: start;
  gap: clamp(var(--space-8), 6vw, var(--space-16));
}

.about-page__aside,
.about-page__main {
  display: grid;
  gap: var(--space-10);
  min-width: 0;
}

.about-page__profile-panel {
  position: sticky;
  top: 6rem;
}

.about-page__avatar {
  display: grid;
  width: 5.5rem;
  height: 5.5rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-large);
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  box-shadow: var(--shadow-glow);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: var(--font-weight-bold);
}

.about-page__eyebrow {
  margin: var(--space-6) 0 0;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
}

.about-page h2 {
  color: var(--color-text);
  font-family: var(--font-display);
  line-height: var(--leading-display);
}

.about-page__profile-panel h2 {
  margin: var(--space-2) 0 0;
  font-size: var(--text-h2);
}

.about-page__profile-panel p:not(.about-page__eyebrow),
.about-page__contact p {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.about-page__contact-link,
.about-page__socials a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-accent-soft);
  font-size: var(--text-small);
}

.about-page__contact-link {
  margin-top: var(--space-6);
}

.about-page__contact-link:hover,
.about-page__socials a:hover {
  color: var(--color-text);
}

.about-page__skills-panel h2 {
  margin: 0;
  font-size: var(--text-h3);
}

.about-page__skill-groups {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-6);
}

.about-page__skill-groups h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-small);
}

.about-page__skill-groups ul,
.about-page__interests {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.about-page__skill-groups li,
.about-page__interests li {
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.about-page__main > section {
  display: grid;
  gap: var(--space-6);
}

.about-page__story {
  max-width: 68ch;
  color: var(--color-text-muted);
  font-size: var(--text-body-large);
  line-height: var(--leading-body);
}

.about-page__story p {
  margin: 0;
  overflow-wrap: anywhere;
}

.about-page__story p + p {
  margin-top: var(--space-6);
}

.about-page__timeline {
  display: grid;
  gap: var(--space-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.about-page__timeline li {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: var(--space-5);
  padding-left: var(--space-5);
  border-left: 0.125rem solid var(--color-accent);
}

.about-page__timeline time {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: var(--text-small);
}

.about-page__timeline h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-body);
}

.about-page__timeline p {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.about-page__contact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-8);
}

.about-page__contact h2 {
  margin: var(--space-2) 0 0;
  font-size: var(--text-h3);
}

.about-page__socials {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

@media (width <= 64rem) {
  .about-page__layout {
    grid-template-columns: 1fr;
  }

  .about-page__profile-panel {
    position: static;
  }

  .about-page__aside {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

@media (width <= 48rem) {
  .about-page__intro {
    padding-top: 9rem;
    padding-bottom: var(--space-10);
  }

  .about-page__aside,
  .about-page__contact {
    grid-template-columns: 1fr;
  }

  .about-page__contact {
    padding: var(--space-6);
  }
}

@media (width <= 30rem) {
  .about-page__timeline li {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
}
</style>
