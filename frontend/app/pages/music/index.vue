<script setup lang="ts">
import {
  Disc3,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-vue-next'

import { useApiClient } from '~/api/client'
import {
  useMusicPlayback,
  musicPlaybackModeLabel,
} from '~/composables/musicPlayback'
import { useMusicTracks } from '~/composables/useMusicTracks'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import { useMusicPlayerStore } from '~/stores/musicPlayer'
import type { MusicLyrics } from '~/types/music'
import { getActiveMusicLyricIndex } from '~/utils/music-lyrics'

const api = useApiClient()
const playback = useMusicPlayback()
const player = useMusicPlayerStore()
const {
  data: trackResponse,
  error: trackError,
  pending: tracksPending,
  refresh,
} = await useMusicTracks()
const { identity, settings } = await usePublicSiteSettings()

watch(trackResponse, (response) => player.setTracks(response?.data ?? []), {
  immediate: true,
})

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const description = '聆听站点歌单，查看同步歌词，并在浏览页面时继续播放。'
useSeoMeta({
  title: () => `音乐 · ${identity.value.name}`,
  description,
  ogDescription: description,
  ogImage: () => settings.value.avatarUrl,
  ogTitle: () => `音乐 · ${identity.value.name}`,
  ogType: 'website',
  ogUrl: `${siteUrl}/music`,
  twitterCard: 'summary_large_image',
  twitterDescription: description,
  twitterImage: () => settings.value.avatarUrl,
  twitterTitle: () => `音乐 · ${identity.value.name}`,
})
useHead({ link: [{ href: `${siteUrl}/music`, rel: 'canonical' }] })

const activePanel = ref<'lyrics' | 'playlist'>('lyrics')
const isHydrated = ref(false)
const lyrics = ref<MusicLyrics | null>(null)
const lyricsPending = ref(false)
const lyricsError = ref(false)
let lyricsRequest = 0
let lyricsAbortController: AbortController | undefined

onMounted(() => {
  isHydrated.value = true
})

async function loadLyrics(trackId = player.currentTrack?.id) {
  lyricsAbortController?.abort()
  const request = ++lyricsRequest
  const currentTrackId = trackId
  lyrics.value = null
  lyricsError.value = false
  if (!currentTrackId) {
    lyricsPending.value = false
    return
  }

  const controller = new AbortController()
  lyricsAbortController = controller
  lyricsPending.value = true

  try {
    const response = await api.getMusicTrackLyrics(
      currentTrackId,
      controller.signal,
    )
    if (
      request === lyricsRequest &&
      !controller.signal.aborted &&
      response.trackId === currentTrackId
    ) {
      lyrics.value = response
    }
  } catch {
    if (request === lyricsRequest && !controller.signal.aborted) {
      lyricsError.value = true
    }
  } finally {
    if (request === lyricsRequest) {
      lyricsPending.value = false
    }
  }
}

watch(
  () => player.currentTrack?.id,
  (trackId) => loadLyrics(trackId),
  { immediate: true },
)
onBeforeUnmount(() => {
  lyricsRequest += 1
  lyricsAbortController?.abort()
})

const currentLyricIndex = computed(() => {
  if (!player.hasClockPosition) return -1
  return getActiveMusicLyricIndex(
    lyrics.value?.lines ?? [],
    player.currentTime * 1000,
  )
})
watch([currentLyricIndex, activePanel], async ([index, panel]) => {
  if (!import.meta.client || panel !== 'lyrics') return
  await nextTick()
  const container = document.querySelector('.music-page__lyrics')
  if (!container) return
  if (index < 0) {
    container.scrollTo({ top: 0, behavior: 'auto' })
    return
  }
  const activeLine = container?.querySelector('.music-page__lyric--active')
  if (!activeLine) return
  const containerRect = container.getBoundingClientRect()
  const lineRect = activeLine.getBoundingClientRect()
  container.scrollTo({
    top:
      container.scrollTop +
      lineRect.top -
      containerRect.top -
      (container.clientHeight - lineRect.height) / 2,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
})

const formattedCurrentTime = computed(() => formatTime(player.currentTime))
const formattedDuration = computed(() => formatTime(player.duration))
const playbackModeLabel = computed(() =>
  musicPlaybackModeLabel(player.playbackMode),
)
const playbackMessage = computed(() => {
  switch (player.error) {
    case 'source-unavailable':
      return '这首歌暂时无法播放。可以尝试列表中的其他歌曲。'
    case 'autoplay-blocked':
      return '浏览器阻止了播放，请再次点击播放。'
    case 'playback-failed':
      return '播放没有成功，请稍后重试或切换歌曲。'
    default:
      return ''
  }
})

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '00:00'
  const totalSeconds = Math.floor(value)
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function seekFromRange(event: Event) {
  playback.seek(Number((event.target as HTMLInputElement).value))
}

function changeVolume(event: Event) {
  playback.setVolume(Number((event.target as HTMLInputElement).value))
}

function requestTrack(index: number) {
  void playback.playTrack(index)
}
</script>

<template>
  <UiPageContainer
    width="wide"
    class="music-page"
    :data-music-ready="isHydrated"
  >
    <header class="music-page__heading">
      <span class="music-page__eyebrow">A QUIET PLACE TO LISTEN</span>
      <h1>音乐</h1>
      <p>在这里听一会儿，让旋律和文字一起慢下来。</p>
    </header>

    <div class="music-page__layout">
      <UiGlassPanel
        as="section"
        aria-label="唱片与播放控制"
        padding="spacious"
        class="music-page__player"
      >
        <div class="music-page__record-wrap">
          <div
            class="music-page__record"
            :class="{ 'music-page__record--playing': player.isPlaying }"
            aria-hidden="true"
          >
            <img
              v-if="player.currentTrack?.artworkUrl"
              class="music-page__artwork"
              :src="player.currentTrack.artworkUrl"
              :alt="player.currentTrack.artworkAlt || ''"
              decoding="async"
            />
            <span v-else class="music-page__record-fallback">
              <Disc3 :size="52" stroke-width="1" />
            </span>
            <span class="music-page__record-hole" />
          </div>
          <span class="music-page__record-glow" />
        </div>

        <div v-if="player.currentTrack" class="music-page__track-info">
          <span class="music-page__eyebrow">NOW PLAYING</span>
          <h2>{{ player.currentTrack.title }}</h2>
          <p>
            {{ player.currentTrack.artist }}
            <span v-if="player.currentTrack.album">
              · {{ player.currentTrack.album }}</span
            >
          </p>
        </div>
        <div
          v-else
          class="music-page__empty-track"
          role="status"
          :aria-busy="tracksPending"
        >
          <p v-if="tracksPending">正在加载歌单…</p>
          <p v-else-if="trackError">歌单暂时无法加载。</p>
          <p v-else>歌单暂时没有可播放的歌曲。</p>
          <button
            v-if="trackError"
            class="music-page__text-button"
            type="button"
            @click="() => refresh()"
          >
            重新加载
          </button>
        </div>

        <div class="music-page__progress-block">
          <input
            class="music-page__range"
            type="range"
            min="0"
            :max="player.duration || 0"
            step="0.1"
            :value="player.duration > 0 ? player.currentTime : 0"
            :disabled="
              !player.duration || player.error === 'source-unavailable'
            "
            aria-label="播放进度"
            :aria-valuetext="`${formattedCurrentTime} / ${formattedDuration}`"
            @input="seekFromRange"
          />
          <div class="music-page__time-row" aria-live="off">
            <span>{{ formattedCurrentTime }}</span>
            <span>{{ formattedDuration }}</span>
          </div>
        </div>

        <div class="music-page__main-controls" aria-label="播放控制">
          <button
            type="button"
            class="music-page__icon-button"
            aria-label="上一首"
            @click="playback.previousTrack"
          >
            <SkipBack :size="20" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="music-page__play-button"
            :aria-label="player.isPlaying ? '暂停' : '播放'"
            :aria-busy="player.status === 'loading' || undefined"
            :disabled="!player.currentTrack"
            @click="playback.togglePlayback"
          >
            <Pause v-if="player.isPlaying" :size="22" aria-hidden="true" />
            <Play v-else :size="22" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="music-page__icon-button"
            aria-label="下一首"
            @click="playback.skipNext"
          >
            <SkipForward :size="20" aria-hidden="true" />
          </button>
        </div>

        <div class="music-page__secondary-controls">
          <button
            type="button"
            class="music-page__mode-button"
            :aria-label="`播放模式：${playbackModeLabel}`"
            :aria-pressed="player.playbackMode !== 'playlist-loop'"
            @click="player.cyclePlaybackMode"
          >
            <Repeat1
              v-if="player.playbackMode === 'single-loop'"
              :size="18"
              aria-hidden="true"
            />
            <Shuffle
              v-else-if="player.playbackMode === 'shuffle'"
              :size="18"
              aria-hidden="true"
            />
            <Repeat v-else :size="18" aria-hidden="true" />
            <span>{{ playbackModeLabel }}</span>
          </button>
          <div class="music-page__volume">
            <button
              type="button"
              class="music-page__icon-button music-page__mute-button"
              :aria-label="player.volume > 0 ? '静音' : '取消静音'"
              @click="playback.toggleMute"
            >
              <Volume2 v-if="player.volume > 0" :size="18" aria-hidden="true" />
              <VolumeX v-else :size="18" aria-hidden="true" />
            </button>
            <input
              class="music-page__range music-page__range--volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="player.volume"
              aria-label="音量"
              @input="changeVolume"
            />
          </div>
        </div>

        <p
          v-if="playbackMessage"
          class="music-page__playback-message"
          role="status"
        >
          {{ playbackMessage }}
        </p>
      </UiGlassPanel>

      <UiGlassPanel
        as="section"
        aria-label="歌词和播放列表"
        padding="default"
        class="music-page__library"
      >
        <div class="music-page__tabs" role="group" aria-label="音乐内容">
          <button
            type="button"
            :aria-pressed="activePanel === 'lyrics'"
            :class="{ 'music-page__tab--active': activePanel === 'lyrics' }"
            class="music-page__tab"
            @click="activePanel = 'lyrics'"
          >
            歌词
          </button>
          <button
            type="button"
            :aria-pressed="activePanel === 'playlist'"
            :class="{ 'music-page__tab--active': activePanel === 'playlist' }"
            class="music-page__tab"
            @click="activePanel = 'playlist'"
          >
            播放列表 <span>{{ player.tracks.length }}</span>
          </button>
        </div>

        <section
          v-if="activePanel === 'lyrics'"
          class="music-page__lyrics"
          aria-label="同步歌词"
        >
          <div
            v-if="lyricsPending"
            class="music-page__empty-state"
            role="status"
            aria-busy="true"
          >
            正在加载歌词…
          </div>
          <div
            v-else-if="lyricsError"
            class="music-page__empty-state"
            role="status"
          >
            <p>歌词暂时无法加载。</p>
            <button
              class="music-page__text-button"
              type="button"
              @click="loadLyrics()"
            >
              重试
            </button>
          </div>
          <div
            v-else-if="
              !lyrics || lyrics.status === 'missing' || !lyrics.lines.length
            "
            class="music-page__empty-state"
            role="status"
          >
            暂无歌词，继续听歌吧。
          </div>
          <ol v-else class="music-page__lyric-list">
            <li
              v-for="(line, index) in lyrics.lines"
              :key="`${line.timeMs}-${index}`"
              :class="{
                'music-page__lyric--active': currentLyricIndex === index,
              }"
            >
              <button
                class="music-page__lyric"
                type="button"
                :aria-current="currentLyricIndex === index ? 'true' : undefined"
                :data-lyric-index="index"
                @click="playback.seek(line.timeMs / 1000)"
              >
                <span>{{ line.text }}</span>
                <small v-if="line.translation">{{ line.translation }}</small>
              </button>
            </li>
          </ol>
        </section>

        <section v-else class="music-page__playlist" aria-label="播放列表">
          <p class="music-page__playlist-note">
            站点精选 · {{ player.tracks.length }} 首歌曲
          </p>
          <ol v-if="player.tracks.length" class="music-page__track-list">
            <li v-for="(track, index) in player.tracks" :key="track.id">
              <button
                type="button"
                class="music-page__track-button"
                :class="{
                  'music-page__track-button--active':
                    player.currentTrack?.id === track.id,
                }"
                :aria-current="
                  player.currentTrack?.id === track.id ? 'true' : undefined
                "
                @click="requestTrack(index)"
              >
                <span class="music-page__track-number">
                  <Pause
                    v-if="
                      player.currentTrack?.id === track.id && player.isPlaying
                    "
                    :size="15"
                    aria-hidden="true"
                  />
                  <Play v-else :size="15" aria-hidden="true" />
                </span>
                <span class="music-page__track-copy">
                  <strong>{{ track.title }}</strong>
                  <small
                    >{{ track.artist
                    }}<template v-if="track.album">
                      · {{ track.album }}</template
                    ></small
                  >
                </span>
                <span
                  v-if="player.currentTrack?.id === track.id"
                  class="music-page__track-now"
                  >正在播放</span
                >
              </button>
            </li>
          </ol>
          <div v-else class="music-page__empty-state" role="status">
            {{ tracksPending ? '正在加载歌单…' : '歌单暂时没有可播放的歌曲。' }}
          </div>
        </section>
      </UiGlassPanel>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.music-page {
  padding-top: clamp(var(--space-10), 8vw, var(--space-16));
  padding-bottom: var(--space-16);
}

.music-page__heading {
  margin: 0 auto var(--space-10);
  text-align: center;
}

.music-page__eyebrow {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-eyebrow);
}

