<script setup lang="ts">
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import {
  musicPlaybackKey,
  useMusicPlaybackController,
} from '~/composables/musicPlayback'

const {
  error: settingsError,
  pending: settingsPending,
  refresh: refreshSettings,
} = await usePublicSiteSettings()
const isHydrated = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)
const musicPlayback = useMusicPlaybackController(audioElement)

provide(musicPlaybackKey, musicPlayback)

onMounted(() => {
  isHydrated.value = true
})
</script>

<template>
  <div class="public-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <VisualFoundationHeader />
    <VisualClickRipple />
    <div
      v-if="isHydrated && (settingsPending || settingsError)"
      class="public-shell__settings-status"
      :role="settingsError ? 'alert' : 'status'"
      :aria-busy="settingsPending"
    >
      <span>
        {{
          settingsPending
            ? '正在加载站点设置…'
            : '站点设置暂时无法加载，当前显示基础信息。'
        }}
      </span>
      <button
        v-if="settingsError"
        type="button"
        @click="() => refreshSettings()"
      >
        重新加载
      </button>
    </div>
    <main id="main-content" class="public-main" tabindex="-1">
      <slot />
    </main>
    <audio
      ref="audioElement"
      class="music-engine"
      data-testid="music-engine"
      preload="none"
      aria-hidden="true"
      tabindex="-1"
      @ended="musicPlayback.handleAudioEnded"
      @error.stop="musicPlayback.handleAudioError"
      @loadedmetadata="musicPlayback.handleLoadedMetadata"
      @timeupdate="musicPlayback.handleTimeUpdate"
    />
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

.music-engine {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.public-main {
  flex: 1 0 auto;
  min-width: 0;
}

.public-shell__settings-status {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--space-5);
  left: 50%;
  display: flex;
  max-width: min(36rem, calc(100vw - 2rem));
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-card), var(--glass-highlight);
  color: var(--color-text);
  font-size: var(--text-small);
  transform: translateX(-50%);
}

.public-shell__settings-status button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-small);
  background: var(--glass-card-bg);
  color: var(--color-text);
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
