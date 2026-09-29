<script setup lang="ts">
import { ExternalLink, Globe2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { FriendLink } from '../../types/portfolio'
import { getSafeExternalUrl } from '../../utils/external-links'

const props = defineProps<{
  friend: FriendLink
}>()

const avatarUnavailable = ref(false)
const safeUrl = computed(() => getSafeExternalUrl(props.friend.url))

const markAvatarUnavailable = () => {
  avatarUnavailable.value = true
}
</script>

<template>
  <UiGlassCard as="article" class="friend-card" data-friend-card hoverable>
    <header class="friend-card__header">
      <img
        v-if="props.friend.avatar && !avatarUnavailable"
        :src="props.friend.avatar.src"
        :alt="props.friend.avatar.alt"
        :width="props.friend.avatar.width"
        :height="props.friend.avatar.height"
        loading="lazy"
        decoding="async"
        @error="markAvatarUnavailable"
      />
      <div
        v-else
        class="friend-card__avatar"
        role="img"
        :aria-label="`${props.friend.name}${avatarUnavailable ? '：头像暂不可用' : '：头像'}`"
      >
        <Globe2 :size="22" aria-hidden="true" />
      </div>
      <div>
        <p class="friend-card__eyebrow">CURATED LINK</p>
        <h2>{{ props.friend.name }}</h2>
      </div>
    </header>

    <p class="friend-card__description">{{ props.friend.description }}</p>

    <ul
      v-if="props.friend.tags?.length"
      class="friend-card__tags"
      aria-label="友链标签"
    >
      <li v-for="tag in props.friend.tags" :key="tag">{{ tag }}</li>
    </ul>

    <footer class="friend-card__footer">
      <a
        v-if="safeUrl"
        :href="safeUrl"
        :aria-label="`${props.friend.name} 网站（外部链接）`"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
      >
        访问网站
        <ExternalLink :size="15" aria-hidden="true" />
      </a>
      <span v-else class="friend-card__unavailable">链接暂不可用</span>
      <span class="friend-card__honesty">人工整理 · 不代表在线状态</span>
    </footer>
  </UiGlassCard>
</template>

<style scoped>
.friend-card {
  height: 100%;
}

.friend-card__header,
.friend-card__footer,
.friend-card__footer a,
.friend-card__avatar {
  display: flex;
  align-items: center;
}

.friend-card__header {
  gap: var(--space-4);
}

.friend-card__header > img,
.friend-card__avatar {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 3.5rem;
  place-items: center;
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-round);
  background: var(--color-secondary);
  box-shadow: none;
  color: var(--color-canvas-raised);
  object-fit: cover;
}

.friend-card__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.friend-card h2 {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
  overflow-wrap: anywhere;
}

.friend-card__description {
  margin: var(--space-6) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.friend-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

.friend-card__tags li {
  padding: var(--space-1) var(--space-2);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.friend-card__footer {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-8);
  padding-top: var(--space-4);
  border-top: var(--border-hairline) solid var(--glass-border);
}

.friend-card__footer a,
.friend-card__unavailable {
  min-height: 2.75rem;
  gap: var(--space-2);
  color: var(--color-text);
  font-size: var(--text-small);
}

.friend-card__footer a:hover {
  color: var(--color-accent-soft);
  transform: translateY(calc(var(--motion-distance-small) * -1));
}

.friend-card__honesty {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  overflow-wrap: anywhere;
}

.friend-card__unavailable {
  color: var(--color-text-subtle);
}

@media (width <= 36rem) {
  .friend-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .friend-card__footer a:hover {
    transform: none;
  }
}
</style>
