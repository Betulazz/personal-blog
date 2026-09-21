import { defineStore } from 'pinia'
import { BlogApiError, useApiClient } from '~/api/client'
import type { AdminUser } from '~/types/admin'

export type AdminSessionStatus =
  | 'authenticated'
  | 'forbidden'
  | 'loading'
  | 'refreshing'
  | 'unavailable'
  | 'unauthenticated'

const isApiError = (error: unknown): error is BlogApiError =>
  error instanceof BlogApiError

const statusForError = (error: unknown): AdminSessionStatus => {
  if (isApiError(error) && error.status === 403) {
    return 'forbidden'
  }
  if (isApiError(error) && (error.status === 0 || error.status >= 500)) {
    return 'unavailable'
  }
  return 'unauthenticated'
}

export const useAdminSession = defineStore('admin-session', () => {
  const api = useApiClient()
  const user = ref<AdminUser | null>(null)
  const status = ref<AdminSessionStatus>('loading')
  const initialized = ref(false)
  const errorMessage = ref<string | null>(null)

  const isAuthenticated = computed(() => status.value === 'authenticated')

  const classifyFailure = (error: unknown) => {
    user.value = null
    status.value = statusForError(error)
    errorMessage.value =
      status.value === 'forbidden'
        ? '当前账号没有访问后台的权限。'
        : status.value === 'unavailable'
          ? '后台服务暂时无法响应，请稍后重试。'
          : null
  }

  const setAuthenticated = (nextUser: AdminUser) => {
    user.value = nextUser
    status.value = 'authenticated'
    errorMessage.value = null
  }

  const refreshSession = async () => {
    status.value = 'refreshing'
    errorMessage.value = null
    try {
      const nextUser = await api.refreshSession()
      setAuthenticated(nextUser)
      return nextUser
    } catch (error: unknown) {
      classifyFailure(error)
      throw error
    }
  }

  const restore = async (force = false) => {
    if (!force && initialized.value) {
      return user.value
    }
    initialized.value = true
    status.value = 'loading'
    errorMessage.value = null
    try {
      const currentUser = await api.getCurrentUser()
      setAuthenticated(currentUser)
      return currentUser
    } catch (error: unknown) {
      if (isApiError(error) && error.status === 401) {
        try {
          return await refreshSession()
        } catch {
          return null
        }
      }
      classifyFailure(error)
      return null
    }
  }

  const login = async (identifier: string, password: string) => {
    initialized.value = true
    status.value = 'loading'
    errorMessage.value = null
    try {
      const nextUser = await api.login(identifier, password)
      setAuthenticated(nextUser)
      return nextUser
    } catch (error: unknown) {
      classifyFailure(error)
      throw error
    }
  }

  const withSession = async <T>(request: () => Promise<T>): Promise<T> => {
    try {
      return await request()
    } catch (error: unknown) {
      if (!isApiError(error) || error.status !== 401) {
        throw error
      }
      await refreshSession()
      return request()
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } finally {
      user.value = null
      status.value = 'unauthenticated'
      initialized.value = true
      errorMessage.value = null
    }
  }

  return {
    errorMessage,
    isAuthenticated,
    login,
    logout,
    refreshSession,
    restore,
    status,
    user,
    withSession,
  }
})
