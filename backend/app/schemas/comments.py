from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class CommenterProfile(BaseModel):
    github_user_id: str
    login: str
    avatar_url: HttpUrl | None
    profile_url: HttpUrl
    is_banned: bool


class CommenterSessionResponse(BaseModel):
    commenter: CommenterProfile | None
    github_login_enabled: bool


class CommentAuthor(BaseModel):
    kind: Literal["commenter", "administrator"]
    name: str
    avatar_url: HttpUrl | None
    profile_url: HttpUrl | None


class CommentItem(BaseModel):
    id: int
    author: CommentAuthor
    body_markdown: str | None
    body_html: str | None
    state: Literal["visible", "hidden", "deleted"]
    created_at: datetime
    edited_at: datetime | None
    like_count: int = Field(ge=0)
    liked_by_me: bool
    can_edit: bool
    replies: list["CommentItem"] = Field(default_factory=list)


class PublicCommentThread(BaseModel):
    resource_key: str
    is_open: bool
    comment_count: int = Field(ge=0)
    comments: list[CommentItem]
    next_cursor: int | None
    has_more: bool


class CommentWriteRequest(BaseModel):
    body: str = Field(min_length=1, max_length=3000)
    parent_id: int | None = Field(default=None, gt=0)


class CommentEditRequest(BaseModel):
    body: str = Field(min_length=1, max_length=3000)


class CommentPreviewRequest(BaseModel):
    body: str = Field(max_length=3000)


class CommentPreviewResponse(BaseModel):
    html: str


class CommentThreadStateRequest(BaseModel):
    is_open: bool


class CommentVisibilityRequest(BaseModel):
    state: Literal["visible", "hidden"]


class CommenterBanRequest(BaseModel):
    is_banned: bool


class AdminCommentItem(BaseModel):
    id: int
    resource_key: str
    resource_label: str
    resource_path: str
    thread_is_open: bool
    parent_id: int | None
    author_name: str
    author_avatar_url: HttpUrl | None
    author_profile_url: HttpUrl | None
    github_user_id: str | None
    commenter_is_banned: bool | None
    is_administrator: bool
    body_markdown: str | None
    body_html: str | None
    state: Literal["visible", "hidden", "deleted"]
    created_at: datetime
    edited_at: datetime | None
    reply_count: int = Field(ge=0)


class AdminCommenterItem(BaseModel):
    github_user_id: str
    login: str
    profile_url: HttpUrl
    is_banned: bool


class CommentThreadSummary(BaseModel):
    resource_key: str
    is_open: bool


class AdminCommentThreadItem(BaseModel):
    resource_key: str
    resource_label: str
    resource_path: str
    is_open: bool
    comment_count: int = Field(ge=0)
