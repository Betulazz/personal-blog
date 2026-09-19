import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { musicFixtures } from '../config/musicFixtures'
import type { MusicPlaybackError } from '../types/music'

export type MusicPlayerStatus = 'idle' | 'loading' | 'paused' | 'playing'

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const useMusicPlayerStore = defineStore('music-player', () => {
  const tracks = musicFixtures
  const currentTrackIndex = ref(0)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.65)
  const isPlaying = ref(false)
  const status = ref<MusicPlayerStatus>('idle')
  const error = ref<MusicPlaybackError>()

  const currentTrack = computed(() => tracks[currentTrackIndex.value])
  const progress = computed(() =>
    duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
  )

  function resetTrackState() {
    currentTime.value = 0
    duration.value = 0
    isPlaying.value = false
    status.value = 'idle'
    error.value = undefined
  }

  function selectTrack(index: number) {
    if (!tracks[index] || index === currentTrackIndex.value) {
      return false
    }

    currentTrackIndex.value = index
    resetTrackState()
    return true
  }

  function nextTrack() {
    return selectTrack((currentTrackIndex.value + 1) % tracks.length)
  }

  function previousTrack() {
    return selectTrack(
      (currentTrackIndex.value - 1 + tracks.length) % tracks.length,
    )
  }

  function setCurrentTime(value: number) {
    currentTime.value = clamp(
      value,
      0,
      duration.value || Number.MAX_SAFE_INTEGER,
    )
  }

  function setDuration(value: number) {
    duration.value = Number.isFinite(value) && value > 0 ? value : 0
    currentTime.value = clamp(currentTime.value, 0, duration.value || 0)
  }

  function setVolume(value: number) {
    volume.value = clamp(value, 0, 1)
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
  }

  function clearError() {
    error.value = undefined
  }

  return {
    clearError,
    currentTime,
    currentTrack,
    currentTrackIndex,
    duration,
    error,
    isPlaying,
    nextTrack,
    previousTrack,
    progress,
    selectTrack,
    setCurrentTime,
    setDuration,
    setError,
    setLoading,
    setPlaying,
    setVolume,
    status,
    tracks,
    volume,
  }
})
