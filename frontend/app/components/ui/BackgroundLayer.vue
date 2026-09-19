<script setup lang="ts">
type BackgroundTreatment = 'atmospheric' | 'plain'

withDefaults(
  defineProps<{
    treatment?: BackgroundTreatment
  }>(),
  {
    treatment: 'atmospheric',
  },
)
</script>

<template>
  <div class="background-layer" :data-treatment="treatment" aria-hidden="true">
    <div v-if="$slots.media" class="background-layer__media">
      <slot name="media" />
    </div>
    <div class="background-layer__veil" />
    <slot />
  </div>
</template>

<style scoped>
.background-layer {
  position: fixed;
  z-index: var(--z-background);
  inset: 0;
  overflow: hidden;
  background: var(--color-canvas);
  pointer-events: none;
}

.background-layer__media,
.background-layer__veil {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.background-layer[data-treatment='atmospheric'] .background-layer__veil {
  background: var(--background-veil);
}

.background-layer[data-treatment='plain'] .background-layer__veil {
  background: var(--color-canvas);
}

@media (width <= 48rem) {
  .background-layer[data-treatment='atmospheric'] .background-layer__veil {
    background: var(--background-veil-mobile);
  }
}
</style>
