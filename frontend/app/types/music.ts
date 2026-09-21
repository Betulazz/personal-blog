export interface MusicTrack {
  artist: string
  id: string
  src: string
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

export type MusicPlaybackError =
  'autoplay-blocked' | 'playback-failed' | 'source-unavailable'
