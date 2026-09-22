import { BlogApiError } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'

export interface AdminPortfolioRecord {
  id: string
}

export interface AdminPortfolioResource<T extends AdminPortfolioRecord, Input> {
  create: (input: Input) => Promise<T>
  delete: (id: string) => Promise<void>
  get: (id: string, signal?: AbortSignal) => Promise<T>
  update: (id: string, input: Input) => Promise<T>
}

export function adminPortfolioError(error: unknown, resource: string) {
  if (!(error instanceof BlogApiError)) {
    return `${resource}操作失败，当前输入仍然保留。`
  }
  if (error.status === 401) {
    return '会话已过期，请重新登录；当前输入仍然保留。'
  }
  if (error.status === 403) return `当前账号没有管理${resource}的权限。`
  if (error.status === 404) return `这条${resource}已经不存在，可能已被删除。`
  if (error.status === 422) return '请检查字段格式与长度，当前输入仍然保留。'
  if (error.status === 0 || error.status >= 500) {
    return `后台服务暂时无法响应，当前${resource}输入仍然保留。`
  }
  return `${resource}操作失败，当前输入仍然保留。`
}

export function useAdminPortfolioEditor<
  T extends AdminPortfolioRecord,
  Input extends object,
>(options: {
  api: AdminPortfolioResource<T, Input>
  describeError?: (error: unknown, resource: string) => string
  empty: () => Input
  id?: string
  resource: string
  toInput: (record: T) => Input
}) {
  const session = useAdminSession()
  const describeError = options.describeError ?? adminPortfolioError
  const draftKey = `admin-draft:${options.resource}:${options.id ?? 'new'}`
  const form = useState<Input>(draftKey, options.empty)
  const initialized = useState(`${draftKey}:initialized`, () => !options.id)
  const record = ref<T | null>(null)
  const loading = ref(Boolean(options.id))
  const loadFailed = ref(false)
  const busy = ref(false)
  const error = ref('')
  const notice = ref('')
  let loadController: AbortController | null = null

  const load = async () => {
    loadController?.abort()
    loadController = options.id ? new AbortController() : null
    if (!options.id) {
      loading.value = false
      return
    }
    loading.value = true
    loadFailed.value = false
    error.value = ''
    try {
      const loaded = await session.withSession(() =>
        options.api.get(options.id!, loadController?.signal),
      )
      record.value = loaded
      if (!initialized.value) {
        form.value = options.toInput(loaded)
        initialized.value = true
      }
    } catch (failure) {
      if (isAbortError(failure)) return
      error.value = describeError(failure, options.resource)
      loadFailed.value = true
    } finally {
      loading.value = false
    }
  }

  const save = async () => {
    if (busy.value) return
    busy.value = true
    error.value = ''
    notice.value = ''
    const input = structuredClone(toRaw(form.value))
    const submittedDraft = JSON.stringify(toRaw(form.value))
    try {
      const saved = await session.withSession(() =>
        options.id
          ? options.api.update(options.id, input)
          : options.api.create(input),
      )
      record.value = saved
      notice.value =
        JSON.stringify(toRaw(form.value)) === submittedDraft
          ? '已保存'
          : '已保存提交版本；后续编辑仍保留，请再次保存。'
      if (!options.id) {
        const nextDraftKey = `admin-draft:${options.resource}:${saved.id}`
        const nextForm = useState<Input>(nextDraftKey, () => input)
        const nextInitialized = useState(
          `${nextDraftKey}:initialized`,
          () => false,
        )
        nextForm.value = structuredClone(toRaw(form.value))
        nextInitialized.value = true
        await navigateTo(`/admin/${options.resource}/${saved.id}/edit`, {
          replace: true,
        })
      }
    } catch (failure) {
      error.value = describeError(failure, options.resource)
    } finally {
      busy.value = false
    }
  }

  const remove = async () => {
    if (!options.id || busy.value) return
    busy.value = true
    error.value = ''
    notice.value = ''
    try {
      await session.withSession(() => options.api.delete(options.id!))
      clearNuxtState([draftKey, `${draftKey}:initialized`])
      await navigateTo(`/admin/${options.resource}`)
    } catch (failure) {
      error.value = describeError(failure, options.resource)
    } finally {
      busy.value = false
    }
  }

  onMounted(load)
  onBeforeUnmount(() => loadController?.abort())
  return {
    busy,
    error,
    form,
    load,
    loadFailed,
    loading,
    notice,
    record,
    remove,
    save,
  }
}

function isAbortError(error: unknown) {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError')
  )
}
