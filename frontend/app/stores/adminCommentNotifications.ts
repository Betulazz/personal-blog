import { defineStore } from 'pinia'
import { useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'

export const useAdminCommentNotifications = defineStore(
  'admin-comment-notifications',
  () => {
    const api = useApiClient()
    const session = useAdminSession()
    const count = ref(0)
    let revision = 0
    let queue: Promise<unknown> = Promise.resolve()

    // Serialize reads and acknowledgements so an old count cannot replace a
    // newer receipt. Each Nuxt/Pinia instance owns its queue (including SSR).
    const enqueue = (request: () => Promise<number>) => {
      const current = ++revision
      const result = queue
        .catch(() => undefined)
        .then(async () => {
          if (!session.isAuthenticated) return count.value
          const value = await request()
          if (current === revision && session.isAuthenticated)
            count.value = value
          return value
        })
      queue = result
      return result
    }

    const refresh = () =>
      enqueue(() => session.withSession(() => api.getUnreadCommentCount()))
    const markRead = (ids: string[]) =>
      enqueue(async () => {
        let value = count.value
        const unique = [...new Set(ids)]
        for (let offset = 0; offset < unique.length; offset += 100) {
          value = await session.withSession(() =>
            api.markAdminCommentsRead(unique.slice(offset, offset + 100)),
          )
        }
        return unique.length
          ? value
          : session.withSession(() => api.getUnreadCommentCount())
      })
    const reset = () => {
      revision++
      count.value = 0
    }

    return { count, markRead, refresh, reset }
  },
)
