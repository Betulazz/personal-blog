<script setup lang="ts">
import { ArrowUpRight, Github, Globe2, Mail } from 'lucide-vue-next'
import { computed, ref } from 'vue'

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
const avatarUnavailable = ref(false)

const markAvatarUnavailable = () => {
  avatarUnavailable.value = true
}
</script>

<template>
  <div class="about-page" data-about-page>
    <UiPageContainer as="section" class="about-page__container" width="wide">
      <PublicPageState
        label="关于页面"
        recovery-href="/"
        :status="status"
        @retry="emit('retry')"
      >
        <template v-if="profile" #default>
          <header class="about-page__cover">
            <div class="about-page__cover-copy">
              <p class="about-page__eyebrow">ABOUT / A LITTLE CONTEXT</p>
              <h1>关于我</h1>
              <p>{{ profile.tagline }}</p>
            </div>
            <span class="about-page__cover-orbit" aria-hidden="true"></span>
            <span
              class="about-page__cover-orbit about-page__cover-orbit--small"
              aria-hidden="true"
            ></span>
            <div
              class="about-page__portrait"
              role="img"
              :aria-label="`${profile.name}${avatarUnavailable ? '：头像暂不可用' : '头像'}`"
            >
              <img
                v-if="profile.avatar && !avatarUnavailable"
                :src="profile.avatar.src"
                alt=""
                :width="profile.avatar.width"
                :height="profile.avatar.height"
                loading="lazy"
                decoding="async"
                @error="markAvatarUnavailable"
              />
              <span v-else aria-hidden="true">{{
                profile.name.slice(0, 1)
              }}</span>
            </div>
          </header>

          <div class="about-page__layout">
            <aside class="about-page__rail" aria-label="个人资料与技能">
              <UiGlassPanel
                class="about-page__identity"
                tone="panel"
                padding="spacious"
              >
                <p class="about-page__eyebrow">PROFILE</p>
                <h2 id="about-profile-title">{{ profile.name }}</h2>
                <p class="about-page__bio">{{ profile.profile }}</p>
                <a
                  class="about-page__contact-link"
                  :href="`mailto:${profile.contact.email}`"
                >
                  <Mail :size="16" aria-hidden="true" />
                  联系我
                </a>
              </UiGlassPanel>

              <UiGlassPanel
                class="about-page__skills"
                tone="subtle"
                padding="default"
                aria-labelledby="about-skills-title"
              >
                <h2 id="about-skills-title">技能</h2>
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
                <p class="about-page__section-label">01 / THE STORY</p>
                <h2 id="about-story-title">{{ profile.storyHeading }}</h2>
                <p
                  v-if="profile.storyIntroduction"
                  class="about-page__section-intro"
                >
                  {{ profile.storyIntroduction }}
                </p>
                <div class="about-page__story">
                  <p v-for="paragraph in profile.story" :key="paragraph">
                    {{ paragraph }}
                  </p>
                </div>
              </section>

              <section aria-labelledby="about-timeline-title">
                <p class="about-page__section-label">02 / A SMALL TIMELINE</p>
                <h2 id="about-timeline-title">{{ profile.timelineHeading }}</h2>
                <p
                  v-if="profile.timelineIntroduction"
                  class="about-page__section-intro"
                >
                  {{ profile.timelineIntroduction }}
                </p>
                <ol class="about-page__timeline">
                  <li
                    v-for="item in profile.timeline"
                    :key="item.period + item.title"
                  >
                    <time>{{ item.period }}</time>
                    <div>
                      <h3>{{ item.title }}</h3>
                      <p>{{ item.description }}</p>
                    </div>
                  </li>
                </ol>
              </section>

              <section aria-labelledby="about-interests-title">
                <p class="about-page__section-label">03 / OFF THE SCREEN</p>
                <h2 id="about-interests-title">兴趣</h2>
                <p class="about-page__section-intro">
                  让工作之外的生活也保留一点好奇心。
                </p>
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
                  <p class="about-page__section-label">KEEP IN TOUCH</p>
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
                    <ArrowUpRight :size="14" aria-hidden="true" />
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
.about-page {
  min-height: 100%;
  padding-top: var(--public-heading-offset);
  padding-bottom: var(--space-section);
}

.about-page__cover {
  position: relative;
  display: flex;
  min-height: 18rem;
  align-items: center;
  overflow: visible;
  padding: clamp(2rem, 6vw, 5rem);
  border: 1px solid rgb(185 198 255 / 24%);
  border-radius: var(--radius-panel);
  background:
    radial-gradient(
      ellipse at 76% 26%,
      rgb(151 163 255 / 40%),
      transparent 22rem
    ),
    radial-gradient(
      ellipse at 88% 100%,
      rgb(77 196 200 / 17%),
      transparent 28rem
    ),
    linear-gradient(
      118deg,
      rgb(14 28 64 / 95%),
      rgb(27 37 83 / 89%) 54%,
      rgb(17 37 57 / 94%)
    );
  box-shadow:
    var(--shadow-panel),
    inset 0 1px rgb(255 255 255 / 10%);
}

.about-page__cover::after {
  position: absolute;
  inset: 1rem;
  border: 1px solid rgb(219 226 255 / 10%);
  border-radius: calc(var(--radius-panel) - 0.65rem);
  content: '';
  pointer-events: none;
}

