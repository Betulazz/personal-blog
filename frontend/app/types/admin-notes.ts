import type { AdminPostCollection } from './admin'

export interface AdminNoteMetadata {
  id: number
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface ChatterImageInput {
  src: string
  alt: string
  width: number
  height: number
}

export interface AdminChatterInput {
  title: string | null
  body: string
  mood: string | null
  images: ChatterImageInput[]
}

export interface AdminChatter extends AdminNoteMetadata, AdminChatterInput {}

export interface AdminNoteQuery {
  page: number
  q?: string
  status?: 'draft' | 'published'
}

/** Shared transport mechanics; the two resources keep separate payload contracts. */
export interface AdminResourceApi<T, Input> {
  list: (
    query: AdminNoteQuery,
    signal?: AbortSignal,
  ) => Promise<{ data: T[]; pagination: AdminPostCollection['pagination'] }>
  get: (id: string, signal?: AbortSignal) => Promise<T>
  create: (input: Input) => Promise<T>
  update: (id: string, input: Input) => Promise<T>
  publish: (id: string) => Promise<T>
  unpublish: (id: string) => Promise<T>
  delete: (id: string) => Promise<void>
}
