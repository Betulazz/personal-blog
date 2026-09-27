<script setup lang="ts">
import { Music2, Pause, Play, SkipForward } from 'lucide-vue-next'

import { useApiClient } from '~/api/client'
import { useMusicPlayback } from '~/composables/musicPlayback'
import { useMusicTracks } from '~/composables/useMusicTracks'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import { useMusicPlayerStore } from '~/stores/musicPlayer'
import { getActiveMusicLyricIndex } from '~/utils/music-lyrics'

const player = useMusicPlayerStore()
const api = useApiClient()
const playback = useMusicPlayback()
const route = useRoute()
const {
  data: trackResponse,
  error: trackError,
  pending: tracksPending,
  refresh: refreshTracks,
} = await useMusicTracks()
const { settings } = await usePublicSiteSettings()

const musicVisible = computed(() => settings.value.homepageVisibility.music)
const isExcludedRoute = computed(
  () => route.path === '/' || route.path === '/music',
)
const isHydrated = ref(false)
const isFooterVisible = ref(false)
const failedArtworkTrackId = ref<string | null>(null)
const artworkImage = ref<HTMLImageElement | null>(null)
let playerHeight = 72
let playerBottomInset = 16
let footerCheckFrame = 0

watch(
  trackResponse,
  (response) => {
    player.setTracks(response?.data ?? [])
  },
  { immediate: true },
)

watch(
  () => player.currentTrack?.id,
  (trackId) => {
    failedArtworkTrackId.value = null
    if (isHydrated.value) {
      void player.loadLyrics(api.getMusicTrackLyrics, trackId)
    }
    void nextTick(checkArtwork)
  },
)

const currentLyric = computed(() => {
  if (
    !player.currentTrack ||
    player.error ||
    !player.hasClockPosition ||
    player.lyricsTrackId !== player.currentTrack.id ||
    player.lyricsStatus !== 'ready' ||
    !player.lyrics ||
    player.lyrics.status !== 'available'
  ) {
    return null
  }

  const index = getActiveMusicLyricIndex(
    player.lyrics.lines,
    player.currentTime * 1000,
  )
  return index < 0 ? null : (player.lyrics.lines[index]?.text ?? null)
})

const lyricStateMessage = computed(() => {
  if (!isHydrated.value) {
    return '播放后显示同步歌词'
  }
  if (player.error === 'source-unavailable') {
    return '当前歌曲暂不可用'
  }
  if (player.error === 'autoplay-blocked') {
    return '请点击播放以继续'
  }
  if (player.error === 'playback-failed') {
    return '播放暂时失败'
  }
  if (!player.currentTrack) {
    return tracksPending.value ? '正在加载音乐…' : '暂无可播放歌曲'
  }
  if (player.lyricsTrackId !== player.currentTrack.id) {
    return '正在同步歌词…'
  }
  if (player.lyricsStatus === 'loading') {
    return '正在同步歌词…'
  }
  if (player.lyricsStatus === 'error') {
    return '歌词暂时无法加载'
  }
  if (
    player.lyricsStatus === 'ready' &&
    (player.lyrics?.status !== 'available' || !player.lyrics.lines.length)
  ) {
    return '暂无同步歌词'
  }
  if (!player.hasClockPosition) {
    return '播放后显示同步歌词'
  }
  return '前奏 · 暂无同步歌词'
})

const playbackErrorMessage = computed(() => {
  switch (player.error) {
    case 'source-unavailable':
      return '当前音源暂不可用，可切换到下一首。'
    case 'autoplay-blocked':
      return '浏览器阻止了自动播放，请再次点击播放。'
    case 'playback-failed':
      return '播放没有成功，请稍后重试或切换歌曲。'
    default:
      return ''
  }
})

const shouldShowPlayer = computed(
  () =>
    !isExcludedRoute.value &&
    musicVisible.value &&
    !isFooterVisible.value &&
    (player.currentTrack || isHydrated.value),
)

