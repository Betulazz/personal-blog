export const MAX_FIREFLIES = 32
export const MAX_MOBILE_FIREFLIES = 10

export function getFireflyCount(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return 0
  }

  const safeWidth = Math.max(0, width)
  const safeHeight = Math.max(0, height)
  const areaCount = Math.ceil((safeWidth * safeHeight) / 40_000)
  const viewportCap = safeWidth <= 768 ? MAX_MOBILE_FIREFLIES : MAX_FIREFLIES

  return Math.min(areaCount, viewportCap)
}
