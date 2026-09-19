<script setup lang="ts">
import {
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-vue-next'

import { useMusicPlayerStore } from '~/stores/musicPlayer'

const player = useMusicPlayerStore()
const audioElement = ref<HTMLAudioElement | null>(null)
const isReady = ref(false)
const previousVolume = ref(player.volume || 0.65)
const playRequest = ref(0)

const errorMessage = computed(() => {
  if (player.error === 'source-unavailable') {
    return '当前音源暂不可用，可切换到下一首。'
  }

  if (player.error === 'autoplay-blocked') {
    return '浏览器阻止了自动播放，请再次点击播放。'
  }

  if (player.error === 'playback-failed') {
    return '播放没有成功，请稍后重试或切换音源。'
  }

  return ''
})

const formattedCurrentTime = computed(() => formatTime(player.currentTime))
const formattedDuration = computed(() => formatTime(player.duration))
const progressValue = computed(() =>
  player.duration > 0 ? player.currentTime : 0,
)
const isUnavailable = computed(() => player.error === 'source-unavailable')

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return '00:00'
  }

  const totalSeconds = Math.floor(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function syncAudioSource() {
  const audio = audioElement.value
  const track = player.currentTrack

  if (!audio || !track) {
    return
  }

  audio.pause()
  audio.src = track.src
  audio.currentTime = 0
  audio.volume = player.volume
}

async function playCurrentTrack() {
  const audio = audioElement.value

  if (!audio || !player.currentTrack) {
    return
  }

  const request = ++playRequest.value
  player.clearError()
  player.setLoading()

  try {
    await audio.play()
    if (request === playRequest.value) {
      player.setPlaying(true)
    }
  } catch (error: unknown) {
    if (request !== playRequest.value) {
      return
    }

    player.setError(
      error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'autoplay-blocked'
        : 'playback-failed',
    )
  }
}

function pauseCurrentTrack() {
  playRequest.value += 1
  audioElement.value?.pause()
  player.setPlaying(false)
}

async function togglePlayback() {
  if (player.isPlaying) {
    pauseCurrentTrack()
    return
  }

  await playCurrentTrack()
}

async function skipNext() {
  if (!player.nextTrack()) {
    return
  }

  syncAudioSource()
  await playCurrentTrack()
}

async function skipPrevious() {
  if (!player.previousTrack()) {
    return
  }

  syncAudioSource()
  await playCurrentTrack()
}

function seek(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  player.setCurrentTime(value)
  if (audioElement.value) {
    audioElement.value.currentTime = value
  }
}

function setVolume(value: number) {
  player.setVolume(value)
  if (player.volume > 0) {
    previousVolume.value = player.volume
  }
  if (audioElement.value) {
    audioElement.value.volume = player.volume
  }
}

function changeVolume(event: Event) {
  setVolume(Number((event.target as HTMLInputElement).value))
}

function toggleMute() {
  if (player.volume > 0) {
    setVolume(0)
    return
  }

  setVolume(previousVolume.value || 0.65)
}

function handleLoadedMetadata() {
  if (audioElement.value) {
    player.setDuration(audioElement.value.duration)
  }
}

function handleTimeUpdate() {
  if (audioElement.value) {
    player.setCurrentTime(audioElement.value.currentTime)
  }
}

function handleAudioError() {
  audioElement.value?.pause()
  player.setError('source-unavailable')
}

function handleEnded() {
  void skipNext()
}

watch(
  () => player.volume,
  (value) => {
    if (audioElement.value) {
      audioElement.value.volume = value
    }
  },
)

onMounted(() => {
  isReady.value = true
  syncAudioSource()
})

onBeforeUnmount(() => {
  playRequest.value += 1
  audioElement.value?.pause()
})
</script>

<template>
  <section
    v-if="player.currentTrack"
    class="music-player"
    data-testid="music-player"
    aria-label="音乐播放器"
    :data-player-ready="isReady"
    :data-player-status="player.status"
  >
    <audio
      ref="audioElement"
      class="music-player__audio"
      :src="player.currentTrack.src"
      preload="none"
      aria-hidden="true"
      tabindex="-1"
      @ended="handleEnded"
      @error="handleAudioError"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
    />

    <div class="music-player__identity">
      <span class="music-player__icon" aria-hidden="true">
        <Music2 :size="18" />
      </span>
      <div class="music-player__track">
        <span class="music-player__eyebrow">NOW PLAYING · AMBIENT</span>
        <strong>{{ player.currentTrack.title }}</strong>
        <span>{{ player.currentTrack.artist }}</span>
      </div>
    </div>

    <div class="music-player__controls">
      <button
        type="button"
        aria-label="上一首"
        class="music-player__control"
        @click="skipPrevious"
      >
        <SkipBack :size="18" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="music-player__control music-player__control--primary"
        :aria-label="player.isPlaying ? '暂停' : '播放'"
        :aria-busy="player.status === 'loading' || undefined"
        @click="togglePlayback"
      >
        <Pause v-if="player.isPlaying" :size="19" aria-hidden="true" />
        <Play v-else :size="19" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="下一首"
        class="music-player__control"
        @click="skipNext"
      >
        <SkipForward :size="18" aria-hidden="true" />
      </button>
    </div>

    <div class="music-player__progress">
      <label class="visually-hidden" for="music-progress">播放进度</label>
      <input
        id="music-progress"
        class="music-player__range"
        type="range"
        min="0"
        :max="player.duration || 0"
        step="0.1"
        :value="progressValue"
        :disabled="!player.duration || isUnavailable"
        aria-label="播放进度"
        :aria-valuetext="`${formattedCurrentTime} / ${formattedDuration}`"
        @input="seek"
      />
      <span class="music-player__time" aria-live="off">
        {{ formattedCurrentTime }} / {{ formattedDuration }}
      </span>
    </div>

    <div class="music-player__volume">
      <button
        type="button"
        class="music-player__control"
        :aria-label="player.volume > 0 ? '静音' : '取消静音'"
        @click="toggleMute"
      >
        <Volume2 v-if="player.volume > 0" :size="17" aria-hidden="true" />
        <VolumeX v-else :size="17" aria-hidden="true" />
      </button>
      <label class="visually-hidden" for="music-volume">音量</label>
      <input
        id="music-volume"
        class="music-player__range music-player__range--volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="player.volume"
        aria-label="音量"
        @input="changeVolume"
      />
    </div>

    <div v-if="errorMessage" class="music-player__message" role="status">
      {{ errorMessage }}
    </div>
  </section>
</template>

<style scoped>
.music-player {
  position: fixed;
  z-index: var(--z-sticky);
  right: var(--gutter-page);
  bottom: var(--space-5);
  left: var(--gutter-page);
  display: grid;
  grid-template-columns: minmax(12rem, 1.1fr) auto minmax(12rem, 1.5fr) minmax(
      9rem,
      0.8fr
    );
  align-items: center;
  gap: var(--space-4);
  max-width: 78rem;
  margin-inline: auto;
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-large);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-panel), var(--glass-highlight), var(--shadow-glow);
  backdrop-filter: blur(var(--glass-blur-panel))
    saturate(var(--glass-saturation));
}