function updateFooterAvoidance() {
  const footer = document.querySelector('.site-footer')
  if (!footer) {
    isFooterVisible.value = false
    return
  }

  const playerElement = document.querySelector('.music-player')
  if (playerElement) {
    playerHeight = playerElement.getBoundingClientRect().height
    const bottomValue = Number.parseFloat(
      getComputedStyle(playerElement).bottom,
    )
    if (Number.isFinite(bottomValue)) playerBottomInset = bottomValue
  }

  const footerRect = footer.getBoundingClientRect()
  const playerBottom = window.innerHeight - playerBottomInset
  const playerTop = playerBottom - playerHeight
  isFooterVisible.value =
    footerRect.top < playerBottom && footerRect.bottom > playerTop
}

function scheduleFooterCheck() {
  if (footerCheckFrame) return
  footerCheckFrame = window.requestAnimationFrame(() => {
    footerCheckFrame = 0
    updateFooterAvoidance()
  })
}

function retryTracks() {
  void refreshTracks()
}

function handleArtworkError() {
  failedArtworkTrackId.value = player.currentTrack?.id ?? null
}

function checkArtwork() {
  const image = artworkImage.value
  if (image?.complete && image.naturalWidth === 0) {
    handleArtworkError()
  }
}

onMounted(() => {
  isHydrated.value = true
  updateFooterAvoidance()
  void nextTick(checkArtwork)
  void player.loadLyrics(api.getMusicTrackLyrics, player.currentTrack?.id)
  window.addEventListener('scroll', scheduleFooterCheck, { passive: true })
  window.addEventListener('resize', scheduleFooterCheck)
})

watch(
  () => route.path,
  async () => {
    await nextTick()
    updateFooterAvoidance()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleFooterCheck)
  window.removeEventListener('resize', scheduleFooterCheck)
  if (footerCheckFrame) window.cancelAnimationFrame(footerCheckFrame)
})
</script>

<template>
  <section
    v-if="shouldShowPlayer"
    class="music-player"
    data-testid="music-player"
    data-compact-player="true"
    :data-player-ready="isHydrated"
    :data-player-status="player.status"
    :aria-busy="tracksPending || undefined"
    aria-label="音乐播放器"
  >
    <template v-if="player.currentTrack">
      <div
        class="music-player__record"
        :class="{ 'music-player__record--playing': player.isPlaying }"
      >
        <img
          v-if="
            player.currentTrack.artworkUrl &&
            failedArtworkTrackId !== player.currentTrack.id
          "
          :key="player.currentTrack.id"
          ref="artworkImage"
          class="music-player__artwork"
          :src="player.currentTrack.artworkUrl"
          :alt="
            player.currentTrack.artworkAlt ||
            `${player.currentTrack.title} 封面`
          "
          decoding="async"
          @error="handleArtworkError"
        />
        <span
          v-else
          class="music-player__artwork-fallback"
          role="img"
          :aria-label="`${player.currentTrack.title} 的封面暂不可用`"
        >
          <Music2 :size="19" stroke-width="1.6" aria-hidden="true" />
        </span>
        <span class="music-player__record-hole" aria-hidden="true" />
      </div>

      <div class="music-player__copy">
        <strong class="music-player__title" :title="player.currentTrack.title">
          {{ player.currentTrack.title }}
        </strong>
        <span class="music-player__artist" :title="player.currentTrack.artist">
          {{ player.currentTrack.artist }}
        </span>
        <span class="music-player__lyric" aria-live="off">
          {{ currentLyric || lyricStateMessage }}
        </span>
      </div>

      <div class="music-player__controls" aria-label="音乐播放控制">
        <button
          type="button"
          class="music-player__control music-player__control--play"
          :aria-label="player.isPlaying ? '暂停' : '播放'"
          :aria-busy="player.status === 'loading' || undefined"
          @click="playback.togglePlayback"
        >
          <Pause v-if="player.isPlaying" :size="19" aria-hidden="true" />
          <Play v-else :size="19" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="music-player__control"
          aria-label="下一首"
          @click="playback.skipNext"
        >
          <SkipForward :size="19" aria-hidden="true" />
        </button>
      </div>
    </template>

    <div v-else class="music-player__empty" role="status">
      <Music2 :size="20" aria-hidden="true" />
      <span>
        {{
          tracksPending
            ? '正在加载音乐…'
            : trackError
              ? '音乐暂时无法加载。'
              : '暂时没有可播放的音乐。'
        }}
      </span>
      <button
        v-if="trackError"
        type="button"
        class="music-player__retry"
        @click="retryTracks"
      >
        重新加载
      </button>
    </div>

    <p v-if="playbackErrorMessage" class="music-player__message" role="status">
      {{ playbackErrorMessage }}
    </p>
  </section>
