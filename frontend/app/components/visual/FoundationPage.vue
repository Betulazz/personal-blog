<template>
  <div class="foundation-page">
    <VisualFoundationHero />
    <section id="reading" class="continuation" aria-label="后续内容预览" />
  </div>
</template>

<style scoped>
.foundation-page {
  position: relative;
  min-height: 112svh;
  isolation: isolate;
}

.continuation {
  min-height: 12svh;
  border-top: 1px solid rgb(191 205 255 / 8%);
  background: linear-gradient(180deg, transparent, rgb(5 9 22 / 82%));
}
</style>
