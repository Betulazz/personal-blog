<script setup lang="ts">
const { content, retry } = useHomepageContent()
</script>

<template>
  <section id="reading" class="home-content" aria-label="首页内容">
    <UiPageContainer class="home-content__container" width="wide">
      <HomeProfileSection :stats="content.stats" />

      <div class="home-content__sections">
        <HomeReveal>
          <HomePostsSection :section="content.posts" @retry="retry('posts')" />
        </HomeReveal>
        <HomeReveal>
          <HomeMomentsSection
            :section="content.moments"
            @retry="retry('moments')"
          />
        </HomeReveal>
        <HomeReveal>
          <HomeChatterSection
            :section="content.chatter"
            @retry="retry('chatter')"
          />
        </HomeReveal>
        <HomeReveal>
          <HomeProjectsSection
            :section="content.projects"
            @retry="retry('projects')"
          />
        </HomeReveal>
      </div>
    </UiPageContainer>
  </section>
</template>

<style scoped>
.home-content {
  position: relative;
  border-top: var(--border-hairline) solid var(--color-divider-subtle);
  background: var(--homepage-content-background);
}

.home-content__container {
  display: grid;
  gap: var(--space-section);
  padding-top: var(--space-section);
  padding-bottom: var(--space-section);
}

.home-content__sections {
  display: grid;
  gap: var(--space-section);
}

@media (width <= 48rem) {
  .home-content__container {
    gap: var(--space-16);
    padding-top: var(--space-16);
    padding-bottom: var(--space-16);
  }

  .home-content__sections {
    gap: var(--space-16);
  }
}
</style>
