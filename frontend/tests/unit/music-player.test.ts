import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { musicFixtures } from '../../app/config/musicFixtures'
import { useMusicPlayerStore } from '../../app/stores/musicPlayer'

describe('music player store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with a paused SSR-safe track selection', () => {
    const player = useMusicPlayerStore()

    expect(player.currentTrack).toEqual(musicFixtures[0])
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

  it('wraps previous and next actions around the fixture playlist', () => {
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
      musicFixtures.every((track) => track.src.startsWith('/audio/')),
    ).toBe(true)
  })
})
