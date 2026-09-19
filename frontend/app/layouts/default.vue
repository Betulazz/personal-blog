<template>
  <div class="public-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <VisualFoundationHeader />
    <main id="main-content" class="public-main" tabindex="-1">
      <slot />
    </main>
    <VisualPublicFooter />
    <VisualMusicPlayer />
  </div>
</template>

<style scoped>
.public-shell {
  position: relative;
  z-index: var(--z-base);
  display: flex;
  min-height: 100svh;
  flex-direction: column;
  padding-bottom: var(--public-shell-safe-bottom);
  isolation: isolate;
}

.public-main {
  flex: 1 0 auto;
  min-width: 0;
}

.public-main:focus {
  outline: none;
}

.skip-link {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--space-4);
  left: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-card), var(--glass-highlight);
  color: var(--color-text);
  transform: translateY(-180%);
  transition: transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.skip-link:focus {
  transform: translateY(0);
}
</style>
