import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useMusicPlayerStore } from '../../app/stores/musicPlayer'

const configuredTracks = [
  {
    artist: '本地示例音源',
    id: 'ambient-example',
    src: '/audio/ambient-example.mp3',
    title: '月光落在窗边',
  },
  {
    artist: '本地示例音源',
    id: 'quiet-example',
    src: '/audio/quiet-example.mp3',
    title: '雨落在玻璃上',
  },
]

describe('music player store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useMusicPlayerStore().setTracks(configuredTracks)
  })

  it('starts with a paused SSR-safe track selection after API injection', () => {
    const player = useMusicPlayerStore()

    expect(player.currentTrack).toEqual(configuredTracks[0])
    expect(player.isPlaying).toBe(false)
    expect(player.currentTime).toBe(0)
    expect(player.duration).toBe(0)
    expect(player.error).toBeUndefined()
  })

  it('changes tracks without carrying playback position or errors across', () => {
    const player = useMusicPlayerStore()

    player.setDuration(180)
    player.setCurrentTime(42)
    player.setPlaying(true)
    player.setError('playback-failed')
    expect(player.selectTrack(1)).toBe(true)

    expect(player.currentTrack?.id).toBe('quiet-example')
    expect(player.currentTime).toBe(0)
    expect(player.duration).toBe(0)
    expect(player.isPlaying).toBe(false)
    expect(player.error).toBeUndefined()
  })

  it('wraps previous and next actions around the configured playlist', () => {
    const player = useMusicPlayerStore()

    expect(player.previousTrack()).toBe(true)
    expect(player.currentTrackIndex).toBe(1)
    expect(player.nextTrack()).toBe(true)
    expect(player.currentTrackIndex).toBe(0)
  })

  it('clamps progress and volume to media-safe ranges', () => {
    const player = useMusicPlayerStore()

    player.setDuration(120)
    player.setCurrentTime(140)
    player.setVolume(-1)
    expect(player.currentTime).toBe(120)
    expect(player.progress).toBe(100)
    expect(player.volume).toBe(0)

    player.setVolume(2)
    expect(player.volume).toBe(1)
  })

  it('keeps source failures recoverable', () => {
    const player = useMusicPlayerStore()

    player.setPlaying(true)
    player.setError('source-unavailable')

    expect(player.isPlaying).toBe(false)
    expect(player.status).toBe('paused')
    expect(player.error).toBe('source-unavailable')
    expect(player.nextTrack()).toBe(true)
    expect(player.error).toBeUndefined()
  })

  it('uses only local example media sources', () => {
    expect(
      configuredTracks.every((track) => track.src.startsWith('/audio/')),
    ).toBe(true)
  })

  it('keeps the active track playing when the published order changes', () => {
    const player = useMusicPlayerStore()

    player.selectTrack(1)
    player.setDuration(180)
    player.setCurrentTime(60)
    player.setPlaying(true)
    player.setTracks([configuredTracks[1], configuredTracks[0]])

    expect(player.currentTrack?.id).toBe('quiet-example')
    expect(player.currentTrackIndex).toBe(0)
    expect(player.currentTime).toBe(60)
    expect(player.isPlaying).toBe(true)
    expect(player.error).toBeUndefined()
  })

  it('falls back safely when the active track leaves the playlist', () => {
    const player = useMusicPlayerStore()

    player.selectTrack(1)
    player.setDuration(180)
    player.setCurrentTime(60)
    player.setPlaying(true)
    player.setTracks([configuredTracks[0]])

    expect(player.currentTrack?.id).toBe('ambient-example')
    expect(player.currentTime).toBe(0)
    expect(player.duration).toBe(0)
    expect(player.isPlaying).toBe(false)
    expect(player.status).toBe('idle')
    expect(player.error).toBeUndefined()
  })

  it('handles an empty published playlist without a current track', () => {
    const player = useMusicPlayerStore()

    player.setPlaying(true)
    player.setTracks([])

    expect(player.currentTrack).toBeUndefined()
    expect(player.isPlaying).toBe(false)
    expect(player.nextTrack()).toBe(false)
    expect(player.previousTrack()).toBe(false)
  })
})
