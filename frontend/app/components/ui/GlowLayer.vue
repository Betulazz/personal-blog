<script setup lang="ts">
type GlowIntensity = 'default' | 'strong' | 'subtle'
type GlowPosition = 'bottom-start' | 'center' | 'top-end'
type GlowTone = 'accent' | 'secondary'

withDefaults(
  defineProps<{
    intensity?: GlowIntensity
    position?: GlowPosition
    tone?: GlowTone
  }>(),
  {
    intensity: 'default',
    position: 'center',
    tone: 'accent',
  },
)
</script>

<template>
  <div
    class="glow-layer"
    :data-intensity="intensity"
    :data-position="position"
    :data-tone="tone"
    aria-hidden="true"
  />
</template>

<style scoped>
.glow-layer {
  position: absolute;
  width: var(--glow-size);
  aspect-ratio: 1;
  border-radius: var(--radius-round);
  filter: blur(var(--blur-ambient));
  opacity: var(--glow-opacity-default);
  pointer-events: none;
}

.glow-layer[data-tone='accent'] {
  background: radial-gradient(
    circle,
    var(--glow-accent),
    transparent var(--glow-fade-stop)
  );
}

.glow-layer[data-tone='secondary'] {
  background: radial-gradient(
    circle,
    var(--glow-secondary),
    transparent var(--glow-fade-stop)
  );
}

.glow-layer[data-intensity='subtle'] {
  opacity: var(--glow-opacity-subtle);
}

.glow-layer[data-intensity='strong'] {
  opacity: var(--glow-opacity-strong);
}

.glow-layer[data-position='top-end'] {
  top: var(--glow-top-offset);
  right: var(--glow-end-offset);
}

.glow-layer[data-position='bottom-start'] {
  bottom: var(--glow-bottom-offset);
  left: var(--glow-start-offset);
}

.glow-layer[data-position='center'] {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
