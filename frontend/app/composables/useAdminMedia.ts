import { BlogApiError } from '~/api/client'
import type { AdminMediaReference } from '~/types/admin-media'

export function adminMediaLoadError(error: unknown) {
  if (
    error instanceof BlogApiError &&
    (error.status === 0 || error.status >= 500)
  ) {
    return '后台服务暂时无法响应，媒体库没有变化，请稍后重试。'
  }
  return '媒体库暂时无法加载，请稍后重试。'
}

export function adminMediaPolicyError(error: unknown) {
  if (
    error instanceof BlogApiError &&
    (error.status === 0 || error.status >= 500)
  ) {
    return '无法读取上传规则，上传已暂停，媒体库没有变化。'
  }
  return '无法读取上传规则，上传已暂停。'
}

export function adminMediaUploadError(error: unknown) {
  if (!(error instanceof BlogApiError)) {
    return '上传失败，文件仍保留在当前页面，可以重试。'
  }
  if (error.status === 401) {
    return '会话已过期，请重新登录后再上传；文件仍保留在当前页面。'
  }
  if (error.status === 403) {
    return error.code === 'csrf_invalid'
      ? '安全校验失败，请刷新页面后重试；文件仍保留在当前页面。'
      : '当前账号没有上传媒体的权限。'
  }
  if (error.status === 413) {
    return error.code === 'image_too_large'
      ? '图片超过服务器允许的图片大小上限，上传未开始。'
      : '文件超过服务器允许的上传大小上限，上传未开始。'
  }
  if (error.status === 422) {
    switch (error.code) {
      case 'image_dimensions_invalid':
        return '图片尺寸或像素数超过处理上限，文件未保存。'
      case 'media_content_invalid':
        return '无法解析这个图片，文件可能已损坏，未保存。'
      case 'media_content_mismatch':
        return '文件内容与声明的类型不一致，请确认文件真实格式后重试。'
      case 'media_empty':
        return '文件内容为空，无法上传。'
      case 'media_type_unsupported':
        return '不支持这个文件类型，请选择受支持的图片或音频文件。'
      default:
        return '上传校验未通过，文件未保存，可以调整后重试。'
    }
  }
  if (error.status === 409) {
    return '存储位置发生冲突，文件未保存，可以重试。'
  }
  if (error.status === 0 || error.status >= 500) {
    return '后台服务暂时无法响应，文件仍保留在当前页面，可以重试。'
  }
  return '上传失败，文件仍保留在当前页面，可以重试。'
}

export function adminMediaReferencesError(error: unknown) {
  if (!(error instanceof BlogApiError)) {
    return '无法检查站点引用，删除已暂停，可以重试。'
  }
  if (error.status === 401) {
    return '会话已过期，请重新登录后再检查引用；删除已暂停。'
  }
  if (error.status === 404) {
    return '这条媒体记录已经不存在，刷新列表即可同步。'
  }
  return '无法检查站点引用，删除已暂停，可以重试。'
}

export function adminMediaDeleteError(error: unknown) {
  if (!(error instanceof BlogApiError)) {
    return '删除失败，媒体库没有变化，可以重试。'
  }
  if (error.status === 401) {
    return '会话已过期，删除已取消；请重新登录后重试。'
  }
  if (error.status === 403) {
    return '当前账号没有删除媒体的权限。'
  }
  if (error.status === 404) {
    return '这条媒体记录已经不存在，刷新列表即可同步。'
  }
  if (error.status === 409) {
    if (error.code === 'media_asset_referenced') {
      return '该资源仍被站点内容引用，删除已安全取消。'
    }
    if (error.code === 'media_bytes_missing') {
      return '存储中的文件字节已缺失；元数据仍保留，可以清理元数据来恢复一致。'
    }
    return '当前状态不允许删除，媒体库没有变化。'
  }
  if (error.status === 0 || error.status >= 500) {
    if (error.code === 'media_metadata_delete_failed') {
      return '文件字节已删除，但元数据清理失败；记录仍然存在，可以重试清理。'
    }
    return '存储服务暂时无法完成删除，未做任何更改，可以重试。'
  }
  return '删除失败，媒体库没有变化，可以重试。'
}

export function mediaReferencesFromError(error: unknown) {
  if (
    !(error instanceof BlogApiError) ||
    error.code !== 'media_asset_referenced' ||
    !Array.isArray(error.details)
  ) {
    return []
  }
  return error.details.flatMap((detail) => {
    if (typeof detail !== 'object' || detail === null) return []
    const candidate = detail as Record<string, unknown>
    if (
      typeof candidate.resource_type !== 'string' ||
      typeof candidate.resource_id !== 'number' ||
      typeof candidate.field !== 'string'
    ) {
      return []
    }
    return [
      {
        field: candidate.field,
        resourceId: candidate.resource_id,
        resourceType: candidate.resource_type,
      } satisfies AdminMediaReference,
    ]
  })
}

export function mediaErrorRecovery(error: unknown) {
  if (!(error instanceof BlogApiError)) return null
  if (
    error.code === 'media_bytes_missing' ||
    error.code === 'media_metadata_delete_failed'
  ) {
    return 'purge_metadata' as const
  }
  return null
}