.music-player__audio {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.music-player__identity,
.music-player__controls,
.music-player__progress,
.music-player__volume {
  display: flex;
  align-items: center;
}

.music-player__identity {
  min-width: 0;
  gap: var(--space-3);
}

.music-player__icon {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  box-shadow: var(--shadow-glow);
  color: var(--color-text);
}

.music-player__track {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.music-player__eyebrow {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: var(--tracking-label);
  white-space: nowrap;
}

.music-player__track strong,
.music-player__track > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-player__track strong {
  color: var(--color-text);
  font-size: var(--text-small);
}

.music-player__track > span:last-child,
.music-player__time {
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.music-player__controls {
  gap: var(--space-1);
}

.music-player__control {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  place-items: center;
  border: var(--border-hairline) solid transparent;
  border-radius: var(--radius-round);
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

.music-player__control--primary {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.music-player__progress {
  min-width: 0;
  gap: var(--space-3);
}

.music-player__range {
  width: 100%;
  min-width: 4rem;
  height: 2.75rem;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.music-player__range:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.music-player__time {
  flex: 0 0 auto;
  white-space: nowrap;
}

.music-player__volume {
  min-width: 0;
  gap: var(--space-2);
}

.music-player__range--volume {
  width: min(7rem, 100%);
}

.music-player__message {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (width <= 64rem) {
  .music-player {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .music-player__progress {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .music-player__volume {
    justify-self: end;
  }
}

@media (width <= 48rem) {
  .music-player {
    right: var(--space-3);
    bottom: var(--space-3);
    left: var(--space-3);
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-medium);
  }

  .music-player__controls {
    gap: 0;
  }

  .music-player__volume {
    display: flex;
    grid-column: 1 / -1;
    grid-row: 3;
    justify-self: stretch;
  }

  .music-player__range--volume {
    width: 100%;
  }

  .music-player__progress {
    gap: var(--space-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-player__control {
    transition: none;
  }
}
</style>
