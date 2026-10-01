import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAdminCommentNotifications } from '~/stores/adminCommentNotifications'

const api = vi.hoisted(() => ({
  getUnreadCommentCount: vi.fn(),
  markAdminCommentsRead: vi.fn(),
}))
vi.mock('~/api/client', () => ({ useApiClient: () => api }))
vi.mock('~/stores/adminSession', () => ({
  useAdminSession: () => ({
    isAuthenticated: true,
    withSession: (request: () => unknown) => request(),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ref', ref)
  setActivePinia(createPinia())
})
afterEach(() => vi.unstubAllGlobals())

it('an older unread request cannot replace a queued read acknowledgement', async () => {
  let complete!: (count: number) => void
  api.getUnreadCommentCount.mockImplementationOnce(
    () =>
      new Promise<number>((resolve) => {
        complete = resolve
      }),
  )
  api.markAdminCommentsRead.mockResolvedValueOnce(1)
  const store = useAdminCommentNotifications()
  const older = store.refresh()
  await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
  const newer = store.markRead(['21', '20'])
  complete(21)
  await Promise.all([older, newer])
  expect(store.count).toBe(1)
  expect(api.markAdminCommentsRead).toHaveBeenCalledWith(['21', '20'])
})

it('a failed receipt preserves the known count and the queue can recover', async () => {
  api.getUnreadCommentCount.mockResolvedValue(21)
  api.markAdminCommentsRead
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(1)
  const store = useAdminCommentNotifications()
  await store.refresh()
  await expect(store.markRead(['21'])).rejects.toThrow('offline')
  expect(store.count).toBe(21)
  await store.markRead(['21'])
  expect(store.count).toBe(1)
})

it('large discussions acknowledge only their explicit IDs in bounded batches', async () => {
  api.markAdminCommentsRead
    .mockResolvedValueOnce(105)
    .mockResolvedValueOnce(5)
    .mockResolvedValueOnce(0)
  const store = useAdminCommentNotifications()
  const ids = Array.from({ length: 205 }, (_, index) => String(index + 1))
  await store.markRead([...ids, ids[0]!])
  expect(
    api.markAdminCommentsRead.mock.calls.map((call) => call[0].length),
  ).toEqual([100, 100, 5])
  expect(
    api.markAdminCommentsRead.mock.calls.flatMap((call) => call[0]),
  ).toEqual(ids)
  expect(store.count).toBe(0)
})
