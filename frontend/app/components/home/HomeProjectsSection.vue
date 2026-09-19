<script setup lang="ts">
import { Github, SquareArrowOutUpRight } from 'lucide-vue-next'

import type { HomepageProject, HomepageSection } from '~/types/homepage'

const props = defineProps<{
  section: HomepageSection<HomepageProject>
}>()

defineEmits<{
  retry: []
}>()

const statusLabels = {
  active: 'Active',
  archived: 'Archived',
  developing: 'Developing',
} as const
</script>

<template>
  <section
    class="home-section home-projects"
    aria-labelledby="home-projects-title"
  >
    <HomeSectionHeader
      eyebrow="SELECTED WORK"
      title="精选项目"
      description="正在做、曾经做过，以及仍然值得回看的东西。"
      link-label="查看项目集"
      title-id="home-projects-title"
      to="/projects"
    />

    <HomeSectionState
      :label="'精选项目'"
      :status="props.section.status"
      :error-message="props.section.error?.message"
      @retry="$emit('retry')"
    >
      <div class="home-projects__grid">
        <UiGlassCard
          v-for="project in props.section.items"
          :key="project.id"
          as="article"
          class="home-project-card"
          padding="default"
          hoverable
        >
          <div class="home-project-card__topline">
            <span class="home-project-card__mark" aria-hidden="true">
              {{ project.name.slice(0, 1) }}
            </span>
            <UiBadge
              :tone="project.status === 'active' ? 'success' : 'neutral'"
            >
              {{ statusLabels[project.status] }}
            </UiBadge>
          </div>
          <h3>{{ project.name }}</h3>
          <p>{{ project.description }}</p>
          <ul class="home-project-card__stack" aria-label="技术栈">
            <li v-for="item in project.stack" :key="item">{{ item }}</li>
          </ul>
          <footer class="home-project-card__footer">
            <a
              v-if="project.githubUrl"
              :href="project.githubUrl"
              :aria-label="`${project.name} 源码（外部链接）`"
              target="_blank"
              rel="noopener noreferrer"
              referrerpolicy="no-referrer"
            >
              <Github :size="16" aria-hidden="true" />
              Source
            </a>
            <a
              v-if="project.demoUrl"
              :href="project.demoUrl"
              :aria-label="`${project.name} 演示（外部链接）`"
              target="_blank"
              rel="noopener noreferrer"
              referrerpolicy="no-referrer"
            >
              Demo
              <SquareArrowOutUpRight :size="15" aria-hidden="true" />
            </a>
          </footer>
        </UiGlassCard>
      </div>
    </HomeSectionState>
  </section>
</template>

<style scoped>
.home-projects__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

.home-project-card {
  min-width: 0;
  height: 100%;
}

.home-project-card__topline,
.home-project-card__footer,
.home-project-card__footer a {
  display: flex;
  align-items: center;
}

.home-project-card__topline {
  justify-content: space-between;
  gap: var(--space-3);
}

.home-project-card__mark {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
}

.home-project-card h3 {
  margin: var(--space-6) 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
}

.home-project-card p {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: var(--leading-body);
}

.home-project-card__stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

.home-project-card__stack li {
  padding: var(--space-1) var(--space-2);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.home-project-card__footer {
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-5);
  margin-top: var(--space-8);
  padding-top: var(--space-4);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.home-project-card__footer a {
  min-height: 2.75rem;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-standard),
    transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.home-project-card__footer a:hover {
  color: var(--color-text);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

@media (width <= 48rem) {
  .home-projects__grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-project-card__footer a:hover {
    transform: none;
  }
}
</style>
