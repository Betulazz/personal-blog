import type { MusicLyricLine } from '~/types/music'

export function getActiveMusicLyricIndex(
  lines: readonly MusicLyricLine[],
  timeMs: number,
) {
  if (!Number.isFinite(timeMs) || timeMs < 0) return -1

  let activeIndex = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || !Number.isFinite(line.timeMs)) continue
    if (line.timeMs > timeMs) break
    activeIndex = index
  }
  return activeIndex
}
