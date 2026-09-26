import type { InjectionKey, Ref } from 'vue'

import { BlogApiError, useApiClient } from '~/api/client'
import {
  useMusicPlayerStore,
  type MusicPlaybackMode,
} from '~/stores/musicPlayer'

export interface MusicPlaybackControls {
  handleAudioEnded(): void
  handleAudioError(): void
  handleLoadedMetadata(): void
  handleTimeUpdate(): void
  pausePlayback(): void
  playTrack(index: number): Promise<void>
  previousTrack(): Promise<void>
  seek(value: number): void
  setVolume(value: number): void
  skipNext(): Promise<void>
  toggleMute(): void
  togglePlayback(): Promise<void>
}

export const musicPlaybackKey: InjectionKey<MusicPlaybackControls> =
  Symbol('music-playback')

export function useMusicPlayback() {
  const playback = inject(musicPlaybackKey)
  if (!playback) {
    throw new Error('Music playback controls are not available in this layout.')
  }
  return playback
}

export function useMusicPlaybackController(
  audioElement: Ref<HTMLAudioElement | null>,
): MusicPlaybackControls {
  const player = useMusicPlayerStore()
  const api = useApiClient()
  const previousVolume = ref(player.volume || 0.65)
  let playRequest = 0
  let resolvedTrackId: string | null = null

  function syncAudioSource() {
    const audio = audioElement.value
    const track = player.currentTrack

    if (!track || resolvedTrackId !== track.id) {
      playRequest += 1
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        audio.currentTime = 0
      }
      resolvedTrackId = null
    }

    if (audio) {
      audio.volume = player.volume
    }
  }

  async function playCurrentTrack() {
    const audio = audioElement.value
    const track = player.currentTrack

    if (!audio || !track) {
      return
    }

    const request = ++playRequest
    const trackId = track.id
    player.clearError()
    player.setLoading()

    try {
      if (resolvedTrackId !== trackId) {
        const playback = await api.getMusicTrackPlayback(trackId)
        if (request !== playRequest || player.currentTrack?.id !== trackId) {
          return
        }
        audio.src = playback.mediaUrl
        audio.volume = player.volume
        resolvedTrackId = trackId
        audio.load()
      }
      await audio.play()
      if (request === playRequest && player.currentTrack?.id === trackId) {
        player.setPlaying(true)
      }
    } catch (error: unknown) {
      if (request !== playRequest || player.currentTrack?.id !== trackId) {
        return
      }

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        player.setError('autoplay-blocked')
      } else if (error instanceof BlogApiError && error.status === 404) {
        player.setError('source-unavailable')
      } else {
        player.setError('playback-failed')
      }
    }
  }

  function pausePlayback() {
    playRequest += 1
    audioElement.value?.pause()
    player.setPlaying(false)
  }

  async function togglePlayback() {
    if (player.isPlaying) {
      pausePlayback()
      return
    }
    await playCurrentTrack()
  }

  async function playTrack(index: number) {
    if (!player.tracks[index]) {
      return
    }
    player.selectTrack(index)
    syncAudioSource()
    await playCurrentTrack()
  }

  async function skipNext() {
    if (!player.nextTrack()) {
      return
    }
    syncAudioSource()
    await playCurrentTrack()
  }

  async function previousTrack() {
    if (!player.previousTrack()) {
      return
    }
    syncAudioSource()
    await playCurrentTrack()
  }

  function seek(value: number) {
    player.setCurrentTime(value)
    if (audioElement.value) {
      audioElement.value.currentTime = player.currentTime
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
    if (!resolvedTrackId || resolvedTrackId !== player.currentTrack?.id) {
      return
    }
    audioElement.value?.pause()
    player.setError('source-unavailable')
  }

  function handleAudioEnded() {
    if (player.playbackMode === 'single-loop') {
      if (audioElement.value) {
        audioElement.value.currentTime = 0
      }
      player.setCurrentTime(0)
      void playCurrentTrack()
      return
    }
    if (!player.nextTrack()) {
      if (audioElement.value) {
        audioElement.value.currentTime = 0
      }
      player.setCurrentTime(0)
      void playCurrentTrack()
      return
    }
    syncAudioSource()
    void playCurrentTrack()
  }

  watch(() => player.currentTrack?.id, syncAudioSource, { flush: 'sync' })
  watch(
    () => player.volume,
    (value) => {
      if (audioElement.value) {
        audioElement.value.volume = value
      }
    },
  )
  watch(audioElement, syncAudioSource)

  onBeforeUnmount(() => {
    playRequest += 1
    audioElement.value?.pause()
  })

  return {
    handleAudioEnded,
    handleAudioError,
    handleLoadedMetadata,
    handleTimeUpdate,
    pausePlayback,
    playTrack,
    previousTrack,
    seek,
    setVolume,
    skipNext,
    toggleMute,
    togglePlayback,
  }
}

export function musicPlaybackModeLabel(mode: MusicPlaybackMode) {
  switch (mode) {
    case 'single-loop':
      return '单曲循环'
    case 'shuffle':
      return '随机播放'
    default:
      return '列表循环'
  }
}
