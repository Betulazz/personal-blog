type MotionEase = [number, number, number, number]

const emphasizedEase: MotionEase = [0.2, 0.8, 0.2, 1]

export const motionTransitions = {
  entry: {
    duration: 0.48,
    ease: emphasizedEase,
  },
  menu: {
    duration: 0.22,
    ease: emphasizedEase,
  },
} as const
