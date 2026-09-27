<script setup lang="ts">
import { computed } from 'vue'
import { useOnline } from '@vueuse/core'

import type { ProjectCollectionResponse, ProjectType } from '~/types/portfolio'

const props = defineProps<{
  error?: unknown
  page: number
  pageCount: number
  pending: boolean
  projectType: ProjectType
  recoveryHref: string
  response: ProjectCollectionResponse | null
}>()

const emit = defineEmits<{
  retry: []
  selectPage: [page: number]
  selectType: [type: ProjectType]
}>()

const isOnline = useOnline()
const projectLabel = computed(() =>
  props.projectType === 'github_open_source' ? '开源项目' : '自己的项目',
)

const status = computed(() => {
  if (props.pending) return 'loading' as const
  if (!isOnline.value && !props.response) return 'offline' as const
  if (props.error) return 'error' as const
  if (props.response?.pagination.total && props.response.data.length === 0) {
    return 'out-of-range' as const
  }
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
        <div class="projects-page__toolbar">
          <fieldset class="projects-page__switch" data-project-variant-switch>
            <legend class="projects-page__visually-hidden">项目类型</legend>
            <label class="projects-page__switch-option">
              <input
                type="radio"
                name="project-type"
                value="github_open_source"
                :checked="projectType === 'github_open_source'"
                @change="emit('selectType', 'github_open_source')"
              />
              <span>开源项目</span>
            </label>
            <label class="projects-page__switch-option">
              <input
                type="radio"
                name="project-type"
                value="personal"
                :checked="projectType === 'personal'"
                @change="emit('selectType', 'personal')"
              />
              <span>自己的项目</span>
            </label>
          </fieldset>
          <div class="projects-page__summary" aria-live="polite">
            <UiBadge tone="accent">
              {{ response?.pagination.total ?? 0 }} 个项目
            </UiBadge>
            <span>{{ featuredCount }} 个精选项目</span>
          </div>
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
        empty-message="这个类型暂时没有可展示的项目，可以切换项目类型查看其他内容。"
        :label="projectLabel"
        :recovery-href="recoveryHref"
        :status="status"
        @retry="emit('retry')"
      >
        <div id="projects-results" class="projects-page__grid">
          <PortfolioProjectCard
            v-for="project in response?.data"
            :key="project.id"
            :project="project"
          />
        </div>
      </PublicCollectionState>
      <nav
        v-if="status === 'ready' && pageCount > 1"
        class="projects-page__pagination"
        :aria-label="`${projectLabel}分页`"
      >
        <button
          class="projects-page__page-button"
          type="button"
          :disabled="page <= 1"
          @click="emit('selectPage', page - 1)"
        >
          上一页
        </button>
        <span aria-live="polite">第 {{ page }} / {{ pageCount }} 页</span>
        <button
          class="projects-page__page-button"
          type="button"
          :disabled="page >= pageCount"
          @click="emit('selectPage', page + 1)"
        >
          下一页
        </button>
      </nav>
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

.projects-page__toolbar {
  display: grid;
  justify-items: end;
  gap: var(--space-3);
}

.projects-page__switch {
  display: flex;
  max-width: 100%;
  gap: var(--space-1);
  padding: var(--space-1);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  background: var(--glass-subtle-bg);
  box-shadow: var(--glass-highlight);
}

.projects-page__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.projects-page__switch-option {
  position: relative;
  display: inline-flex;
  min-height: 2.75rem;
  cursor: pointer;
}

.projects-page__switch-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.projects-page__switch-option span {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid transparent;
  border-radius: var(--radius-round);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition:
    background-color var(--motion-duration-fast) var(--motion-ease-standard),
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    color var(--motion-duration-fast) var(--motion-ease-standard);
}

.projects-page__switch-option input:checked + span {
  border-color: var(--glass-border-hover);
  background: var(--glass-card-bg);
  color: var(--color-text);
  box-shadow: var(--glass-highlight);
}

.projects-page__switch-option input:focus-visible + span {
  outline: 2px solid var(--color-accent-soft);
  outline-offset: 2px;
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

.projects-page__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-8);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.projects-page__page-button {
  min-width: 6rem;
  min-height: 2.75rem;
  padding-inline: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-card-bg);
  color: var(--color-text);
  font: inherit;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.projects-page__page-button:focus-visible {
  outline: 2px solid var(--color-accent-soft);
  outline-offset: 2px;
}

.projects-page__page-button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

@media (width <= 48rem) {
  .projects-page__intro {
    padding-bottom: var(--space-10);
  }

  .projects-page__intro-copy {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .projects-page__toolbar {
    justify-items: start;
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
