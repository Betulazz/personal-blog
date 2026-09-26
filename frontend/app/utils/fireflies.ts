export const MAX_FIREFLIES = 50
export const MAX_MOBILE_FIREFLIES = 0

export function getFireflyCount(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return 0
  }

  const safeWidth = Math.max(0, width)
  const safeHeight = Math.max(0, height)
  if (safeWidth === 0 || safeHeight === 0) return 0
  return safeWidth < 768 ? MAX_MOBILE_FIREFLIES : MAX_FIREFLIES
}
