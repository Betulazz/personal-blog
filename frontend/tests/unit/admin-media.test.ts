import { describe, expect, it } from 'vitest'

import { BlogApiError } from '../../app/api/client'
import {
  adminMediaDeleteError,
  adminMediaLoadError,
  adminMediaReferencesError,
  adminMediaUploadError,
  mediaErrorRecovery,
  mediaReferencesFromError,
} from '../../app/composables/useAdminMedia'
import type {
  AdminMediaPolicy,
  AdminMediaReference,
} from '../../app/types/admin-media'
import {
  formatMediaBytes,
  formatMediaDimensions,
  mediaAcceptAttribute,
  mediaKindLabels,
  mediaReferenceLabel,
  mediaStorageStrategyLabel,
  normalizeMediaContentType,
  validateMediaFile,
} from '../../app/utils/admin-media'

const policy: AdminMediaPolicy = {
  acceptedAudioTypes: ['audio/flac', 'audio/mpeg', 'audio/ogg', 'audio/wav'],
  acceptedImageTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
  imageMaxDimension: 10000,
  imageMaxPixels: 25_000_000,
  imageMaxUploadBytes: 10 * 1024 * 1024,
  maxUploadBytes: 50 * 1024 * 1024,
}

const fileOf = (size: number, type: string, name = 'sample.png') =>
  new File([new Uint8Array(size)], name, { type })