.music-page__heading h1 {
  margin: var(--space-3) 0;
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.music-page__heading p {
  margin: 0;
  color: var(--color-text-muted);
}

.music-page__layout {
  display: grid;
  grid-template-columns: minmax(18rem, 0.92fr) minmax(0, 1.35fr);
  align-items: stretch;
  gap: clamp(var(--space-4), 3vw, var(--space-8));
}

.music-page__player,
.music-page__library {
  min-width: 0;
  border-radius: var(--radius-panel);
  background:
    radial-gradient(
      ellipse at 50% 12%,
      rgb(124 131 255 / 11%),
      transparent 48%
    ),
    var(--glass-panel-bg);
}

.music-page__player {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.music-page__record-wrap {
  position: relative;
  display: grid;
  width: min(19rem, 74vw);
  aspect-ratio: 1;
  margin: 0 auto var(--space-8);
  place-items: center;
}

.music-page__record-glow {
  position: absolute;
  z-index: -1;
  width: 74%;
  height: 74%;
  border-radius: 50%;
  background: var(--color-accent);
  filter: blur(3rem);
  opacity: 0.23;
}

.music-page__record {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgb(211 217 255 / 22%);
  border-radius: 50%;
  background:
    repeating-radial-gradient(
      circle,
      transparent 0 8px,
      rgb(240 242 255 / 6%) 9px 10px
    ),
    radial-gradient(circle at 30% 25%, #333e71, #0b1022 61%, #03050d 100%);
  box-shadow:
    0 1.75rem 4rem rgb(0 0 0 / 42%),
    inset 0 0 2.5rem rgb(255 255 255 / 3%);
}

.music-page__record--playing {
  animation: record-rotate var(--motion-duration-record) linear infinite;
}

.music-page__artwork {
  width: 92%;
  height: 92%;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 2rem rgb(0 0 0 / 36%);
}

.music-page__record-fallback {
  display: grid;
  width: 92%;
  height: 92%;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 50%;
  background: radial-gradient(circle, #343b69, #171d3b 58%, #0c1024);
  color: #d8dcff;
}

.music-page__record-hole {
  position: absolute;
  width: 17%;
  aspect-ratio: 1;
  border: 2px solid rgb(225 228 255 / 72%);
  border-radius: 50%;
  background: #11162c;
}

.music-page__track-info {
  min-width: 0;
  max-width: 100%;
}

.music-page__track-info h2 {
  overflow: hidden;
  margin: var(--space-2) 0;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2vw, 2rem);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-page__track-info p,
.music-page__empty-track p {
  margin: 0;
  color: var(--color-text-muted);
}

.music-page__empty-track {
  min-height: 4rem;
}

.music-page__progress-block {
  width: 100%;
  margin-top: var(--space-8);
}

.music-page__range {
  width: 100%;
  min-height: 2.75rem;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.music-page__range:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.music-page__time-row {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.music-page__main-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  margin-top: var(--space-5);
}

.music-page__icon-button,
.music-page__play-button {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.music-page__icon-button:hover,
.music-page__mode-button:hover {
  border-color: var(--glass-border);
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.music-page__play-button {
  width: 4rem;
  height: 4rem;
  border-color: var(--glass-border-hover);
  background: linear-gradient(
    135deg,
    var(--color-action-start),
    var(--color-action-end)
  );
  box-shadow: var(--shadow-glow);
  color: white;
}

.music-page__play-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.music-page__secondary-controls {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.music-page__mode-button {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.music-page__volume {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-2);
}

.music-page__mute-button {
  width: 2.75rem;
  height: 2.75rem;
}

.music-page__range--volume {
  width: clamp(4rem, 10vw, 7rem);
}

.music-page__playback-message,
.music-page__empty-state {
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: var(--leading-body);
  text-align: center;
}

.music-page__playback-message {
  margin: var(--space-4) 0 0;
  color: var(--color-accent-soft);
}

.music-page__library {
  display: flex;
  min-height: 39rem;
  flex-direction: column;
}

.music-page__tabs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-divider-subtle);
}

.music-page__tab {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.music-page__tab span {
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.music-page__tab--active {
  border-color: var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text);
}

.music-page__lyrics,
.music-page__playlist {
  min-height: 0;
  flex: 1;
}

.music-page__lyrics {
  display: flex;
  max-height: 36rem;
  flex-direction: column;
  justify-content: center;
  overflow: auto;
  padding: var(--space-8) var(--space-2);
  mask-image: linear-gradient(transparent, black 8%, black 92%, transparent);
}

.music-page__lyric-list,
.music-page__track-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.music-page__lyric-list {
  display: grid;
  gap: var(--space-4);
  padding-block: 40%;
  text-align: center;
}

.music-page__lyric {
  display: grid;
  width: 100%;
  min-height: 3rem;
  justify-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 0;
  background: transparent;
  color: var(--color-text-subtle);
  font-family: var(--font-display);
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  line-height: 1.7;
  cursor: pointer;
  transition:
    color var(--motion-duration-fast) var(--motion-ease-standard),
    opacity var(--motion-duration-fast) var(--motion-ease-standard);
}

.music-page__lyric:hover,
.music-page__lyric--active .music-page__lyric {
  color: var(--color-text);
}

.music-page__lyric--active .music-page__lyric {
  font-size: clamp(1.2rem, 1.8vw, 1.45rem);
  text-shadow: 0 0 1.5rem rgb(124 131 255 / 32%);
}

.music-page__lyric small {
  color: var(--color-text-subtle);
  font-family: var(--font-ui);
  font-size: var(--text-caption);
}

.music-page__playlist-note {
  margin: var(--space-5) 0 var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-label);
}

.music-page__track-list {
  display: grid;
  gap: var(--space-1);
}

.music-page__track-button {
  display: flex;
  width: 100%;
  min-height: 4.25rem;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--color-text-muted);
  text-align: left;
  cursor: pointer;
}

.music-page__track-button:hover {
  background: var(--glass-bg-hover);
}

.music-page__track-button--active {
  border-color: var(--glass-border);
  background: rgb(124 131 255 / 9%);
  color: var(--color-text);
}

.music-page__track-number {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-accent-soft);
}

.music-page__track-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: var(--space-1);
}

.music-page__track-copy strong,
.music-page__track-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-page__track-copy strong {
  font-size: var(--text-small);
}

.music-page__track-copy small {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.music-page__track-now {
  flex: 0 0 auto;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
}

.music-page__text-button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--glass-border-hover);
  border-radius: var(--radius-small);
  background: var(--glass-card-bg);
  color: var(--color-text);
  cursor: pointer;
}

@keyframes record-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (width <= 48rem) {
  .music-page {
    padding-top: clamp(6rem, 20vw, 7rem);
  }

  .music-page__heading {
    margin-bottom: var(--space-6);
  }

  .music-page__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .music-page__player,
  .music-page__library {
    padding: var(--space-5);
    border-radius: var(--radius-large);
  }

  .music-page__record-wrap {
    width: min(15rem, 62vw);
    margin-bottom: var(--space-6);
  }

  .music-page__progress-block {
    margin-top: var(--space-6);
  }

  .music-page__library {
    min-height: 30rem;
  }

  .music-page__lyrics {
    max-height: 28rem;
    padding-inline: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-page__record--playing {
    animation: none;
  }

  .music-page__lyric {
    transition: none;
  }
}
</style>
