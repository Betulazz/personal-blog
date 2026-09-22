import type { AdminMusicSourceStrategy } from '../types/admin-music'

export interface MusicValidation {
  message: string
  valid: boolean
}

export interface MusicSourceStrategyOption {
  description: string
  label: string
  value: AdminMusicSourceStrategy
}

export const musicSourceStrategies: MusicSourceStrategyOption[] = [
  {
    description: '使用站点自己托管的 /uploads/ 音频文件。',
    label: '本地媒体',
    value: 'local_media',
  },
  {
    description: '直接引用你有权使用的完整 http(s) 音频地址。',
    label: '远程 URL',
    value: 'remote_url',
  },
  {
    description: '指向 S3 兼容对象存储中的音频对象，访问凭据由部署环境管理。',
    label: 'S3 兼容存储',
    value: 's3_media',
  },
]

const SAFE_PROTOCOLS = new Set(['http:', 'https:'])

const invalid = (message: string): MusicValidation => ({
  message,
  valid: false,
})
const valid = (): MusicValidation => ({ message: '', valid: true })

const decodeSafely = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const hasUnsafeCharacters = (value: string) => {
  const decoded = decodeSafely(value)
  if (decoded.includes('\\')) return true
  for (const character of decoded) {
    const code = character.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

const hasRelativeSegments = (value: string) =>
  value.split('/').some((part) => part === '.' || part === '..')

const validateLocalReference = (
  value: string,
  label: string,
): MusicValidation => {
  if (!value.startsWith('/uploads/')) {
    return invalid(`${label}必须使用 /uploads/ 下已经上传的文件路径。`)
  }
  if (hasRelativeSegments(decodeSafely(value))) {
    return invalid(`${label}路径不能包含相对路径片段。`)
  }
  return valid()
}

const validateHttpReference = (
  value: string,
  label: string,
): MusicValidation => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return invalid(`${label}必须是完整的 http(s) 地址。`)
  }
  if (!SAFE_PROTOCOLS.has(url.protocol) || !url.hostname) {
    return invalid(`${label}必须是完整的 http(s) 地址。`)
  }
  if (url.username || url.password) {
    return invalid(`${label}不能包含账号或密码。`)
  }
  if (url.search || url.hash) {
    return invalid(`${label}不能包含查询参数或片段凭证。`)
  }
  return valid()
}

export function validateMusicSource(
  strategy: AdminMusicSourceStrategy,
  rawValue: string,
): MusicValidation {
  const value = rawValue.trim()
  if (!value) {
    return invalid('请输入音源地址。')
  }
  if (hasUnsafeCharacters(value)) {
    return invalid('音源地址包含不安全字符。')
  }
  return strategy === 'local_media'
    ? validateLocalReference(value, '本地媒体')
    : validateHttpReference(value, '远程音源')
}

export function validateMusicArtwork(rawValue: string): MusicValidation {
  const value = rawValue.trim()
  if (!value) {
    return valid()
  }
  if (hasUnsafeCharacters(value)) {
    return invalid('封面地址包含不安全字符。')
  }
  if (value.startsWith('/')) {
    return validateLocalReference(value, '封面')
  }
  return validateHttpReference(value, '封面')
}

export function musicSourceStrategyLabel(value: AdminMusicSourceStrategy) {
  return (
    musicSourceStrategies.find((strategy) => strategy.value === value)?.label ||
    value
  )
}
