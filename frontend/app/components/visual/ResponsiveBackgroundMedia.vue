<script setup lang="ts">
withDefaults(
  defineProps<{
    eager?: boolean
    sizes: string
  }>(),
  {
    eager: false,
  },
)
</script>

<template>
  <picture class="responsive-background-media">
    <source
      type="image/avif"
      srcset="
        /images/background/ambient-640.avif   640w,
        /images/background/ambient-1280.avif 1280w,
        /images/background/ambient-1920.avif 1920w
      "
      :sizes="sizes"
    />
    <source
      type="image/webp"
      srcset="
        /images/background/ambient-640.webp   640w,
        /images/background/ambient-1280.webp 1280w,
        /images/background/ambient-1920.webp 1920w
      "
      :sizes="sizes"
    />
    <img
      class="responsive-background-media__image"
      src="/images/background/ambient-1280.jpg"
      srcset="
        /images/background/ambient-640.jpg   640w,
        /images/background/ambient-1280.jpg 1280w,
        /images/background/ambient-1920.jpg 1920w
      "
      :sizes="sizes"
      alt=""
      width="640"
      height="451"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
    />
  </picture>
</template>
