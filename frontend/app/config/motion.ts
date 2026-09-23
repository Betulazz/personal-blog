import type { MotionEase } from '~/utils/motion-tokens'
import { parseMotionDuration, parseMotionEase } from '~/utils/motion-tokens'

type MotionDurationName = 'fast' | 'normal' | 'slow' | 'shimmer'
type MotionEaseName = 'emphasized' | 'standard'

const durationFallbacks: Record<MotionDurationName, number> = {
  fast: 0.14,
  normal: 0.22,
  slow: 0.48,
  shimmer: 1.8,
}

const easeFallbacks: Record<MotionEaseName, MotionEase> = {
  emphasized: [0.2, 0.8, 0.2, 1],
  standard: [0.2, 0, 0, 1],
}

const readToken = (name: string) => {
  if (typeof document === 'undefined') {
    return ''
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name)
}

const duration = (name: MotionDurationName) =>
  parseMotionDuration(
    readToken(`--motion-duration-${name}`),
    durationFallbacks[name],
  )

const ease = (name: MotionEaseName) =>
  parseMotionEase(readToken(`--motion-ease-${name}`), easeFallbacks[name])

const entry = { duration: duration('slow'), ease: ease('emphasized') }

export const motionTransitions = {
  entry,
  entryStagger: {
    ...entry,
    delay: parseMotionDuration(readToken('--motion-delay-entry-stagger'), 0.14),
  },
  menu: { duration: duration('normal'), ease: ease('emphasized') },
} as const
