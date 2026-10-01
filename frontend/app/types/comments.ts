export interface CommenterProfile {
  avatarUrl: string | null
  githubUserId: string
  isBanned: boolean
  login: string
  profileUrl: string
}

export interface CommenterSession {
  commenter: CommenterProfile | null
  githubLoginEnabled: boolean
}

export interface CommentAuthor {
  avatarUrl: string | null
  kind: 'commenter' | 'administrator'
  name: string
  profileUrl: string | null
}

export interface BlogComment {
  author: CommentAuthor
  bodyHtml: string | null
  bodyMarkdown: string | null
  canEdit: boolean
  createdAt: string
  editedAt: string | null
  id: string
  likeCount: number
  likedByMe: boolean
  replies: BlogComment[]
  state: 'visible' | 'hidden' | 'deleted'
}

export interface PublicCommentThread {
  commentCount: number
  comments: BlogComment[]
  hasMore: boolean
  isOpen: boolean
  nextCursor: string | null
  resourceKey: string
}

export interface AdminComment {
  authorAvatarUrl: string | null
  authorName: string
  authorProfileUrl: string | null
  bodyHtml: string | null
  bodyMarkdown: string | null
  createdAt: string
  commenterIsBanned: boolean | null
  editedAt: string | null
  githubUserId: string | null
  id: string
  isAdministrator: boolean
  parentId: string | null
  parent: {
    id: string
    authorName: string
    bodyExcerpt: string | null
    state: 'visible' | 'hidden' | 'deleted'
  } | null
  replyCount: number
  resourceKey: string
  resourceLabel: string
  resourcePath: string
  state: 'visible' | 'hidden' | 'deleted'
  threadIsOpen: boolean
}

export interface AdminCommentDiscussion {
  root: AdminComment
  replies: AdminComment[]
}

export interface AdminCommentCollection {
  data: AdminComment[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminCommentThread {
  commentCount: number
  isOpen: boolean
  resourceKey: string
  resourceLabel: string
  resourcePath: string
}
