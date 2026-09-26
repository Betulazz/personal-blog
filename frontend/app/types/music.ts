export interface MusicTrack {
  album: string | null
  artist: string
  artworkAlt: string | null
  artworkUrl: string | null
  durationSeconds: number | null
  id: string
  neteaseSongId: string
  providerUrl: string
  title: string
}

export interface MusicTrackCollectionResponse {
  data: MusicTrack[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface MusicTrackPlaybackResolution {
  mediaUrl: string
  providerUrl: string
  songId: string
  trackId: string
}

export interface MusicLyricLine {
  timeMs: number
  text: string
  translation: string | null
}

export interface MusicLyrics {
  lines: MusicLyricLine[]
  status: 'available' | 'missing'
  trackId: string
}

export interface MusicTrackPreview {
  album: string | null
  alreadyAdded: boolean
  artist: string
  artworkUrl: string | null
  durationSeconds: number | null
  neteaseSongId: string
  providerUrl: string
  title: string
}

export type MusicPlaybackError =
  'autoplay-blocked' | 'playback-failed' | 'source-unavailable'
