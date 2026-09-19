<script setup lang="ts">
type HeaderElement = 'div' | 'header'
type HeaderAlignment = 'center' | 'start'
type HeadingLevel = 1 | 2 | 3

const props = withDefaults(
  defineProps<{
    align?: HeaderAlignment
    as?: HeaderElement
    description?: string
    eyebrow?: string
    headingLevel?: HeadingLevel
    title: string
    titleId?: string
  }>(),
  {
    align: 'start',
    as: 'header',
    description: undefined,
    eyebrow: undefined,
    headingLevel: 2,
    titleId: undefined,
  },
)

const headingTag = computed(
  () => `h${props.headingLevel}` as 'h1' | 'h2' | 'h3',
)
</script>

<template>
  <component :is="as" class="section-header" :data-align="align">
    <p v-if="eyebrow" class="section-header__eyebrow">{{ eyebrow }}</p>
    <component :is="headingTag" :id="titleId" class="section-header__title">
      {{ title }}
    </component>
    <p v-if="description" class="section-header__description">
      {{ description }}
    </p>
    <slot />
  </component>
</template>

<style scoped>
.section-header {
  display: grid;
  max-width: var(--measure-copy);
  gap: var(--space-4);
  min-width: 0;
}

.section-header[data-align='center'] {
  justify-items: center;
  margin-inline: auto;
  text-align: center;
}

.section-header__eyebrow,
.section-header__title,
.section-header__description {
  margin: 0;
  overflow-wrap: anywhere;
}

.section-header__eyebrow {
  color: var(--color-accent-soft);
  font-family: var(--font-ui);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.section-header__title {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h2);
  line-height: var(--leading-display);
  text-wrap: balance;
}

.section-header__title:is(h1) {
  font-size: var(--text-h1);
}

.section-header__title:is(h3) {
  font-size: var(--text-h3);
}

.section-header__description {
  max-width: var(--measure-copy);
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  text-wrap: pretty;
}
</style>
