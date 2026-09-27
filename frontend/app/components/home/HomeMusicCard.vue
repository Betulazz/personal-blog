<script setup lang="ts">
import {
  ArrowUpRight,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-vue-next'

import { useMusicPlayback } from '~/composables/musicPlayback'
import { useMusicTracks } from '~/composables/useMusicTracks'
import { useMusicPlayerStore } from '~/stores/musicPlayer'

const player = useMusicPlayerStore()
const playback = useMusicPlayback()
const {
  data: trackResponse,
  error: trackError,
  pending: tracksPending,
  refresh: refreshTracks,
} = await useMusicTracks()
const failedArtworkTrackId = ref<string | null>(null)

watch(
  trackResponse,
  (response) => {
    player.setTracks(response?.data ?? [])
  },
  { immediate: true },
)

watch(
  () => player.currentTrack?.id,
  () => {
    failedArtworkTrackId.value = null
  },
)

const trackDuration = computed(
  () => player.duration || player.currentTrack?.durationSeconds || 0,
)
const formattedCurrentTime = computed(() => formatTime(player.currentTime))
const formattedDuration = computed(() => formatTime(trackDuration.value))
const progressPercent = computed(() =>
  trackDuration.value > 0
    ? Math.min(100, (player.currentTime / trackDuration.value) * 100)
    : 0,
)
const playbackErrorMessage = computed(() => {
  switch (player.error) {
    case 'source-unavailable':
      return '当前音源暂不可用，可以切换歌曲或前往音乐页重试。'
    case 'autoplay-blocked':
      return '浏览器阻止了播放，请再次点击播放。'
    case 'playback-failed':
      return '播放暂时失败，请稍后重试。'
    default:
      return ''
  }
})

function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`
}

function seekFromRange(event: Event) {
  playback.seek(Number((event.target as HTMLInputElement).value))
}

function retryTracks() {
  void refreshTracks()
}
</script>

<template>
  <UiGlassPanel
    as="section"
    class="home-music"
    padding="default"
    aria-label="首页音乐播放器"
    data-testid="home-music-card"
    :aria-busy="tracksPending || undefined"
  >
    <header class="home-music__header">
      <div>
        <span class="home-music__eyebrow">A MOMENT TO LISTEN</span>
        <h2>正在播放</h2>
      </div>
      <NuxtLink class="home-music__full-link" to="/music">
        完整音乐页
        <ArrowUpRight :size="16" aria-hidden="true" />
      </NuxtLink>
    </header>

    <div v-if="player.currentTrack" class="home-music__track">
      <div
        class="home-music__record"
        :class="{ 'home-music__record--playing': player.isPlaying }"
      >
        <img
          v-if="
            player.currentTrack.artworkUrl &&
            failedArtworkTrackId !== player.currentTrack.id
          "
          :key="player.currentTrack.id"
          :src="player.currentTrack.artworkUrl"
          :alt="
            player.currentTrack.artworkAlt ||
            `${player.currentTrack.title} - ${player.currentTrack.artist} 封面`
          "
          width="92"
          height="92"
          decoding="async"
          @error="failedArtworkTrackId = player.currentTrack?.id ?? null"
        />
        <span
          v-else
          class="home-music__record-fallback"
          role="img"
          :aria-label="`${player.currentTrack.title} 的封面暂不可用`"
        >
          <Music2 :size="30" stroke-width="1.5" aria-hidden="true" />
        </span>
        <span class="home-music__record-hole" aria-hidden="true" />
      </div>

      <div class="home-music__copy">
        <p class="home-music__track-label">精选曲目</p>
        <h3 :title="player.currentTrack.title">
          {{ player.currentTrack.title }}
        </h3>
        <p :title="player.currentTrack.artist">
          {{ player.currentTrack.artist }}
        </p>
      </div>
    </div>

    <div
      v-else
      class="home-music__empty"
      role="status"
      :aria-busy="tracksPending || undefined"
    >
      <Music2 :size="22" aria-hidden="true" />
      <span>
        {{
          tracksPending
            ? '正在加载歌单…'
            : trackError
              ? '音乐暂时无法加载。'
              : '歌单暂时没有可播放的歌曲。'
        }}
      </span>
      <button v-if="trackError" type="button" @click="retryTracks">
        重新加载
      </button>
    </div>

    <div v-if="player.currentTrack" class="home-music__progress-block">
      <input
        class="home-music__range"
        type="range"
        min="0"
        :max="trackDuration"
        step="0.1"
        :value="player.currentTime"
        :disabled="!player.duration || player.error === 'source-unavailable'"
        :style="{ '--progress': `${progressPercent}%` }"
        aria-label="播放进度"
        :aria-valuetext="`${formattedCurrentTime} / ${formattedDuration}`"
        @input="seekFromRange"
      />
      <div class="home-music__time-row" aria-live="off">
        <span>{{ formattedCurrentTime }}</span>
        <span>{{ formattedDuration }}</span>
      </div>
    </div>

    <div class="home-music__footer">
      <div class="home-music__controls" role="group" aria-label="音乐播放控制">
        <button
          type="button"
          class="home-music__control"
          aria-label="上一首"
          :disabled="!player.currentTrack"
          @click="playback.previousTrack"
        >
          <SkipBack :size="19" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="home-music__control home-music__control--play"
          :aria-label="player.isPlaying ? '暂停' : '播放'"
          :aria-busy="player.status === 'loading' || undefined"
          :disabled="!player.currentTrack"
          @click="playback.togglePlayback"
        >
          <Pause v-if="player.isPlaying" :size="20" aria-hidden="true" />
          <Play v-else :size="20" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="home-music__control"
          aria-label="下一首"
          :disabled="!player.currentTrack"
          @click="playback.skipNext"
        >
          <SkipForward :size="19" aria-hidden="true" />
        </button>
      </div>
      <span class="home-music__shared-state">共享播放状态</span>
    </div>

    <p v-if="playbackErrorMessage" class="home-music__error" role="status">
      {{ playbackErrorMessage }}
    </p>
  </UiGlassPanel>
</template>

<style scoped>
.home-music {
  min-width: 0;
  padding: var(--space-6);
  border-color: var(--glass-border-strong);
  background:
    radial-gradient(
      ellipse at 12% 100%,
      rgb(92 105 231 / 16%),
      transparent 54%
    ),
    var(--glass-panel-bg);
}

.home-music__header,
.home-music__footer,
.home-music__time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.home-music__header h2,
.home-music__copy h3,
.home-music__copy p {
  margin: 0;
}

.home-music__eyebrow,
.home-music__track-label {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
}

.home-music__header h2 {
  margin-top: var(--space-1);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
}

.home-music__full-link {
  display: inline-flex;
  min-height: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--text-caption);
  transition: color var(--motion-duration-fast) var(--motion-ease-standard);
}

.home-music__full-link:hover {
  color: var(--color-text);
}

.home-music__track {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-5);
  margin-top: var(--space-5);
}

.home-music__record {
  position: relative;
  display: grid;
  width: 5.75rem;
  height: 5.75rem;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 0.4rem solid rgb(13 18 36 / 88%);
  border-radius: var(--radius-round);
  background:
    repeating-radial-gradient(
      circle,
      rgb(154 166 226 / 11%) 0 1px,
      transparent 1px 4px
    ),
    #0b1021;
  box-shadow: 0 0.5rem 1.5rem rgb(3 6 22 / 38%);
  animation: home-record-rotate var(--motion-duration-record) linear infinite
    paused;
}

.home-music__record--playing {
  animation-play-state: running;
}

.home-music__record img,
.home-music__record-fallback {
  display: grid;
  width: 90%;
  height: 90%;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-round);
  object-fit: cover;
}

.home-music__record-fallback {
  background: linear-gradient(135deg, #282b64, #4d3c83 58%, #375e87);
  color: var(--color-text);
}

.home-music__record-hole {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18%;
  aspect-ratio: 1;
  border: 1px solid rgb(239 241 255 / 65%);
  border-radius: var(--radius-round);
  background: radial-gradient(
    circle,
    #121528 0 36%,
    #bbc3ed 42% 58%,
    #24243d 64%
  );
  box-shadow: 0 0 0 2px rgb(10 14 29 / 45%);
  transform: translate(-50%, -50%);
}

.home-music__copy {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
}

.home-music__track-label {
  margin: 0;
  font-size: 0.65rem;
}

.home-music__copy h3,
.home-music__copy > p:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-music__copy h3 {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(1rem, 1.5vw, 1.25rem);
}

.home-music__copy > p:last-child {
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.home-music__progress-block {
  margin-top: var(--space-4);
}

.home-music__range {
  display: block;
  width: 100%;
  height: 1.75rem;
  margin: 0;
  appearance: none;
  border-radius: var(--radius-round);
  background: transparent;
  cursor: pointer;
}

.home-music__range::-webkit-slider-runnable-track {
  height: 0.25rem;
  border-radius: var(--radius-round);
  background: linear-gradient(
    to right,
    var(--color-accent-soft) var(--progress),
    rgb(185 194 233 / 20%) var(--progress)
  );
}

.home-music__range::-moz-range-track {
  height: 0.25rem;
  border-radius: var(--radius-round);
  background: rgb(185 194 233 / 20%);
}

.home-music__range::-moz-range-progress {
  height: 0.25rem;
  border-radius: var(--radius-round);
  background: var(--color-accent-soft);
}

.home-music__range::-webkit-slider-thumb {
  width: 0.8rem;
  height: 0.8rem;
  margin-top: -0.275rem;
  appearance: none;
  border: 2px solid var(--color-text);
  border-radius: var(--radius-round);
  background: var(--color-accent);
  box-shadow: 0 0 0 3px rgb(124 131 255 / 20%);
}

.home-music__range::-moz-range-thumb {
  width: 0.65rem;
  height: 0.65rem;
  border: 2px solid var(--color-text);
  border-radius: var(--radius-round);
  background: var(--color-accent);
  box-shadow: 0 0 0 3px rgb(124 131 255 / 20%);
}

.home-music__range:focus-visible {
  outline: 2px solid var(--color-accent-soft);
  outline-offset: 0.25rem;
}

.home-music__range:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.home-music__time-row {
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.home-music__footer {
  margin-top: var(--space-3);
}

.home-music__controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.home-music__control {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-round);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  transition:
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    color var(--motion-duration-fast) var(--motion-ease-standard),
    background-color var(--motion-duration-fast) var(--motion-ease-standard);
}

.home-music__control:hover:not(:disabled) {
  border-color: var(--glass-border-hover);
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.home-music__control--play {
  border-color: rgb(172 183 255 / 52%);
  background: linear-gradient(135deg, #6474ed, #8c70d9);
  box-shadow: 0 0.25rem 1.25rem rgb(80 91 214 / 27%);
  color: white;
}

.home-music__control:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.home-music__shared-state {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  text-align: right;
}

.home-music__empty {
  display: flex;
  min-height: 7rem;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-5);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.home-music__empty button {
  min-height: 2.75rem;
  margin-left: auto;
  padding-inline: var(--space-3);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
  color: var(--color-text);
}

.home-music__error {
  margin: var(--space-3) 0 0;
  color: var(--color-warning, #ffd19a);
  font-size: var(--text-caption);
}

.home-music :is(button, a):focus-visible {
  outline: 2px solid var(--color-accent-soft);
  outline-offset: 3px;
}

@keyframes home-record-rotate {
  to {
    transform: rotate(1turn);
  }
}

@media (width <= 48rem) {
  .home-music {
    padding: var(--space-5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-music__record,
  .home-music__record--playing {
    animation: none;
  }

  .home-music :is(button, a) {
    transition: none;
  }
}
</style>
