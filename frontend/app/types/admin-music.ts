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
  neteaseSongId: string
  providerUrl: string
  title: string
  updatedAt: string
}

export interface AdminMusicTrackInput {
  display_order: number
  is_enabled: boolean
  netease_song_id: string
}

export interface AdminMusicTrackUpdateInput {
  display_order?: number
  is_enabled?: boolean
}
