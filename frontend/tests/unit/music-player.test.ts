import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMusicPlayerStore } from '../../app/stores/musicPlayer'
import { getActiveMusicLyricIndex } from '../../app/utils/music-lyrics'

const configuredTracks = [
  {
    album: null,
    artist: '本地示例音源',
    artworkAlt: null,
    artworkUrl: null,
    durationSeconds: null,
    id: 'ambient-example',
    neteaseSongId: '12345',
    providerUrl: 'https://music.163.com/song?id=12345',
    title: '月光落在窗边',
  },
  {
    album: null,
    artist: '本地示例音源',
    artworkAlt: null,
    artworkUrl: null,
    durationSeconds: null,
    id: 'quiet-example',
    neteaseSongId: '67890',
    providerUrl: 'https://music.163.com/song?id=67890',
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
    expect(player.hasClockPosition).toBe(false)
  })

  it('does not treat metadata duration as a clock position and clears failed-source time', () => {
    const player = useMusicPlayerStore()

    player.setDuration(180)
    expect(player.hasClockPosition).toBe(false)
    player.setCurrentTime(0)
    expect(player.hasClockPosition).toBe(true)

    player.setError('source-unavailable')
    expect(player.currentTime).toBe(0)
    expect(player.duration).toBe(0)
    expect(player.hasClockPosition).toBe(false)
  })

  it('clears the lyric clock when the media duration resets', () => {
    const player = useMusicPlayerStore()

    player.setDuration(180)
    player.setCurrentTime(42)
    expect(player.hasClockPosition).toBe(true)

    player.setDuration(0)
    expect(player.currentTime).toBe(0)
    expect(player.hasClockPosition).toBe(false)
  })

  it('wraps previous and next actions around the configured playlist', () => {
    const player = useMusicPlayerStore()

    expect(player.previousTrack()).toBe(true)
    expect(player.currentTrackIndex).toBe(1)
    expect(player.nextTrack()).toBe(true)
    expect(player.currentTrackIndex).toBe(0)
  })

  it('cycles the shared playback mode and chooses a different song in shuffle mode', () => {
    const player = useMusicPlayerStore()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)

    expect(player.playbackMode).toBe('playlist-loop')
    player.cyclePlaybackMode()
    expect(player.playbackMode).toBe('single-loop')
    player.cyclePlaybackMode()
    expect(player.playbackMode).toBe('shuffle')
    expect(player.nextTrack()).toBe(true)
    expect(player.currentTrack?.id).toBe('quiet-example')
    player.cyclePlaybackMode()
    expect(player.playbackMode).toBe('playlist-loop')

    random.mockRestore()
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

  it('keeps provider identity without exposing a runtime media URL in the playlist', () => {
    expect(
      configuredTracks.every((track) =>
        /^[1-9][0-9]*$/.test(track.neteaseSongId),
      ),
    ).toBe(true)
    expect(configuredTracks.every((track) => !('src' in track))).toBe(true)
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

describe('music lyric selection', () => {
  const lines = [
    { timeMs: 0, text: '开场', translation: 'Opening' },
    {
      timeMs: 24_000,
      text: '星河落入远方',
      translation: 'The stars drift away',
    },
  ]

  it('selects only a real line at or before the supplied audio time', () => {
    expect(getActiveMusicLyricIndex(lines, -1)).toBe(-1)
    expect(getActiveMusicLyricIndex(lines, 23_999)).toBe(0)
    expect(getActiveMusicLyricIndex(lines, 24_000)).toBe(1)
    expect(getActiveMusicLyricIndex([], 24_000)).toBe(-1)
    expect(getActiveMusicLyricIndex(lines, Number.NaN)).toBe(-1)
  })
})
