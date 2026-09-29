<script setup lang="ts">
import { Clock3, ExternalLink, Github, Star } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { Project } from '../../types/portfolio'
import { getSafeExternalUrl } from '../../utils/external-links'

const props = defineProps<{
  project: Project
}>()

const logoUnavailable = ref(false)

const isPersonalProject = computed(
  () => props.project.projectType === 'personal',
)
const sourceUrl = computed(() =>
  props.project.projectType === 'personal'
    ? getSafeExternalUrl(props.project.sourceUrl)
    : undefined,
)
const repositoryUrl = computed(() =>
  props.project.projectType === 'github_open_source'
    ? getSafeExternalUrl(props.project.repositoryUrl)
    : undefined,
)
const demoUrl = computed(() =>
  props.project.projectType === 'personal'
    ? getSafeExternalUrl(props.project.demoUrl)
    : undefined,
)
const statusLabels = {
  active: 'Active',
  archived: 'Archived',
  developing: 'Developing',
} as const

const markLogoUnavailable = () => {
  logoUnavailable.value = true
}
</script>

<template>
  <UiGlassCard as="article" class="project-card" data-project-card hoverable>
    <header class="project-card__header">
      <div class="project-card__identity">
        <img
          v-if="props.project.logo && !logoUnavailable"
          :src="props.project.logo.src"
          :alt="props.project.logo.alt"
          :width="props.project.logo.width"
          :height="props.project.logo.height"
          loading="lazy"
          decoding="async"
          @error="markLogoUnavailable"
        />
        <div
          v-else
          class="project-card__mark"
          role="img"
          :aria-label="`${props.project.name}${logoUnavailable ? '：媒体暂不可用' : '：项目标志'}`"
        >
          <span aria-hidden="true">{{ props.project.name.slice(0, 1) }}</span>
          <span v-if="logoUnavailable" class="project-card__mark-label">
            媒体暂不可用
          </span>
        </div>
        <div>
          <p class="project-card__eyebrow">
            {{
              props.project.projectType === 'personal'
                ? 'PERSONAL PROJECT'
                : 'GITHUB OPEN-SOURCE PROJECT'
            }}
          </p>
          <h2>{{ props.project.name }}</h2>
        </div>
      </div>
      <div class="project-card__badges">
        <UiBadge
          v-if="props.project.projectType === 'personal'"
          :tone="props.project.status === 'active' ? 'success' : 'neutral'"
        >
          {{ statusLabels[props.project.status] }}
        </UiBadge>
        <UiBadge v-else tone="accent">GitHub 开源</UiBadge>
        <UiBadge v-if="props.project.featured" tone="accent">
          <Star :size="13" aria-hidden="true" />
          精选
        </UiBadge>
      </div>
    </header>

    <p class="project-card__description">{{ props.project.description }}</p>

    <dl
      v-if="props.project.projectType === 'personal'"
      class="project-card__meta"
    >
      <div>
        <dt><Clock3 :size="14" aria-hidden="true" /> 开发时间</dt>
        <dd>{{ props.project.timeSpan }}</dd>
      </div>
      <div>
        <dt>状态</dt>
        <dd>{{ statusLabels[props.project.status] }}</dd>
      </div>
    </dl>

    <ul
      v-if="props.project.projectType === 'personal'"
      class="project-card__stack"
      aria-label="技术栈"
    >
      <li v-for="item in props.project.stack" :key="item">{{ item }}</li>
    </ul>

    <ul
      v-if="
        props.project.projectType === 'personal' &&
        props.project.highlights?.length
      "
      class="project-card__highlights"
    >
      <li v-for="highlight in props.project.highlights" :key="highlight">
        {{ highlight }}
      </li>
    </ul>

    <footer class="project-card__footer">
      <a
        v-if="repositoryUrl"
        :href="repositoryUrl"
        :aria-label="`${props.project.name} GitHub 仓库（外部链接）`"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
      >
        <Github :size="16" aria-hidden="true" />
        GitHub 仓库
      </a>
      <a
        v-else-if="sourceUrl"
        :href="sourceUrl"
        :aria-label="`${props.project.name} 源码（外部链接）`"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
      >
        <Github :size="16" aria-hidden="true" />
        Source
      </a>
      <span v-else-if="isPersonalProject" class="project-card__unavailable"
        >暂无源码链接</span
      >
      <a
        v-if="demoUrl"
        :href="demoUrl"
        :aria-label="`${props.project.name} 演示（外部链接）`"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
      >
        Demo
        <ExternalLink :size="15" aria-hidden="true" />
      </a>
      <span v-else-if="isPersonalProject" class="project-card__unavailable"
        >暂无公开演示</span
      >
    </footer>
  </UiGlassCard>
</template>

<style scoped>
.project-card {
  height: 100%;
}

.project-card__header,
.project-card__identity,
.project-card__badges,
.project-card__footer,
.project-card__footer a,
.project-card__meta dt {
  display: flex;
  align-items: center;
}

.project-card__header {
  justify-content: space-between;
  gap: var(--space-4);
}

.project-card__identity {
  min-width: 0;
  gap: var(--space-4);
}

.project-card__identity > img,
.project-card__mark {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 3.5rem;
  place-items: center;
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--color-secondary);
  box-shadow: none;
  color: var(--color-canvas-raised);
  object-fit: cover;
}

.project-card__mark {
  position: relative;
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: var(--font-weight-bold);
}

.project-card__mark-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.project-card__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.project-card h2 {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
  overflow-wrap: anywhere;
}

.project-card__badges {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.project-card__description {
  margin: var(--space-6) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.project-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: var(--space-6) 0 0;
}

.project-card__meta > div {
  min-width: 0;
  padding-top: var(--space-3);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.project-card__meta dt,
.project-card__meta dd {
  margin: 0;
}

.project-card__meta dt {
  gap: var(--space-1);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.project-card__meta dd {
  margin-top: var(--space-2);
  color: var(--color-text);
  font-size: var(--text-small);
  overflow-wrap: anywhere;
}

.project-card__stack,
.project-card__highlights {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

.project-card__stack li {
  padding: var(--space-1) var(--space-2);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.project-card__highlights {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: 1.55;
}

.project-card__highlights li {
  overflow-wrap: anywhere;
}

.project-card__highlights li::before {
  margin-right: var(--space-2);
  color: var(--color-accent-soft);
  content: '✦';
}

.project-card__footer {
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-5);
  margin-top: var(--space-8);
  padding-top: var(--space-4);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.project-card__footer a,
.project-card__unavailable {
  min-height: 2.75rem;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.project-card__footer a:hover {
  color: var(--color-text);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

.project-card__unavailable {
  color: var(--color-text-subtle);
}

@media (width <= 36rem) {
  .project-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .project-card__badges {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .project-card__footer a:hover {
    transform: none;
  }
}
</style>
