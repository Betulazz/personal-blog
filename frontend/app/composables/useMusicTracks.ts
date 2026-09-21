import { useApiClient } from '~/api/client'
import type { MusicTrackCollectionResponse } from '~/types/music'

export async function useMusicTracks() {
  const client = useApiClient()
  return useAsyncData<MusicTrackCollectionResponse>(
    'public-music-tracks',
    (_nuxtApp, { signal }) => client.listMusicTracks(signal),
    {
      deep: false,
      default: () => ({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      }),
    },
  )
}