describe('media file validation', () => {
  it('accepts supported images and audio inside every limit', () => {
    expect(validateMediaFile(fileOf(2048, 'image/png'), policy)).toEqual({
      message: '',
      valid: true,
    })
    expect(validateMediaFile(fileOf(2048, 'audio/mpeg'), policy)).toEqual({
      message: '',
      valid: true,
    })
  })

  it('normalizes the legacy jpg and x-wav aliases', () => {
    expect(normalizeMediaContentType('image/jpg')).toBe('image/jpeg')
    expect(normalizeMediaContentType('AUDIO/X-WAV')).toBe('audio/wav')
    expect(validateMediaFile(fileOf(2048, 'image/jpg'), policy).valid).toBe(
      true,
    )
  })

  it('refuses unsupported types and explains what is accepted', () => {
    const result = validateMediaFile(
      fileOf(2048, 'application/pdf', 'notes.pdf'),
      policy,
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('image/png')
    expect(result.message).toContain('audio/mpeg')
  })

  it('refuses files without a declared type', () => {
    expect(validateMediaFile(fileOf(2048, ''), policy).message).toContain(
      '无法识别',
    )
  })

  it('refuses empty files before any upload starts', () => {
    expect(validateMediaFile(fileOf(0, 'image/png'), policy).message).toContain(
      '空',
    )
  })

  it('refuses oversize files with the configured limit in the message', () => {
    const oversize = validateMediaFile(
      fileOf(policy.maxUploadBytes + 1, 'audio/mpeg'),
      policy,
    )
    expect(oversize.valid).toBe(false)
    expect(oversize.message).toContain('50 MB')

    const oversizeImage = validateMediaFile(
      fileOf(policy.imageMaxUploadBytes + 1, 'image/png'),
      policy,
    )
    expect(oversizeImage.valid).toBe(false)
    expect(oversizeImage.message).toContain('10 MB')
  })
})

describe('media helpers', () => {
  it('formats sizes across units', () => {
    expect(formatMediaBytes(0)).toBe('0 B')
    expect(formatMediaBytes(900)).toBe('900 B')
    expect(formatMediaBytes(1536)).toBe('1.5 KB')
    expect(formatMediaBytes(10 * 1024 * 1024)).toBe('10 MB')
    expect(formatMediaBytes(3 * 1024 * 1024 * 1024)).toBe('3 GB')
  })

  it('renders dimensions only when the asset has them', () => {
    expect(formatMediaDimensions({ height: 451, width: 640 })).toBe('640 × 451')
    expect(formatMediaDimensions({ height: null, width: null })).toBeNull()
  })

  it('builds the accept attribute from the policy', () => {
    expect(mediaAcceptAttribute(policy)).toBe(
      'image/gif,image/jpeg,image/png,image/webp,audio/flac,audio/mpeg,audio/ogg,audio/wav',
    )
    expect(mediaAcceptAttribute(null)).toBeUndefined()
  })

  it('labels kinds, storage strategies, and known reference resources', () => {
    expect(mediaKindLabels.image).toBe('图片')
    expect(mediaKindLabels.audio).toBe('音频')
    expect(mediaStorageStrategyLabel('local')).toBe('本地存储')
    expect(mediaStorageStrategyLabel('s3')).toBe('S3 兼容存储')
    expect(
      mediaReferenceLabel({
        field: 'source_url',
        resourceId: 7,
        resourceType: 'music_track',
      }),
    ).toBe('音乐 #7 · source_url')
    expect(
      mediaReferenceLabel({
        field: 'logo_url',
        resourceId: 3,
        resourceType: 'unknown_type',
      }),
    ).toBe('unknown_type #3 · logo_url')
  })
})

describe('media error feedback', () => {
  it('keeps upload failures non-destructive and specific', () => {
    expect(
      adminMediaUploadError(
        new BlogApiError('too large', { code: 'image_too_large', status: 413 }),
      ),
    ).toContain('图片大小上限')
    expect(
      adminMediaUploadError(
        new BlogApiError('mismatch', {
          code: 'media_content_mismatch',
          status: 422,
        }),
      ),
    ).toContain('与声明的类型不一致')
    expect(
      adminMediaUploadError(
        new BlogApiError('expired', {
          code: 'authentication_required',
          status: 401,
        }),
      ),
    ).toContain('文件仍保留')
    expect(adminMediaUploadError(new Error('offline'))).toContain('重试')
  })

  it('distinguishes load failures from empty media libraries', () => {
    expect(
      adminMediaLoadError(
        new BlogApiError('down', { code: 'upstream_unavailable', status: 503 }),
      ),
    ).toContain('媒体库没有变化')
    expect(adminMediaLoadError(new Error('boom'))).toContain('暂时无法加载')
  })

  it('keeps the reference check failure actionable and non-destructive', () => {
    expect(
      adminMediaReferencesError(
        new BlogApiError('down', { code: 'upstream_unavailable', status: 503 }),
      ),
    ).toContain('删除已暂停')
    expect(
      adminMediaReferencesError(
        new BlogApiError('expired', {
          code: 'authentication_required',
          status: 401,
        }),
      ),
    ).toContain('删除已暂停')
    expect(adminMediaReferencesError(new Error('boom'))).toContain('重试')
  })

  it('reports referenced and divergent delete states honestly', () => {
    const referenced = adminMediaDeleteError(
      new BlogApiError('referenced', {
        code: 'media_asset_referenced',
        status: 409,
      }),
    )
    expect(referenced).toContain('引用')
    expect(referenced).toContain('安全取消')

    const missing = adminMediaDeleteError(
      new BlogApiError('missing bytes', {
        code: 'media_bytes_missing',
        status: 409,
      }),
    )
    expect(missing).toContain('文件字节已缺失')
    expect(missing).toContain('清理元数据')

    const partial = adminMediaDeleteError(
      new BlogApiError('metadata left', {
        code: 'media_metadata_delete_failed',
        status: 503,
      }),
    )
    expect(partial).toContain('文件字节已删除')
    expect(partial).toContain('元数据清理失败')
  })

  it('extracts references and recovery hints from errors', () => {
    const error = new BlogApiError('referenced', {
      code: 'media_asset_referenced',
      details: [
        { field: 'cover_url', resource_id: 12, resource_type: 'post' },
        { field: 'src', resource_id: 'bad', resource_type: 'moment_image' },
        'not-an-object',
      ],
      status: 409,
    })
    expect(mediaReferencesFromError(error)).toEqual([
      { field: 'cover_url', resourceId: 12, resourceType: 'post' },
    ])
    expect(
      mediaErrorRecovery(
        new BlogApiError('missing', {
          code: 'media_bytes_missing',
          status: 409,
        }),
      ),
    ).toBe('purge_metadata')
    expect(
      mediaErrorRecovery(
        new BlogApiError('partial', {
          code: 'media_metadata_delete_failed',
          status: 503,
        }),
      ),
    ).toBe('purge_metadata')
    expect(mediaErrorRecovery(new Error('plain'))).toBeNull()
  })

  it('returns no references for unrelated failures', () => {
    const references: AdminMediaReference[] = mediaReferencesFromError(
      new BlogApiError('down', { code: 'media_storage_failed', status: 503 }),
    )
    expect(references).toEqual([])
  })
})
