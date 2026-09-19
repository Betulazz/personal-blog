export interface MusicTrack {
  artist: string
  id: string
  src: string
  title: string
}

export type MusicPlaybackError =
  'autoplay-blocked' | 'playback-failed' | 'source-unavailable'
