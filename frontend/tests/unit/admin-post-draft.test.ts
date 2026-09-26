import { describe, expect, it } from 'vitest'

import type { AdminPostInput } from '../../app/types/admin'
import {
  ADMIN_POST_DRAFT_PREFIX,
  adminPostDraftKey,
  clearAdminPostDraft,
  isAdminPostDraftDirty,
  readAdminPostDraft,
  saveAdminPostDraft,
  serializeAdminPostInput,
} from '../../app/utils/admin-post-draft'

const createInput = (
  overrides: Partial<AdminPostInput> = {},
): AdminPostInput => ({
  body: '# 正文',
  cover_alt: null,
  cover_url: null,
  is_pinned: false,
  slug: 'night-note',
  summary: '摘要',
  tag_ids: [2, 1],
  title: '夜间记录',
  ...overrides,
})

const createStorage = (): Storage => {
  const map = new Map<string, string>()
  return {
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size
    },
    removeItem: (key) => {
      map.delete(key)
    },
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

describe('admin Post draft', () => {
  it('serializes equivalent inputs identically regardless of tag order', () => {
    expect(serializeAdminPostInput(createInput({ tag_ids: [1, 2] }))).toBe(
      serializeAdminPostInput(createInput({ tag_ids: [2, 1] })),
    )
  })

  it('treats trimmed content differences as the same draft', () => {
    expect(serializeAdminPostInput(createInput({ title: ' 夜间记录 ' }))).toBe(
      serializeAdminPostInput(createInput()),
    )
    expect(serializeAdminPostInput(createInput({ summary: ' 摘要 ' }))).toBe(
      serializeAdminPostInput(createInput()),
    )
  })

  it('detects real edits, including body changes', () => {
    const baseline = serializeAdminPostInput(createInput())

    expect(
      isAdminPostDraftDirty(
        serializeAdminPostInput(createInput({ body: '# 新的正文' })),
        baseline,
      ),
    ).toBe(true)
    expect(
      isAdminPostDraftDirty(
        serializeAdminPostInput(createInput({ title: '新的标题' })),
        baseline,
      ),
    ).toBe(true)
    expect(isAdminPostDraftDirty(baseline, baseline)).toBe(false)
    expect(isAdminPostDraftDirty('anything', '')).toBe(false)
  })

  it('round-trips a draft through storage and clears it safely', () => {
    const storage = createStorage()
    const key = adminPostDraftKey('42')
    const input = createInput()

    expect(key).toBe(`${ADMIN_POST_DRAFT_PREFIX}42`)
    expect(readAdminPostDraft(storage, key)).toBeNull()

    saveAdminPostDraft(storage, key, input)
    expect(readAdminPostDraft(storage, key)).toEqual(input)

    clearAdminPostDraft(storage, key)
    expect(readAdminPostDraft(storage, key)).toBeNull()
  })

  it('ignores corrupt or unrelated stored values', () => {
    const storage = createStorage()
    const key = adminPostDraftKey()

    storage.setItem(key, 'not json')
    expect(readAdminPostDraft(storage, key)).toBeNull()

    storage.setItem(key, JSON.stringify({ title: '缺少正文' }))
    expect(readAdminPostDraft(storage, key)).toBeNull()

    storage.setItem(key, JSON.stringify(createInput()))
    expect(readAdminPostDraft(storage, key)).toEqual(createInput())
  })

  it('survives storage failures without throwing', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage

    expect(readAdminPostDraft(broken, 'key')).toBeNull()
    expect(() => saveAdminPostDraft(broken, 'key', createInput())).not.toThrow()
    expect(() => clearAdminPostDraft(broken, 'key')).not.toThrow()
  })
})
