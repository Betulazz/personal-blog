import { effectScope, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BlogApiError } from '~/api/client'
import { usePostEditor } from '~/composables/usePostEditor'
import type { AdminPost, AdminPostInput } from '~/types/admin'
import {
  adminPostDraftKey,
  readAdminPostDraftRecord,
  saveAdminPostDraft,
} from '~/utils/admin-post-draft'

const post = (overrides: Partial<AdminPost> = {}): AdminPost => ({
  id: '2',
  title: '原标题',
  slug: 'original',
  summary: '',
  body: '# 原正文',
  isPinned: false,
  status: 'draft',
  tagIds: ['1'],
  tags: [],
  createdAt: '',
  updatedAt: '',
  readingCount: 0,
  readingTimeMinutes: 1,
  ...overrides,
})
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const cleanups: Array<() => void> = []
async function start(id: string | null = '2') {
  const api = {
    getAdminPost: vi.fn().mockResolvedValue(post()),
    listAdminTags: vi.fn().mockResolvedValue([]),
    createAdminPost: vi.fn().mockResolvedValue(post({ id: '3' })),
    updateAdminPost: vi
      .fn()
      .mockImplementation(async (_id: string, input: AdminPostInput) =>
        post({
          title: input.title,
          slug: input.slug,
          body: input.body,
          summary: input.summary,
          tagIds: (input.tag_ids ?? []).map(String),
        }),
      ),
    previewAdminPost: vi.fn().mockResolvedValue(post()),
    publishAdminPost: vi.fn().mockResolvedValue(post({ status: 'published' })),
    unpublishAdminPost: vi.fn().mockResolvedValue(post()),
    deleteAdminPost: vi.fn().mockResolvedValue(undefined),
    listAdminPosts: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
  }
  const postId = ref(id ?? undefined)
  const authenticated = ref(true)
  const navigate = vi.fn().mockResolvedValue(undefined)
  const scope = effectScope()
  const flow = scope.run(() =>
    usePostEditor({
      postId,
      authenticated,
      api,
      navigate,
      withSession: (request) => request(),
      storage: () => sessionStorage,
    }),
  )!
  cleanups.push(() => {
    flow.dispose()
    scope.stop()
  })
  await vi.waitFor(() => expect(flow.isLoading.value).toBe(false))
  flow.canonical(flow.input.value.body)
  return { flow, api, postId, authenticated, navigate }
}
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  sessionStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Post editing lifecycle', () => {
  it('normalizes untouched Markdown without marking it dirty, and preserves a recovered edit', async () => {
    const { flow } = await start()
    flow.canonical('# 原正文\n')
    expect(flow.isDirty.value).toBe(false)
    flow.edit({ ...flow.input.value, body: '# 修改' })
    flow.canonical('# 修改\n')
    expect(flow.isDirty.value).toBe(true)
  })

  it('locks every edit and rejects overlapping operations while saving', async () => {
    const { flow, api } = await start()
    flow.edit({ ...flow.input.value, title: '保存标题' })
    const wait = deferred<AdminPost>()
    api.updateAdminPost.mockReturnValueOnce(wait.promise)
    const saving = flow.save()
    expect(flow.locked.value).toBe(true)
    flow.edit({
      ...flow.input.value,
      title: '迟到修改',
      body: '迟到正文',
      tag_ids: [2],
    })
    await flow.save()
    flow.requestAction('publish')
    await flow.preview()
    expect(flow.input.value.title).toBe('保存标题')
    expect(api.updateAdminPost).toHaveBeenCalledTimes(1)
    expect(api.previewAdminPost).not.toHaveBeenCalled()
    expect(flow.leave()).toBe(false)
    wait.resolve(post({ title: '保存标题' }))
    await saving
    expect(flow.isDirty.value).toBe(false)
    expect(
      readAdminPostDraftRecord(sessionStorage, adminPostDraftKey('2')),
    ).toBeNull()
    expect(flow.locked.value).toBe(false)
  })

  it('blocks publishing unsaved content before opening a confirmation', async () => {
    const { flow, api } = await start()
    flow.edit({ ...flow.input.value, body: '未保存正文' })
    flow.requestAction('publish')
    expect(flow.pendingAction.value).toBeNull()
    expect(flow.errorMessage.value).toContain('先保存再发布')
    await flow.confirmAction()
    expect(api.publishAdminPost).not.toHaveBeenCalled()
    expect(flow.input.value.body).toBe('未保存正文')
  })

  it('unpublishes without overwriting unsaved fields and updates the displayed status', async () => {
    const { flow, api } = await start()
    flow.edit({ ...flow.input.value, title: '尚未保存', body: '新正文' })
    flow.requestAction('unpublish')
    await flow.confirmAction()
    expect(api.unpublishAdminPost).toHaveBeenCalledWith('2')
    expect(flow.post.value?.status).toBe('draft')
    expect(flow.input.value.title).toBe('尚未保存')
    expect(flow.input.value.body).toBe('新正文')
    expect(flow.isDirty.value).toBe(true)
    expect(
      readAdminPostDraftRecord(sessionStorage, adminPostDraftKey('2'))?.input
        .title,
    ).toBe('尚未保存')
  })

  it('immediately flushes a retained draft and restores it against the server baseline', async () => {
    const { flow } = await start()
    flow.edit({ ...flow.input.value, title: '保留的新标题' })
    const leaving = flow.leave()
    flow.finishLeave('keep')
    expect(await leaving).toBe(true)
    expect(
      readAdminPostDraftRecord(sessionStorage, adminPostDraftKey('2'))?.input
        .title,
    ).toBe('保留的新标题')
    flow.dispose()
    const { flow: reopened } = await start()
    expect(reopened.recoveryOpen.value).toBe(true)
    reopened.restoreDraft()
    expect(reopened.input.value.title).toBe('保留的新标题')
    expect(reopened.isDirty.value).toBe(true)
  })

  it('cancels deferred backup on discard so it cannot resurrect after leaving', async () => {
    const { flow } = await start()
    vi.useFakeTimers()
    flow.edit({ ...flow.input.value, title: '丢弃' })
    const leaving = flow.leave()
    flow.finishLeave('discard')
    expect(await leaving).toBe(true)
    flow.dispose()
    await vi.runAllTimersAsync()
    expect(sessionStorage.getItem(adminPostDraftKey('2'))).toBeNull()
  })

  it('flushes the most recent keystroke before refresh and warns during writes', async () => {
    const { flow } = await start()
    flow.edit({ ...flow.input.value, body: '最后一个字符' })
    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent
    flow.beforeUnload(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(
      readAdminPostDraftRecord(sessionStorage, adminPostDraftKey('2'))?.input
        .body,
    ).toBe('最后一个字符')
  })

  it('creates a Post then navigates to its ID and clears only the new draft', async () => {
    const { flow, api, navigate } = await start(null)
    flow.edit({
      ...flow.input.value,
      title: '新建',
      slug: 'new-post',
      body: '内容',
    })
    sessionStorage.setItem(adminPostDraftKey('9'), 'unrelated')
    api.createAdminPost.mockResolvedValue(
      post({
        id: '3',
        title: '新建',
        slug: 'new-post',
        body: '内容',
        tagIds: [],
      }),
    )
    await flow.save()
    expect(navigate).toHaveBeenCalledWith('/admin/posts/3/edit')
    expect(sessionStorage.getItem(adminPostDraftKey())).toBeNull()
    expect(sessionStorage.getItem(adminPostDraftKey('9'))).toBe('unrelated')
  })

  it('retains a known save failure as an ordinary editable draft', async () => {
    const { flow, api } = await start()
    flow.edit({ ...flow.input.value, title: '冲突内容' })
    api.updateAdminPost.mockRejectedValue(
      new BlogApiError('conflict', { status: 409, code: 'post_slug_conflict' }),
    )
    await flow.save()
    expect(flow.unknown.value).toBeUndefined()
    expect(flow.canWrite.value).toBe(true)
    expect(flow.errorMessage.value).toContain('slug')
    expect(
      readAdminPostDraftRecord(sessionStorage, adminPostDraftKey('2'))?.input
        .title,
    ).toBe('冲突内容')
  })

  it('preserves unknown outcomes across further edits and reload, without automatic retry', async () => {
    const { flow, api } = await start()
    flow.edit({ ...flow.input.value, title: '请求内容' })
    api.updateAdminPost.mockRejectedValue(
      new BlogApiError('offline', { status: 0 }),
    )
    await flow.save()
    flow.edit({ ...flow.input.value, title: '断网后继续编辑' })
    await flow.save()
    expect(api.updateAdminPost).toHaveBeenCalledTimes(1)
    flow.dispose()
    const { flow: reopened } = await start()
    reopened.restoreDraft()
    expect(reopened.input.value.title).toBe('断网后继续编辑')
    expect(reopened.unknown.value?.submitted.title).toBe('请求内容')
    expect(reopened.canWrite.value).toBe(false)
  })

  it('backs up an in-flight operation before a hard reload', async () => {
    const { flow, api } = await start()
    const wait = deferred<AdminPost>()
    api.publishAdminPost.mockReturnValueOnce(wait.promise)
    flow.requestAction('publish')
    const publishing = flow.confirmAction()
    flow.dispose()
    const { flow: reopened } = await start()
    expect(reopened.recoveryOpen.value).toBe(true)
    reopened.restoreDraft()
    expect(reopened.unknown.value?.action).toBe('publish')
    wait.resolve(post({ status: 'published' }))
    await publishing
    expect(reopened.unknown.value?.action).toBe('publish')
  })

  it('reconciles a successful save while retaining subsequent unsaved content', async () => {
    const { flow, api } = await start()
    flow.edit({ ...flow.input.value, title: '已保存但断网' })
    api.updateAdminPost.mockRejectedValue(
      new BlogApiError('offline', { status: 0 }),
    )
    await flow.save()
    flow.edit({ ...flow.input.value, title: '之后的新编辑' })
    api.getAdminPost.mockResolvedValue(post({ title: '已保存但断网' }))
    await flow.reconcile()
    expect(flow.unknown.value).toBeUndefined()
    expect(flow.input.value.title).toBe('之后的新编辑')
    expect(flow.isDirty.value).toBe(true)
  })

  it('keeps uncertainty when the server does not match, until explicit acknowledgment', async () => {
    const { flow, api } = await start()
    flow.edit({ ...flow.input.value, title: '未确认' })
    api.updateAdminPost.mockRejectedValue(new Error('lost response'))
    await flow.save()
    await flow.reconcile()
    expect(flow.unknown.value).toBeDefined()
    flow.acknowledgeUnknown()
    expect(flow.unknown.value).toBeUndefined()
    expect(flow.input.value.title).toBe('未确认')
    expect(flow.isDirty.value).toBe(true)
  })

  it('transfers newer edits to a found new Post when reconciling creation', async () => {
    const { flow, api, navigate } = await start(null)
    flow.edit({
      ...flow.input.value,
      title: '已创建',
      slug: 'created',
      body: '# 正文',
    })
    api.createAdminPost.mockRejectedValue(new Error('lost response'))
    await flow.save()
    flow.edit({ ...flow.input.value, title: '创建之后的修改' })
    api.listAdminPosts.mockResolvedValue({
      data: [
        post({
          id: '3',
          title: '已创建',
          slug: 'created',
          body: '# 正文',
          tagIds: [],
        }),
      ],
      pagination: {},
    })
    await flow.reconcile()
    expect(navigate).toHaveBeenCalledWith('/admin/posts/3/edit')
    expect(
      readAdminPostDraftRecord(sessionStorage, adminPostDraftKey('3'))?.input
        .title,
    ).toBe('创建之后的修改')
    expect(sessionStorage.getItem(adminPostDraftKey())).toBeNull()
  })

  it('ignores stale save results after switching Post identity', async () => {
    const { flow, api, postId } = await start()
    flow.edit({ ...flow.input.value, title: '原文章备份' })
    const wait = deferred<AdminPost>()
    api.updateAdminPost.mockReturnValueOnce(wait.promise)
    const saving = flow.save()
    api.getAdminPost.mockResolvedValue(post({ id: '4', title: '另一篇' }))
    postId.value = '4'
    await vi.waitFor(() => expect(flow.isLoading.value).toBe(false))
    flow.canonical(flow.input.value.body)
    flow.edit({ ...flow.input.value, title: '另一篇的新编辑' })
    wait.resolve(post({ title: '原文章备份' }))
    await saving
    expect(flow.input.value.title).toBe('另一篇的新编辑')
    expect(
      readAdminPostDraftRecord(sessionStorage, adminPostDraftKey('2'))?.unknown,
    ).toBeDefined()
  })

  it('ignores late preview and load responses across identity changes', async () => {
    const { flow, api, postId } = await start()
    const wait = deferred<AdminPost>()
    api.previewAdminPost.mockReturnValueOnce(wait.promise)
    const previewing = flow.preview()
    api.getAdminPost.mockResolvedValue(post({ id: '4' }))
    postId.value = '4'
    await vi.waitFor(() => expect(flow.isLoading.value).toBe(false))
    wait.resolve(post({ body: '旧预览' }))
    await previewing
    expect(flow.previewOpen.value).toBe(false)
    const oldLoad = deferred<AdminPost>()
    api.getAdminPost.mockReturnValueOnce(oldLoad.promise)
    postId.value = '5'
    api.getAdminPost.mockResolvedValue(post({ id: '6' }))
    postId.value = '6'
    await vi.waitFor(() => expect(flow.post.value?.id).toBe('6'))
    oldLoad.resolve(post({ id: '5' }))
    await oldLoad.promise
    expect(flow.post.value?.id).toBe('6')
  })

  it('rejects malformed optional draft fields, while accepting valid legacy drafts', async () => {
    sessionStorage.setItem(
      adminPostDraftKey('2'),
      JSON.stringify({
        title: '',
        slug: '',
        summary: '',
        body: '',
        tag_ids: 'wrong',
      }),
    )
    const { flow } = await start()
    expect(flow.recoveryOpen.value).toBe(false)
    flow.dispose()
    saveAdminPostDraft(sessionStorage, adminPostDraftKey('2'), {
      ...flow.input.value,
      body: '旧版备份',
    })
    const { flow: reopened } = await start()
    reopened.restoreDraft()
    expect(reopened.input.value.body).toBe('旧版备份')
  })

  it('clears draft backups after a confirmed deletion and navigates safely', async () => {
    const { flow, navigate } = await start()
    flow.edit({ ...flow.input.value, body: '删除前的修改' })
    flow.requestAction('delete')
    await flow.confirmAction()
    expect(sessionStorage.getItem(adminPostDraftKey('2'))).toBeNull()
    expect(navigate).toHaveBeenCalledWith('/admin/posts')
  })

  it('normalizes write fields while keeping Markdown unchanged', async () => {
    const { flow, api } = await start()
    flow.edit({
      ...flow.input.value,
      title: ' 标题 ',
      slug: ' trimmed-slug ',
      summary: ' 摘要 ',
      cover_url: ' ',
      cover_alt: ' 描述 ',
      body: '# 正文\n\n',
    })
    await flow.save()
    expect(api.updateAdminPost).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({
        title: '标题',
        slug: 'trimmed-slug',
        summary: '摘要',
        cover_url: null,
        cover_alt: '描述',
        body: '# 正文\n\n',
      }),
    )
  })

  it('does not claim to retain a draft when browser storage rejects the write', async () => {
    const { flow } = await start()
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    flow.edit({ ...flow.input.value, title: '不能静默丢失' })
    const leaving = flow.leave()
    flow.finishLeave('keep')
    expect(flow.leaveDialogOpen.value).toBe(true)
    expect(flow.notice.value).toContain('无法保留本地备份')
    flow.finishLeave('stay')
    expect(await leaving).toBe(false)
    expect(flow.input.value.title).toBe('不能静默丢失')
  })

  it('searches by title and scans pages for the exact slug to reconcile a creation', async () => {
    const { flow, api, navigate } = await start(null)
    flow.edit({
      ...flow.input.value,
      title: '重名标题',
      slug: 'exact-slug',
      body: '正文',
    })
    api.createAdminPost.mockRejectedValue(new Error('lost response'))
    await flow.save()
    api.listAdminPosts
      .mockResolvedValueOnce({
        data: [post({ title: '重名标题', slug: 'another-slug' })],
        pagination: { totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [
          post({
            id: '3',
            title: '重名标题',
            slug: 'exact-slug',
            body: '正文',
            tagIds: [],
          }),
        ],
        pagination: { totalPages: 2 },
      })
    await flow.reconcile()
    expect(api.listAdminPosts).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 100,
      q: '重名标题',
    })
    expect(api.listAdminPosts).toHaveBeenNthCalledWith(2, {
      page: 2,
      pageSize: 100,
      q: '重名标题',
    })
    expect(navigate).toHaveBeenCalledWith('/admin/posts/3/edit')
  })

  it('confirms a previously uncertain deletion from a not-found response', async () => {
    const { flow, api, navigate } = await start()
    api.deleteAdminPost.mockRejectedValue(new Error('lost response'))
    flow.requestAction('delete')
    await flow.confirmAction()
    expect(flow.unknown.value?.action).toBe('delete')
    api.getAdminPost.mockRejectedValue(
      new BlogApiError('not found', { status: 404, code: 'post_not_found' }),
    )
    await flow.reconcile()
    expect(flow.unknown.value).toBeUndefined()
    expect(sessionStorage.getItem(adminPostDraftKey('2'))).toBeNull()
    expect(navigate).toHaveBeenCalledWith('/admin/posts')
  })
})
