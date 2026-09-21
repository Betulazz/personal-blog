import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminTaxonomy } from '~/types/admin'
import type { AdminNoteMetadata, AdminResourceApi } from '~/types/admin-notes'

export function adminNoteError(error: unknown) {
  if (!(error instanceof BlogApiError))
    return '操作失败，请重试。当前输入仍然保留。'
  if (error.status === 403) return '当前账号没有管理此内容的权限。'
  if (error.status === 401)
    return '会话已过期，请重新登录。当前输入会在本次应用会话内保留。'
  if (error.code === 'tag_not_found')
    return '所选标签已不存在，请刷新标签并重新选择。'
  if (error.status === 404) return '这条内容已经不存在，可能已被删除。'
  if (error.status === 409)
    return '内容状态已改变，请重新加载状态后重试。未保存输入仍会保留。'
  if (error.status === 422) return '请检查正文、标签和图片字段的格式与长度。'
  return '后台服务暂时无法响应，当前输入仍然保留，请稍后重试。'
}

export function useAdminNoteEditor<
  T extends AdminNoteMetadata,
  Input extends object,
>(options: {
  resource: 'moments' | 'chatter'
  id?: string
  api: AdminResourceApi<T, Input>
  empty: () => Input
  toInput: (record: T) => Input
}) {
  const session = useAdminSession()
  const api = useApiClient()
  // Memory-only drafts survive the layout's refresh/login cycle; no credentials are stored.
  const draftKey = `admin-draft:${options.resource}:${options.id ?? 'new'}`
  const form = useState<Input>(draftKey, options.empty)
  const initialized = useState(`${draftKey}:initialized`, () => !options.id)
  const record = ref<T | null>(null)
  const tags = ref<AdminTaxonomy[]>([])
  const loading = ref(true)
  const loadFailed = ref(false)
  const busy = ref(false)
  const error = ref('')
  const notice = ref('')
  let loadController: AbortController | null = null

  const load = async () => {
    loadController?.abort()
    const controller = new AbortController()
    loadController = controller
    loading.value = true
    loadFailed.value = false
    error.value = ''
    try {
      const [loadedTags, loaded] = await session.withSession(() =>
        Promise.all([
          api.listAdminTags(controller.signal),
          options.id
            ? options.api.get(options.id, controller.signal)
            : Promise.resolve(null),
        ]),
      )
      tags.value = loadedTags
      record.value = loaded
      if (loaded && !initialized.value) {
        form.value = options.toInput(loaded)
        initialized.value = true
      }
    } catch (failure) {
      if (isAbortError(failure)) return
      error.value = adminNoteError(failure)
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
    // Capture the submitted value so automatic retries cannot submit a different draft.
    const input = structuredClone(toRaw(form.value))
    try {
      const saved = await session.withSession(() =>
        options.id
          ? options.api.update(options.id, input)
          : options.api.create(input),
      )
      record.value = saved
      notice.value = '已保存'
      if (!options.id) {
        await navigateTo(`/admin/${options.resource}/${saved.id}/edit`, {
          replace: true,
        })
      }
    } catch (failure) {
      error.value = adminNoteError(failure)
    } finally {
      busy.value = false
    }
  }

  const act = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (!options.id || busy.value) return
    busy.value = true
    error.value = ''
    notice.value = ''
    try {
      const result = await session.withSession(
        async () => await options.api[action](options.id!),
      )
      if (action === 'delete') {
        await navigateTo(`/admin/${options.resource}`)
        clearNuxtState([draftKey, `${draftKey}:initialized`])
      } else if (result) {
        record.value = result
        notice.value = action === 'publish' ? '已发布保存的版本' : '已撤回'
      }
    } catch (failure) {
      error.value = adminNoteError(failure)
    } finally {
      busy.value = false
    }
  }

  onMounted(load)
  onBeforeUnmount(() => loadController?.abort())
  return {
    form,
    record,
    tags,
    loading,
    loadFailed,
    busy,
    error,
    notice,
    load,
    save,
    act,
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
