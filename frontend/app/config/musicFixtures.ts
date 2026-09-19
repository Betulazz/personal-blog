import type { MusicTrack } from '../types/music'

/**
 * These paths intentionally point at administrator-managed local media. The
 * player treats a missing media asset as a designed, recoverable state instead
 * of reaching out to a catalog, scraper, or proxy service.
 */
export const musicFixtures = [
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
] satisfies readonly MusicTrack[]