.about-page__cover-copy {
  position: relative;
  z-index: 1;
  max-width: 38rem;
  padding-bottom: 1rem;
}

.about-page__eyebrow,
.about-page__section-label {
  margin: 0;
  color: var(--color-accent-soft);
  font-family: var(--font-ui);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
}

.about-page__cover h1 {
  margin: 1rem 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.about-page__cover-copy > p:last-child {
  max-width: 38rem;
  margin: 1rem 0 0;
  color: rgb(237 240 255 / 82%);
  font-size: var(--text-body-large);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.about-page__cover-orbit {
  position: absolute;
  top: 2rem;
  right: clamp(4rem, 12vw, 12rem);
  width: clamp(10rem, 25vw, 20rem);
  aspect-ratio: 1;
  border: 1px solid rgb(221 229 255 / 22%);
  border-radius: 50%;
  box-shadow:
    inset 0 0 4rem rgb(171 189 255 / 10%),
    0 0 4rem rgb(116 132 255 / 12%);
}

.about-page__portrait {
  position: absolute;
  z-index: 2;
  bottom: -4.25rem;
  left: clamp(1.5rem, 4vw, 3.5rem);
  display: grid;
  width: 8rem;
  height: 8rem;
  place-items: center;
  overflow: hidden;
  border: 0.25rem solid var(--color-canvas-raised);
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  box-shadow: var(--shadow-glow);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 3.5rem;
  font-weight: var(--font-weight-bold);
}

.about-page__portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.about-page__cover-orbit--small {
  top: auto;
  right: 20%;
  bottom: 1.25rem;
  width: 4rem;
  background: rgb(111 212 224 / 18%);
  box-shadow: 0 0 2rem rgb(111 212 224 / 24%);
}

.about-page__layout {
  display: grid;
  grid-template-columns: minmax(16rem, 0.7fr) minmax(0, 1.3fr);
  align-items: stretch;
  gap: clamp(var(--space-8), 5vw, var(--space-16));
  margin-top: 5.5rem;
}

.about-page__rail {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: var(--space-5);
}

.about-page__identity,
.about-page__skills,
.about-page__contact {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-panel))
    saturate(var(--glass-saturation));
}

.about-page__identity {
  width: 100%;
}

.about-page__identity h2,
.about-page__skills h2,
.about-page__main h2,
.about-page__contact h2 {
  margin: 0.65rem 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
}

.about-page__bio,
.about-page__contact p:not(.about-page__section-label) {
  margin: 0.8rem 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.about-page__contact-link,
.about-page__socials a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-accent-soft);
  font-size: var(--text-small);
  overflow-wrap: anywhere;
}

.about-page__contact-link {
  margin-top: var(--space-5);
}

.about-page__contact-link:hover,
.about-page__socials a:hover {
  color: var(--color-text);
}

.about-page__skill-groups {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-5);
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
  gap: 0.5rem;
  margin: 0.65rem 0 0;
  padding: 0;
  list-style: none;
}

.about-page__skill-groups li,
.about-page__interests li {
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.about-page__main {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: clamp(var(--space-12), 8vw, var(--space-20));
  padding-top: 0.5rem;
}

.about-page__main > section {
  min-width: 0;
  scroll-margin-top: 7rem;
}

.about-page__main h2 {
  margin-top: 0.65rem;
}

.about-page__section-intro {
  margin: 0.7rem 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
}

.about-page__story {
  max-width: 68ch;
  margin-top: var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-body-large);
  line-height: var(--leading-body);
}

.about-page__story p {
  margin: 0;
  overflow-wrap: anywhere;
}

.about-page__story p + p {
  margin-top: var(--space-5);
}

.about-page__timeline {
  display: grid;
  gap: var(--space-6);
  margin: var(--space-8) 0 0;
  padding: 0;
  list-style: none;
}

.about-page__timeline li {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: var(--space-4);
  padding: 0.1rem 0 0.25rem 1.2rem;
  border-left: 2px solid var(--color-accent);
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
  margin: 0.45rem 0 0;
  color: var(--color-text-muted);
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.about-page__contact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-6);
}

.about-page__contact h2 {
  margin-top: 0.65rem;
}

.about-page__socials {
  display: grid;
  justify-items: start;
  gap: 0.15rem;
}

@media (width <= 64rem) {
  .about-page__layout {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .about-page__rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 48rem) {
  .about-page__cover {
    min-height: 16rem;
    padding: 1.5rem;
  }

  .about-page__cover h1 {
    max-width: 11ch;
    font-size: clamp(2.25rem, 11vw, 3.5rem);
  }

  .about-page__cover-orbit {
    top: 1rem;
    right: 1rem;
    width: 8rem;
  }

  .about-page__cover-orbit--small {
    top: auto;
    right: 20%;
    bottom: 0.65rem;
    width: 2.75rem;
  }

  .about-page__portrait {
    bottom: -3.25rem;
    left: 1.5rem;
    width: 6.5rem;
    height: 6.5rem;
    font-size: 2.5rem;
  }

  .about-page__layout {
    margin-top: 4.5rem;
  }

  .about-page__rail,
  .about-page__contact {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 30rem) {
  .about-page__timeline li {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.35rem;
  }
}
</style>
