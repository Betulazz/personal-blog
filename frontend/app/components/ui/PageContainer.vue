<script setup lang="ts">
type ContainerElement = 'article' | 'div' | 'main' | 'section'
type ContainerWidth = 'full' | 'reading' | 'wide'

withDefaults(
  defineProps<{
    as?: ContainerElement
    width?: ContainerWidth
  }>(),
  {
    as: 'div',
    width: 'wide',
  },
)
</script>

<template>
  <component :is="as" class="page-container" :data-width="width">
    <slot />
  </component>
</template>

<style scoped>
.page-container {
  width: 100%;
  margin-inline: auto;
  padding-inline: var(--gutter-page);
}

.page-container[data-width='wide'] {
  max-width: calc(var(--container-wide) + var(--gutter-page) * 2);
}

.page-container[data-width='reading'] {
  max-width: calc(var(--container-reading) + var(--gutter-page) * 2);
}

.page-container[data-width='full'] {
  max-width: none;
}
</style>
