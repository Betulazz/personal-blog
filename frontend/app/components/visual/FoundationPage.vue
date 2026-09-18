<template>
  <div class="foundation-page">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <VisualFoundationHeader />
    <VisualFoundationHero />
    <section id="reading" class="continuation" aria-label="后续内容预览" />
  </div>
</template>

<style scoped>
.foundation-page {
  position: relative;
  z-index: var(--z-base);
  min-height: 112svh;
  isolation: isolate;
}

.skip-link {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--space-4);
  left: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  transform: translateY(-180%);
  transition: transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.skip-link:focus {
  transform: translateY(0);
}

.continuation {
  min-height: 12svh;
  border-top: 1px solid rgb(191 205 255 / 8%);
  background: linear-gradient(180deg, transparent, rgb(5 9 22 / 82%));
}
</style>
