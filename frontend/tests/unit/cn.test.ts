import { describe, expect, it } from 'vitest'

import { cn } from '../../app/utils/cn'

describe('cn', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('px-2', { hidden: false }, ['px-4', 'text-white'])).toBe(
      'px-4 text-white',
    )
  })
})
