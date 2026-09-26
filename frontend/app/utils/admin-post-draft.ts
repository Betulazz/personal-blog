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

const isAdminPostInput = (value: unknown): value is AdminPostInput => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.summary === 'string' &&
    typeof candidate.body === 'string'
  )
}

export const readAdminPostDraft = (
  storage: Storage,
  key: string,
): AdminPostInput | null => {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isAdminPostInput(parsed) ? parsed : null
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
