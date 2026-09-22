import type { PublicCollectionPagination } from './public-content'

export type AdminMediaKind = 'audio' | 'image'

export type AdminMediaStorageStrategy = 'local' | 's3'

export interface AdminMediaAsset {
  contentType: string
  createdAt: string
  height: number | null
  id: string
  key: string
  mediaKind: AdminMediaKind
  originalFilename: string
  reference: string
  sizeBytes: number
  storageStrategy: AdminMediaStorageStrategy
  url: string
  width: number | null
}

export interface AdminMediaCollection {
  data: AdminMediaAsset[]
  pagination: PublicCollectionPagination
}

export interface AdminMediaPolicy {
  acceptedAudioTypes: string[]
  acceptedImageTypes: string[]
  imageMaxDimension: number
  imageMaxPixels: number
  imageMaxUploadBytes: number
  maxUploadBytes: number
}

export interface AdminMediaReference {
  field: string
  resourceId: number
  resourceType: string
}

export interface AdminMediaDeleteResult {
  bytesMissing: boolean
  deleted: boolean
}

export interface AdminMediaQuery {
  kind?: AdminMediaKind
  page: number
  pageSize: number
}

export type AdminMediaFilter = 'all' | AdminMediaKind
