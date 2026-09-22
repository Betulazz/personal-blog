export type AdminMusicSourceStrategy = 'local_media' | 'remote_url' | 's3_media'

export interface AdminMusicTrack {
  album: string | null
  artist: string
  artworkAlt: string | null
  artworkPreviewUrl: string | null
  artworkUrl: string | null
  createdAt: string
  displayOrder: number
  durationSeconds: number | null
  id: string
  isEnabled: boolean
  sourceStrategy: AdminMusicSourceStrategy
  sourceUrl: string
  title: string
  updatedAt: string
}

export interface AdminMusicTrackInput {
  album: string | null
  artist: string
  artwork_alt: string | null
  artwork_url: string | null
  display_order: number
  duration_seconds: number | null
  is_enabled: boolean
  source_strategy: AdminMusicSourceStrategy
  source_url: string
  title: string
}
