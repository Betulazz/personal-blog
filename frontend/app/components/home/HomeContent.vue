<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import type { HomepageContent, HomepageSectionKey } from '~/types/homepage'
import type { HomepageVisibility } from '~/types/site'

defineProps<{
  content: HomepageContent
  retry: (section: HomepageSectionKey) => Promise<unknown>
  runtimeUptimeSeconds: number | null
  runtimeUptimeFailed: boolean
}>()
const { settings } = await usePublicSiteSettings()
const isVisible = (section: keyof HomepageVisibility) =>
  settings.value.homepageVisibility[section]
</script>

<template>
  <section id="reading" class="home-content" aria-label="首页内容">
    <UiPageContainer class="home-content__container" width="wide">
      <div class="home-content__sections">
        <HomeReveal v-if="isVisible('posts')">
          <HomePostsSection :section="content.posts" @retry="retry('posts')" />
        </HomeReveal>
        <div v-if="isVisible('music')" class="home-content__interlude">
          <HomeMusicCard />
          <HomeLyricStrip class="home-content__lyrics" />
        </div>
        <HomeReveal v-if="isVisible('chatter')">
          <HomeChatterSection
            :section="content.chatter"
            @retry="retry('chatter')"
          />
        </HomeReveal>
        <HomeReveal v-if="isVisible('projects')">
          <HomeProjectsSection
            :section="content.projects"
            @retry="retry('projects')"
          />
        </HomeReveal>
        <HomeRuntimeStatus
          :icp="settings.footer.icp"
          :initially-failed="runtimeUptimeFailed"
          :initial-uptime-seconds="runtimeUptimeSeconds"
        />
      </div>
    </UiPageContainer>
  </section>
</template>

<style scoped>
.home-content {
  position: relative;
  border-top: 2px solid var(--color-text);
  background: var(--homepage-content-background);
}

.home-content__container {
  display: grid;
  gap: var(--space-section);
  padding-top: var(--space-4);
  padding-bottom: var(--space-section);
}

.home-content__sections {
  display: grid;
  gap: var(--space-section);
}

.home-content__interlude {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
}

.home-content__lyrics {
  grid-column: 1 / -1;
}

@media (width <= 48rem) {
  .home-content__container {
    gap: var(--space-16);
    padding-top: var(--space-8);
    padding-bottom: var(--space-16);
  }

  .home-content__sections {
    gap: var(--space-16);
  }

  .home-content__interlude {
    grid-template-columns: 1fr;
  }
}
</style>
