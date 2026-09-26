import { describe, expect, it } from 'vitest'

import { validateMusicSongId } from '../../app/utils/music-song-id'

describe('validateMusicSongId', () => {
  it('accepts positive decimal IDs and trims surrounding whitespace', () => {
    expect(validateMusicSongId('  123456789  ')).toEqual({
      message: '',
      normalized: '123456789',
      valid: true,
    })
  })

  it.each(['', ' ', '0', '-1', '+2', '1.2', '1e3', '12a', '0012'])(
    'rejects non-canonical song IDs: %s',
    (value) => {
      const result = validateMusicSongId(value)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('歌曲 ID')
    },
  )

  it('rejects IDs outside the signed 64-bit database range', () => {
    expect(validateMusicSongId('9223372036854775807').valid).toBe(true)
    expect(validateMusicSongId('9223372036854775808').valid).toBe(false)
    expect(validateMusicSongId('9999999999999999999').valid).toBe(false)
  })
})
