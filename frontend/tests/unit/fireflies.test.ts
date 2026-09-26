import { describe, expect, it } from 'vitest'

import {
  getFireflyCount,
  MAX_FIREFLIES,
  MAX_MOBILE_FIREFLIES,
} from '../../app/utils/fireflies'

describe('firefly density', () => {
  it('keeps the desktop particle count within its fixed budget', () => {
    expect(getFireflyCount(1440, 900)).toBeLessThanOrEqual(MAX_FIREFLIES)
    expect(getFireflyCount(1920, 1080)).toBe(MAX_FIREFLIES)
  })

  it('uses a lower cap on phone and tablet viewports', () => {
    expect(getFireflyCount(430, 932)).toBeLessThanOrEqual(MAX_MOBILE_FIREFLIES)
    expect(getFireflyCount(768, 1024)).toBe(MAX_MOBILE_FIREFLIES)
    expect(getFireflyCount(430, 932)).toBeLessThan(getFireflyCount(1440, 900))
  })

  it('returns no particles for zero-sized or invalid viewports', () => {
    expect(getFireflyCount(0, 0)).toBe(0)
    expect(getFireflyCount(Number.NaN, 900)).toBe(0)
  })
})
