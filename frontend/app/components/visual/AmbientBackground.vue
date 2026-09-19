<template>
  <UiBackgroundLayer class="ambient-background">
    <template #media>
      <VisualResponsiveBackgroundMedia
        class="ambient-background__media"
        sizes="100vw"
        eager
      />
    </template>
    <UiGlowLayer
      class="ambient-background__glow"
      tone="accent"
      position="top-end"
    />
    <UiGlowLayer
      class="ambient-background__glow"
      tone="secondary"
      position="bottom-start"
    />
  </UiBackgroundLayer>
</template>

<style scoped>
.ambient-background__media,
.ambient-background__media :deep(.responsive-background-media__image) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ambient-background__media :deep(.responsive-background-media__image) {
  object-fit: cover;
  object-position: 45% center;
  filter: saturate(0.8) contrast(0.95);
}

@media (width <= 48rem) {
  .ambient-background__media :deep(.responsive-background-media__image) {
    object-position: 37% center;
  }

  .ambient-background__glow {
    display: none;
  }
}
</style>
