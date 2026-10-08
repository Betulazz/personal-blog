import type { AdminPostInput } from '../types/admin'

export const ADMIN_POST_DRAFT_PREFIX = 'admin-post-draft:v1:'

export const adminPostDraftKey = (postId?: string) =>
  `${ADMIN_POST_DRAFT_PREFIX}${postId ?? 'new'}`

export const serializeAdminPostInput = (input: AdminPostInput) =>
  JSON.stringify({
    body: input.body,
    coverAlt: input.cover_alt?.trim() || null,
    coverUrl: input.cover_url?.trim() || null,
    isPinned: input.is_pinned ?? false,
    slug: input.slug.trim(),
    summary: input.summary.trim(),
    tagIds: [...(input.tag_ids ?? [])].sort((left, right) => left - right),
    title: input.title.trim(),
  })

export const isAdminPostDraftDirty = (current: string, baseline: string) =>
  Boolean(baseline) && current !== baseline

export const isAdminPostInput = (value: unknown): value is AdminPostInput => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.summary === 'string' &&
    typeof candidate.body === 'string' &&
    (candidate.cover_alt == null || typeof candidate.cover_alt === 'string') &&
    (candidate.cover_url == null || typeof candidate.cover_url === 'string') &&
    (candidate.is_pinned === undefined ||
      typeof candidate.is_pinned === 'boolean') &&
    (candidate.tag_ids === undefined ||
      (Array.isArray(candidate.tag_ids) &&
        candidate.tag_ids.every((id) => Number.isSafeInteger(id) && id > 0) &&
        new Set(candidate.tag_ids).size === candidate.tag_ids.length))
  )
}

export type PostWriteAction = 'save' | 'publish' | 'unpublish' | 'delete'
export interface AdminPostDraftRecord {
  version: 2
  input: AdminPostInput
  unknown?: { action: PostWriteAction; submitted: AdminPostInput }
}

export const readAdminPostDraftRecord = (
  storage: Storage,
  key: string,
): AdminPostDraftRecord | null => {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (isAdminPostInput(parsed)) return { version: 2, input: parsed }
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (record.version !== 2 || !isAdminPostInput(record.input)) return null
    if (record.unknown !== undefined) {
      if (typeof record.unknown !== 'object' || record.unknown === null)
        return null
      const unknown = record.unknown as Record<string, unknown>
      if (
        typeof unknown.action !== 'string' ||
        !['save', 'publish', 'unpublish', 'delete'].includes(unknown.action) ||
        !isAdminPostInput(unknown.submitted)
      )
        return null
    }
    return record as unknown as AdminPostDraftRecord
  } catch {
    return null
  }
}

export const saveAdminPostDraftRecord = (
  storage: Storage,
  key: string,
  record: AdminPostDraftRecord,
) => {
  try {
    storage.setItem(key, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

export const readAdminPostDraft = (
  storage: Storage,
  key: string,
): AdminPostInput | null => {
  try {
    return readAdminPostDraftRecord(storage, key)?.input ?? null
  } catch {
    return null
  }
}

export const saveAdminPostDraft = (
  storage: Storage,
  key: string,
  input: AdminPostInput,
) => {
  try {
    storage.setItem(key, JSON.stringify(input))
  } catch {
    return
  }
}

export const clearAdminPostDraft = (storage: Storage, key: string) => {
  try {
    storage.removeItem(key)
  } catch {
    return
  }
}
