export interface MusicSongIdValidation {
  message: string
  normalized: string
  valid: boolean
}

const MAX_BIGINT = '9223372036854775807'

export function validateMusicSongId(rawValue: string): MusicSongIdValidation {
  const normalized = rawValue.trim()
  if (!/^[1-9][0-9]{0,18}$/.test(normalized)) {
    return {
      message: '请输入正整数格式的网易云歌曲 ID。',
      normalized,
      valid: false,
    }
  }
  if (normalized.length === MAX_BIGINT.length && normalized > MAX_BIGINT) {
    return {
      message: '歌曲 ID 超出支持范围。',
      normalized,
      valid: false,
    }
  }
  return { message: '', normalized, valid: true }
}
