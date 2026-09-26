<script setup lang="ts">
import { computed } from 'vue'
import { useOnline } from '@vueuse/core'

import type { ProjectCollectionResponse } from '~/types/portfolio'

const props = defineProps<{
  error?: unknown
  pending: boolean
  response: ProjectCollectionResponse | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const isOnline = useOnline()

const status = computed(() => {
  if (props.pending) return 'loading' as const
  if (!isOnline.value && !props.response) return 'offline' as const
  if (props.error) return 'error' as const
  if (!props.response || props.response.data.length === 0) {
    return 'empty' as const
  }
  return 'ready' as const
})

const featuredCount = computed(
  () => props.response?.data.filter((project) => project.featured).length ?? 0,
)
</script>

<template>
  <div class="projects-page" data-projects-page>
    <UiPageContainer as="section" class="projects-page__intro" width="wide">
      <div class="projects-page__intro-copy">
        <UiSectionHeader
          description="正在做、曾经做过，以及仍然值得回看的东西。每个项目都保留它的状态、技术和去处。"
          eyebrow="SELECTED WORK"
          title="项目集"
          :heading-level="1"
        />
        <div class="projects-page__summary">
          <UiBadge tone="accent"
            >{{ response?.data.length ?? 0 }} 个项目</UiBadge
          >
          <span>{{ featuredCount }} 个精选项目</span>
        </div>
      </div>
    </UiPageContainer>

    <UiPageContainer
      as="section"
      class="projects-page__content"
      width="wide"
      aria-label="项目列表"
    >
      <PublicCollectionState
        label="项目"
        recovery-href="/projects"
        :status="status"
        @retry="emit('retry')"
      >
        <div class="projects-page__grid">
          <PortfolioProjectCard
            v-for="project in response?.data"
            :key="project.id"
            :project="project"
          />
        </div>
      </PublicCollectionState>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.projects-page,
.projects-page__content {
  min-height: 100%;
}

.projects-page__intro {
  padding-top: var(--public-heading-offset);
  padding-bottom: var(--space-12);
}

.projects-page__intro-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-8);
}

.projects-page__summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  text-align: end;
}

.projects-page__content {
  padding-bottom: var(--space-section);
}

.projects-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--space-5);
}

@media (width <= 48rem) {
  .projects-page__intro {
    padding-bottom: var(--space-10);
  }

  .projects-page__intro-copy {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .projects-page__summary {
    justify-content: flex-start;
    text-align: start;
  }

  .projects-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
