import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BlogApiError } from '~/api/client'
import { useCommentThread } from '~/composables/useCommentThread'
import type { BlogComment, PublicCommentThread } from '~/types/comments'

const api = vi.hoisted(() => ({
  getCommenterSession: vi.fn(),
  getAboutComments: vi.fn(),
  getPostComments: vi.fn(),
  previewComment: vi.fn(),
  createAboutComment: vi.fn(),
  createPostComment: vi.fn(),
  editComment: vi.fn(),
  toggleCommentLike: vi.fn(),
  deleteComment: vi.fn(),
  logoutCommenter: vi.fn(),
  commenterLoginUrl: vi.fn(),
}))
vi.mock('~/api/client', async (original) => ({
  ...(await original<typeof import('~/api/client')>()),
  useApiClient: () => api,
}))

type Resource = { resourceType: 'about' | 'post'; postId?: string }
type Flow = ReturnType<typeof useCommentThread>
const wrappers: VueWrapper[] = []
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const comment = (
  id: string,
  overrides: Partial<BlogComment> = {},
): BlogComment => ({
  id,
  author: {
    kind: 'commenter',
    name: 'reader',
    avatarUrl: null,
    profileUrl: null,
  },
  bodyHtml: '<p>original</p>',
  bodyMarkdown: 'original',
  canEdit: true,
  createdAt: '2026-10-01T08:00:00Z',
  editedAt: null,
  likeCount: 2,
  likedByMe: true,
  replies: [],
  state: 'visible',
  ...overrides,
})
const discussion = (
  overrides: Partial<PublicCommentThread> = {},
): PublicCommentThread => ({
  resourceKey: 'post:1',
  isOpen: true,
  commentCount: 1,
  comments: [comment('1')],
  hasMore: false,
  nextCursor: null,
  ...overrides,
})
function start(
  resource: Ref<Resource> = ref({ resourceType: 'post', postId: '1' }),
) {
  let flow!: Flow
  const wrapper = mount(
    defineComponent({
      setup() {
        flow = useCommentThread(resource)
        return () => h('div')
      },
    }),
  )
  wrappers.push(wrapper)
  return { flow, resource, wrapper }
}
const ready = async (flow: Flow) =>
  vi.waitFor(() => expect(flow.isLoading.value).toBe(false))

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  vi.stubGlobal('useRoute', () => ({ path: '/posts/one', query: {}, hash: '' }))
  vi.stubGlobal('useRouter', () => ({
    replace: vi.fn().mockResolvedValue(undefined),
  }))
  api.getCommenterSession.mockResolvedValue({
    githubLoginEnabled: true,
    commenter: {
      login: 'reader',
      githubUserId: '1',
      avatarUrl: null,
      profileUrl: null,
      isBanned: false,
    },
  })
  api.getPostComments.mockResolvedValue(discussion())
  api.getAboutComments.mockResolvedValue(discussion({ resourceKey: 'about' }))
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Comment Thread interface', () => {
  it('ignores an old thread response, including its loading and notification state', async () => {
    const old = deferred<PublicCommentThread>()
    api.getPostComments.mockImplementation((id) =>
      id === '1'
        ? old.promise
        : Promise.resolve(discussion({ resourceKey: 'post:2' })),
    )
    const { flow, resource } = start()
    resource.value = { resourceType: 'post', postId: '2' }
    await ready(flow)
    flow.body.value = 'second thread draft'
    old.resolve(discussion())
    await Promise.resolve()
    expect(flow.thread.value?.resourceKey).toBe('post:2')
    expect(flow.body.value).toBe('second thread draft')
    expect(flow.notice.value).toBe('')
  })

  it('locks body, targets, cancel, preview, logout, and duplicate submit until settlement', async () => {
    const request = deferred<BlogComment>()
    api.createPostComment.mockReturnValue(request.promise)
    const { flow } = start()
    await ready(flow)
    flow.startReply(flow.thread.value!.comments[0]!)
    flow.body.value = 'submitted reply'
    const pending = flow.submit()
    flow.body.value = 'should be rejected'
    flow.startEdit(flow.thread.value!.comments[0]!)
    flow.resetComposer()
    flow.useAsRoot()
    await flow.togglePreview()
    await flow.signOut()
    await flow.submit()
    expect(flow.body.value).toBe('submitted reply')
    expect(flow.replyingTo.value?.id).toBe('1')
    expect(api.createPostComment).toHaveBeenCalledExactlyOnceWith(
      '1',
      'submitted reply',
      '1',
    )
    expect(api.previewComment).not.toHaveBeenCalled()
    expect(api.logoutCommenter).not.toHaveBeenCalled()
    request.resolve(comment('2', { bodyMarkdown: 'submitted reply' }))
    await pending
    expect(flow.composerLocked.value).toBe(false)
    expect(flow.body.value).toBe('')
    expect(
      flow.thread.value!.comments[0]!.replies.map((item) => item.id),
    ).toEqual(['2'])
  })

  it('unlocks a rejected write and retains the original target and body', async () => {
    api.createPostComment.mockRejectedValue(
      new BlogApiError('invalid', {
        status: 422,
        code: 'comment_body_too_long',
      }),
    )
    const { flow } = start()
    await ready(flow)
    flow.startReply(flow.thread.value!.comments[0]!)
    flow.body.value = 'keep me'
    await flow.submit()
    expect(flow.body.value).toBe('keep me')
    expect(flow.replyingTo.value?.id).toBe('1')
    expect(flow.composerLocked.value).toBe(false)
    expect(flow.errorMessage.value).toContain('3000')
    flow.body.value = 'editable again'
    expect(flow.body.value).toBe('editable again')
  })

  it('keeps likes usable while the composer is locked and preserves them on settlement', async () => {
    const request = deferred<BlogComment>()
    api.createPostComment.mockReturnValue(request.promise)
    api.toggleCommentLike.mockResolvedValue(false)
    const { flow } = start()
    await ready(flow)
    flow.startReply(flow.thread.value!.comments[0]!)
    flow.body.value = 'submitted reply'
    const pending = flow.submit()
    await flow.toggleLike(flow.thread.value!.comments[0]!)
    expect(api.toggleCommentLike).toHaveBeenCalledWith('1')
    expect(flow.thread.value!.comments[0]!.likeCount).toBe(1)
    expect(flow.composerLocked.value).toBe(true)
    request.resolve(comment('2'))
    await pending
    expect(flow.thread.value!.comments[0]!.likedByMe).toBe(false)
    expect(flow.thread.value!.comments[0]!.replies).toHaveLength(1)
  })

  it('allows deleting another comment during publication and refreshes past a stale read', async () => {
    const publication = deferred<BlogComment>()
    const reload = deferred<PublicCommentThread>()
    api.createPostComment.mockReturnValue(publication.promise)
    api.deleteComment.mockResolvedValue(undefined)
    api.getPostComments
      .mockResolvedValueOnce(discussion())
      .mockReturnValueOnce(reload.promise)
      .mockResolvedValueOnce(
        discussion({ comments: [comment('2')], commentCount: 1 }),
      )
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
    const { flow } = start()
    await ready(flow)
    flow.body.value = 'publishing a separate comment'
    const pending = flow.submit()
    const deletion = flow.removeOwnComment(flow.thread.value!.comments[0]!)
    await vi.waitFor(() => expect(api.deleteComment).toHaveBeenCalledWith('1'))
    expect(flow.composerLocked.value).toBe(true)
    expect(flow.isLoading.value).toBe(false)
    publication.resolve(comment('2'))
    await pending
    reload.resolve(discussion({ comments: [], commentCount: 0 }))
    await deletion
    await ready(flow)
    expect(flow.thread.value?.comments.map((item) => item.id)).toEqual(['2'])
    expect(flow.thread.value?.commentCount).toBe(1)
  })

  it('does not resurrect a deleted root when its earlier edit response arrives late', async () => {
    const edit = deferred<BlogComment>()
    api.editComment.mockReturnValue(edit.promise)
    api.deleteComment.mockResolvedValue(undefined)
    api.getPostComments
      .mockResolvedValueOnce(
        discussion({ comments: [comment('1', { replies: [comment('2')] })] }),
      )
      .mockResolvedValueOnce(
        discussion({
          comments: [
            comment('1', {
              state: 'deleted',
              canEdit: false,
              bodyMarkdown: null,
              bodyHtml: null,
              replies: [comment('2')],
            }),
          ],
        }),
      )
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
    const { flow } = start()
    await ready(flow)
    flow.startEdit(flow.thread.value!.comments[0]!)
    flow.body.value = 'edited before deletion'
    const pending = flow.submit()
    await flow.removeOwnComment(flow.thread.value!.comments[0]!)
    edit.resolve(comment('1', { bodyMarkdown: 'edited before deletion' }))
    await pending
    expect(flow.thread.value!.comments[0]!.state).toBe('deleted')
    expect(flow.thread.value!.comments[0]!.bodyMarkdown).toBeNull()
    expect(flow.thread.value!.comments[0]!.replies).toHaveLength(1)
  })

  it('applies an edit without replacing the loaded replies or likes', async () => {
    api.getPostComments.mockResolvedValue(
      discussion({ comments: [comment('1', { replies: [comment('2')] })] }),
    )
    api.editComment.mockResolvedValue(
      comment('1', {
        bodyMarkdown: 'edited',
        bodyHtml: '<p>edited</p>',
        likeCount: 0,
        likedByMe: false,
      }),
    )
    const { flow } = start()
    await ready(flow)
    flow.startEdit(flow.thread.value!.comments[0]!)
    flow.body.value = 'edited'
    await flow.submit()
    const root = flow.thread.value!.comments[0]!
    expect(root.bodyMarkdown).toBe('edited')
    expect(root.replies.map((item) => item.id)).toEqual(['2'])
    expect(root.likeCount).toBe(2)
    expect(root.likedByMe).toBe(true)
    expect(flow.thread.value?.commentCount).toBe(1)
  })

  it('keeps an off-page reply draft unresolved until its root loads', async () => {
    localStorage.setItem(
      'comment-draft:post:1',
      JSON.stringify({
        body: 'recovered reply',
        parentId: '20',
        editingId: null,
      }),
    )
    api.getPostComments.mockImplementation((_id, cursor) =>
      Promise.resolve(
        cursor
          ? discussion({ comments: [comment('20')], commentCount: 2 })
          : discussion({ hasMore: true, nextCursor: '1', commentCount: 2 }),
      ),
    )
    const { flow } = start()
    await ready(flow)
    expect(flow.draftTargetMessage.value).toContain('尚未加载')
    await flow.submit()
    expect(api.createPostComment).not.toHaveBeenCalled()
    expect(
      JSON.parse(localStorage.getItem('comment-draft:post:1')!).parentId,
    ).toBe('20')
    await flow.loadMore()
    expect(flow.replyingTo.value?.id).toBe('20')
    expect(flow.body.value).toBe('recovered reply')
    expect(flow.canSubmit.value).toBe(true)
  })

  it.each(['hidden', 'deleted', 'missing', 'not-owner'])(
    'preserves %s target draft until explicitly reassigned',
    async (state) => {
      localStorage.setItem(
        'comment-draft:post:1',
        JSON.stringify({
          body: 'retained words',
          parentId: null,
          editingId: '1',
        }),
      )
      api.getPostComments.mockResolvedValue(
        discussion({
          comments:
            state === 'missing'
              ? []
              : [
                  comment('1', {
                    state:
                      state === 'hidden' || state === 'deleted'
                        ? state
                        : 'visible',
                    canEdit: state !== 'not-owner',
                  }),
                ],
        }),
      )
      const { flow } = start()
      await ready(flow)
      expect(flow.draftTargetMessage.value).toContain('不可用')
      expect(flow.canSubmit.value).toBe(false)
      expect(flow.body.value).toBe('retained words')
      flow.useAsRoot()
      expect(flow.body.value).toBe('retained words')
      expect(flow.canSubmit.value).toBe(true)
    },
  )

  it('keeps a target pending when reading fails, then restores it on retry', async () => {
    localStorage.setItem(
      'comment-draft:post:1',
      JSON.stringify({ body: 'retry draft', parentId: '1' }),
    )
    api.getPostComments.mockRejectedValueOnce(new Error('offline'))
    const { flow } = start()
    await ready(flow)
    expect(flow.draftTargetMessage.value).toContain('尚未加载')
    expect(flow.canSubmit.value).toBe(false)
    await flow.load()
    expect(flow.replyingTo.value?.id).toBe('1')
    expect(flow.body.value).toBe('retry draft')
  })

  it('rejects stale preview success after a new body and preview', async () => {
    const old = deferred<string>()
    api.previewComment
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce('<p>new</p>')
    const { flow } = start()
    await ready(flow)
    flow.body.value = 'old'
    const pending = flow.togglePreview()
    flow.body.value = 'new'
    await flow.togglePreview()
    old.resolve('<p>old</p>')
    await pending
    expect(flow.previewHtml.value).toBe('<p>new</p>')
  })

  it('does not let an older page overwrite a newly saved comment or count', async () => {
    const page = deferred<PublicCommentThread>()
    api.getPostComments
      .mockResolvedValueOnce(discussion({ hasMore: true, nextCursor: '1' }))
      .mockReturnValueOnce(page.promise)
    api.createPostComment.mockResolvedValue(comment('20'))
    const { flow } = start()
    await ready(flow)
    const more = flow.loadMore()
    flow.body.value = 'new comment'
    await flow.submit()
    page.resolve(
      discussion({
        comments: [comment('20', { bodyMarkdown: 'old page' })],
        commentCount: 1,
      }),
    )
    await more
    expect(flow.thread.value?.commentCount).toBe(2)
    expect(
      flow.thread.value?.comments.find((item) => item.id === '20')
        ?.bodyMarkdown,
    ).toBe('original')
    expect(flow.thread.value?.hasMore).toBe(true)
  })

  it('cleans only the original submitted draft after navigating to another thread', async () => {
    const request = deferred<BlogComment>()
    api.createPostComment.mockReturnValue(request.promise)
    const { flow, resource } = start()
    await ready(flow)
    flow.body.value = 'first draft'
    const pending = flow.submit()
    resource.value = { resourceType: 'post', postId: '2' }
    await ready(flow)
    flow.body.value = 'second draft'
    request.resolve(comment('30'))
    await pending
    expect(flow.body.value).toBe('second draft')
    expect(flow.thread.value?.comments.map((item) => item.id)).toEqual(['1'])
    expect(flow.notice.value).toBe('')
    expect(localStorage.getItem('comment-draft:post:1')).toBeNull()
    expect(JSON.parse(localStorage.getItem('comment-draft:post:2')!).body).toBe(
      'second draft',
    )
  })

  it('resumes a pending submission on returning to the original thread', async () => {
    const request = deferred<BlogComment>()
    api.createPostComment.mockReturnValue(request.promise)
    const first = start()
    await ready(first.flow)
    first.flow.body.value = 'pending draft'
    const pending = first.flow.submit()
    first.wrapper.unmount()
    const second = start()
    await ready(second.flow)
    expect(second.flow.composerLocked.value).toBe(true)
    second.flow.body.value = 'not allowed'
    expect(second.flow.body.value).toBe('pending draft')
    request.resolve(comment('30'))
    await pending
    await ready(second.flow)
    expect(second.flow.composerLocked.value).toBe(false)
    expect(second.flow.body.value).toBe('')
    expect(second.flow.notice.value).toContain('已发布')
  })

  it('never deletes a newer original-thread draft when an unmounted request succeeds', async () => {
    const request = deferred<BlogComment>()
    api.createPostComment.mockReturnValue(request.promise)
    const { flow, wrapper } = start()
    await ready(flow)
    flow.body.value = 'submitted'
    const pending = flow.submit()
    wrapper.unmount()
    localStorage.setItem(
      'comment-draft:post:1',
      JSON.stringify({ body: 'newer text', parentId: null, editingId: null }),
    )
    request.resolve(comment('30'))
    await pending
    expect(JSON.parse(localStorage.getItem('comment-draft:post:1')!).body).toBe(
      'newer text',
    )
  })

  it('restores uncertain submission text without automatically republishing it', async () => {
    localStorage.setItem(
      'comment-draft:post:1',
      JSON.stringify({
        body: 'unknown publication',
        submissionToken: 'previous-page-token',
      }),
    )
    const { flow } = start()
    await ready(flow)
    expect(flow.submissionUnknown.value).toBe(true)
    await flow.submit()
    expect(api.createPostComment).not.toHaveBeenCalled()
    flow.acknowledgeSubmission()
    expect(flow.canSubmit.value).toBe(true)
  })

  it('retains a network-ambiguous submission and requires review before a manual retry', async () => {
    api.createPostComment.mockRejectedValue(new Error('connection dropped'))
    const { flow } = start()
    await ready(flow)
    flow.body.value = 'could already be published'
    await flow.submit()
    expect(flow.body.value).toBe('could already be published')
    expect(flow.submissionUnknown.value).toBe(true)
    expect(flow.composerLocked.value).toBe(false)
    expect(flow.canSubmit.value).toBe(false)
  })

  it('retains an uncertain outcome across further editing and remounting until acknowledged', async () => {
    api.createPostComment.mockRejectedValue(new Error('connection dropped'))
    const first = start()
    await ready(first.flow)
    first.flow.body.value = 'possibly published'
    await first.flow.submit()
    first.flow.body.value = 'edited after uncertainty'
    first.flow.startReply(first.flow.thread.value!.comments[0]!)
    first.flow.body.value = 'reassigned after uncertainty'
    first.wrapper.unmount()
    const second = start()
    await ready(second.flow)
    expect(second.flow.body.value).toBe('reassigned after uncertainty')
    expect(second.flow.submissionUnknown.value).toBe(true)
    expect(second.flow.canSubmit.value).toBe(false)
    second.flow.acknowledgeSubmission()
    expect(second.flow.canSubmit.value).toBe(true)
  })

  it('retains legacy damaged text and stays usable when storage is disabled', async () => {
    localStorage.setItem('comment-draft:post:1', 'legacy unfinished text')
    const first = start()
    await ready(first.flow)
    expect(first.flow.body.value).toBe('legacy unfinished text')
    first.wrapper.unmount()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const second = start()
    await ready(second.flow)
    second.flow.body.value = 'still usable'
    expect(second.flow.canSubmit.value).toBe(true)
  })
})
