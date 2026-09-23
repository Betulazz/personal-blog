export type MotionEase = [number, number, number, number]

export const parseMotionDuration = (raw: string, fallback: number) => {
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) {
    return fallback
  }
  return raw.trim().endsWith('ms') ? value / 1000 : value
}

export const parseMotionEase = (raw: string, fallback: MotionEase) => {
  const match = raw.match(
    /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/,
  )
  if (!match) {
    return fallback
  }

  const points = match.slice(1, 5).map(Number)
  return points.every(Number.isFinite) ? (points as MotionEase) : fallback
}
