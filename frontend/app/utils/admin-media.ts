import type {
  AdminMediaAsset,
  AdminMediaKind,
  AdminMediaPolicy,
  AdminMediaReference,
} from '../types/admin-media'

export interface MediaFileValidation {
  message: string
  valid: boolean
}

export const mediaKindLabels: Record<AdminMediaKind, string> = {
  audio: '音频',
  image: '图片',
}

const CONTENT_TYPE_ALIASES: Record<string, string> = {
  'audio/x-wav': 'audio/wav',
  'image/jpg': 'image/jpeg',
}

const invalid = (message: string): MediaFileValidation => ({
  message,
  valid: false,
})
const valid = (): MediaFileValidation => ({ message: '', valid: true })

export function normalizeMediaContentType(contentType: string) {
  const value = contentType.trim().toLowerCase()
  return CONTENT_TYPE_ALIASES[value] ?? value
}

export function formatMediaBytes(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return '未知大小'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = sizeBytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 10 ? Math.round(value) : Number(value.toFixed(1))} ${units[unitIndex]}`
}

export function formatMediaDimensions(asset: {
  height: number | null
  width: number | null
}) {
  if (!asset.width || !asset.height) return null
  return `${asset.width} × ${asset.height}`
}

export function mediaAcceptAttribute(policy: AdminMediaPolicy | null) {
  if (!policy) return undefined
  return [...policy.acceptedImageTypes, ...policy.acceptedAudioTypes].join(',')
}

export function mediaStorageStrategyLabel(
  strategy: AdminMediaAsset['storageStrategy'],
) {
  return strategy === 'local' ? '本地存储' : 'S3 兼容存储'
}

export function validateMediaFile(
  file: File,
  policy: AdminMediaPolicy,
): MediaFileValidation {
  const contentType = normalizeMediaContentType(file.type)
  const acceptedTypes = [
    ...policy.acceptedImageTypes,
    ...policy.acceptedAudioTypes,
  ]
  if (!contentType) {
    return invalid('无法识别这个文件的类型，请选择受支持的图片或音频文件。')
  }
  if (!acceptedTypes.includes(contentType)) {
    return invalid(
      `不支持 ${contentType}。可用类型：${acceptedTypes.join('、')}。`,
    )
  }
  if (file.size === 0) {
    return invalid('文件内容为空，无法上传。')
  }
  if (file.size > policy.maxUploadBytes) {
    return invalid(
      `文件大小为 ${formatMediaBytes(file.size)}，超过 ${formatMediaBytes(policy.maxUploadBytes)} 的上传上限。`,
    )
  }
  if (
    policy.acceptedImageTypes.includes(contentType) &&
    file.size > policy.imageMaxUploadBytes
  ) {
    return invalid(
      `图片大小为 ${formatMediaBytes(file.size)}，超过 ${formatMediaBytes(policy.imageMaxUploadBytes)} 的图片上限。`,
    )
  }
  return valid()
}

const referenceResourceLabels: Record<string, string> = {
  chatter: '杂谈',
  friend_link: '友链',
  moment_image: '动态图片',
  music_track: '音乐',
  post: '文章',
  project: '项目',
  site_settings: '网站设置',
}

export function mediaReferenceLabel(reference: AdminMediaReference) {
  const resource =
    referenceResourceLabels[reference.resourceType] ?? reference.resourceType
  const field =
    reference.field === 'about.banner_url'
      ? '关于页面横幅'
      : /^social_links\[\d+\]\.icon$/.test(reference.field)
        ? '社交链接图标'
        : reference.field
  return `${resource} #${reference.resourceId} · ${field}`
}

export function isImageAsset(asset: AdminMediaAsset) {
  return asset.mediaKind === 'image'
}