</template>

<style scoped>
.music-player {
  position: fixed;
  z-index: var(--z-sticky);
  right: max(var(--space-4), env(safe-area-inset-right));
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
  display: flex;
  width: max-content;
  max-width: calc(100vw - 1.5rem);
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-round);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-panel), var(--glass-highlight), var(--shadow-glow);
  backdrop-filter: blur(var(--glass-blur-panel))
    saturate(var(--glass-saturation));
}

.music-player__record {
  position: relative;
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgb(211 217 255 / 24%);
  border-radius: 50%;
  background:
    repeating-radial-gradient(
      circle,
      transparent 0 4px,
      rgb(240 242 255 / 11%) 5px 6px
    ),
    radial-gradient(circle at 34% 26%, #333e71, #0b1022 64%, #03050d 100%);
  box-shadow: inset 0 0 1rem rgb(255 255 255 / 6%);
}

.music-player__record--playing {
  animation: compact-record-rotate var(--motion-duration-record) linear infinite;
}

.music-player__artwork,
.music-player__artwork-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.music-player__artwork {
  object-fit: cover;
}

.music-player__artwork-fallback {
  display: grid;
  place-items: center;
  background: radial-gradient(circle, #343b69, #171d3b 58%, #0c1024);
  color: #e0e3ff;
}

.music-player__record-hole {
  position: absolute;
  width: 17%;
  aspect-ratio: 1;
  border: 1px solid rgb(225 228 255 / 78%);
  border-radius: 50%;
  background: #11162c;
  box-shadow: 0 0 0 2px rgb(10 14 32 / 22%);
  pointer-events: none;
}

.music-player__copy {
  display: grid;
  min-width: 0;
  width: min(13rem, calc(100vw - 12rem));
  gap: 0.075rem;
}

.music-player__title,
.music-player__artist,
.music-player__lyric {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-player__title {
  color: var(--color-text);
  font-size: var(--text-small);
  font-weight: 600;
}

.music-player__artist {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.music-player__lyric {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
}

.music-player__controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.125rem;
}

.music-player__control {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    color var(--motion-duration-fast) var(--motion-ease-standard),
    background-color var(--motion-duration-fast) var(--motion-ease-standard),
    border-color var(--motion-duration-fast) var(--motion-ease-standard);
}

.music-player__control:hover {
  border-color: var(--glass-border);
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.music-player__control--play {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.music-player__control:focus-visible,
.music-player__retry:focus-visible {
  outline: 2px solid var(--color-accent-soft);
  outline-offset: 2px;
}

.music-player__message {
  position: absolute;
  right: 0;
  bottom: calc(100% + var(--space-2));
  max-width: min(22rem, calc(100vw - 2rem));
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-card);
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
}

.music-player__empty {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.music-player__retry {
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-3);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-small);
  background: var(--glass-card-bg);
  color: var(--color-text);
  cursor: pointer;
}

@keyframes compact-record-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-player__record--playing {
    animation: none;
  }

  .music-player__control {
    transition: none;
  }
}
</style>
