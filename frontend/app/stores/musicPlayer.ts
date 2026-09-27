import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { BlogApiClient } from '../api/client'
import type {
  MusicLyrics,
  MusicPlaybackError,
  MusicTrack,
} from '../types/music'

export type MusicPlayerStatus = 'idle' | 'loading' | 'paused' | 'playing'
export type MusicPlaybackMode = 'playlist-loop' | 'single-loop' | 'shuffle'

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const useMusicPlayerStore = defineStore('music-player', () => {
  const tracks = ref<MusicTrack[]>([])
  const currentTrackIndex = ref(0)
  const currentTime = ref(0)
  const hasClockPosition = ref(false)
  const duration = ref(0)
  const volume = ref(0.65)
  const isPlaying = ref(false)
  const status = ref<MusicPlayerStatus>('idle')
  const playbackMode = ref<MusicPlaybackMode>('playlist-loop')
  const error = ref<MusicPlaybackError>()
  const lyrics = ref<MusicLyrics | null>(null)
  const lyricsTrackId = ref<string | null>(null)
  const lyricsStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const lyricsCache = new Map<string, MusicLyrics>()
  let lyricsRequest = 0
  let lyricsAbortController: AbortController | undefined

  const currentTrack = computed(() => tracks.value[currentTrackIndex.value])
  const progress = computed(() =>
    duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
  )

  function resetTrackState() {
    currentTime.value = 0
    hasClockPosition.value = false
    duration.value = 0
    isPlaying.value = false
    status.value = 'idle'
    error.value = undefined
  }

  function selectTrack(index: number) {
    if (!tracks.value[index] || index === currentTrackIndex.value) {
      return false
    }

    currentTrackIndex.value = index
    resetTrackState()
    return true
  }

  function nextTrack() {
    if (!tracks.value.length) {
      return false
    }
    if (playbackMode.value === 'shuffle' && tracks.value.length > 1) {
      const choices = tracks.value
        .map((_, index) => index)
        .filter((index) => index !== currentTrackIndex.value)
      const nextIndex = choices[Math.floor(Math.random() * choices.length)]
      return nextIndex === undefined ? false : selectTrack(nextIndex)
    }
    return selectTrack((currentTrackIndex.value + 1) % tracks.value.length)
  }

  function previousTrack() {
    if (!tracks.value.length) {
      return false
    }
    return selectTrack(
      (currentTrackIndex.value - 1 + tracks.value.length) % tracks.value.length,
    )
  }

  function setCurrentTime(value: number) {
    if (!Number.isFinite(value)) {
      currentTime.value = 0
      hasClockPosition.value = false
      return
    }
    currentTime.value = clamp(
      value,
      0,
      duration.value || Number.MAX_SAFE_INTEGER,
    )
    hasClockPosition.value = true
  }

  function setDuration(value: number) {
    duration.value = Number.isFinite(value) && value > 0 ? value : 0
    currentTime.value = clamp(currentTime.value, 0, duration.value || 0)
    if (!duration.value) {
      hasClockPosition.value = false
    }
  }

  function setVolume(value: number) {
    volume.value = clamp(value, 0, 1)
  }

  function cyclePlaybackMode() {
    playbackMode.value =
      playbackMode.value === 'playlist-loop'
        ? 'single-loop'
        : playbackMode.value === 'single-loop'
          ? 'shuffle'
          : 'playlist-loop'
  }

  function setPlaybackMode(value: MusicPlaybackMode) {
    playbackMode.value = value
  }

  function setLoading() {
    status.value = 'loading'
    error.value = undefined
  }

  function setPlaying(value: boolean) {
    isPlaying.value = value
    status.value = value ? 'playing' : 'paused'
    if (value) {
      error.value = undefined
    }
  }

  function setError(value: MusicPlaybackError) {
    isPlaying.value = false
    status.value = 'paused'
    error.value = value
    if (value === 'source-unavailable') {
      currentTime.value = 0
      hasClockPosition.value = false
      duration.value = 0
    }
  }

  function clearError() {
    error.value = undefined
  }

  function setTracks(nextTracks: MusicTrack[]) {
    const currentId = currentTrack.value?.id
    tracks.value = nextTracks
    const nextIndex = nextTracks.findIndex((track) => track.id === currentId)
    currentTrackIndex.value = nextIndex >= 0 ? nextIndex : 0
    if (!currentTrack.value || currentTrack.value.id !== currentId) {
      resetTrackState()
    }
  }

  async function loadLyrics(
    getTrackLyrics: BlogApiClient['getMusicTrackLyrics'],
    trackId = currentTrack.value?.id,
    force = false,
  ) {
    if (!trackId) {
      lyricsAbortController?.abort()
      lyricsRequest += 1
      lyrics.value = null
      lyricsTrackId.value = null
      lyricsStatus.value = 'idle'
      return
    }

    if (
      !force &&
      lyricsTrackId.value === trackId &&
      (lyricsStatus.value === 'loading' || lyricsStatus.value === 'ready')
    ) {
      return
    }

    lyricsAbortController?.abort()
    const request = ++lyricsRequest

    const cachedLyrics = lyricsCache.get(trackId)
    if (!force && cachedLyrics) {
      lyrics.value = cachedLyrics
      lyricsTrackId.value = trackId
      lyricsStatus.value = 'ready'
      return
    }

    lyrics.value = null
    lyricsTrackId.value = trackId
    lyricsStatus.value = 'loading'
    const controller = new AbortController()
    lyricsAbortController = controller

    try {
      const response = await getTrackLyrics(trackId, controller.signal)
      if (
        request === lyricsRequest &&
        !controller.signal.aborted &&
        currentTrack.value?.id === trackId &&
        response.trackId === trackId
      ) {
        lyricsCache.set(trackId, response)
        lyrics.value = response
        lyricsStatus.value = 'ready'
      }
    } catch {
      if (request === lyricsRequest && !controller.signal.aborted) {
        lyricsStatus.value = 'error'
      }
    }
  }

  return {
    clearError,
    currentTime,
    currentTrack,
    currentTrackIndex,
    hasClockPosition,
    duration,
    error,
    isPlaying,
    lyrics,
    lyricsStatus,
    lyricsTrackId,
    loadLyrics,
    nextTrack,
    playbackMode,
    previousTrack,
    progress,
    selectTrack,
    setTracks,
    setCurrentTime,
    setDuration,
    setError,
    setLoading,
    setPlaying,
    setVolume,
    setPlaybackMode,
    cyclePlaybackMode,
    status,
    tracks,
    volume,
  }
})
