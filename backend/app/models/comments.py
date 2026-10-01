from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Commenter(Base):
    __tablename__ = "commenters"
    __table_args__ = (
        UniqueConstraint("github_user_id", name="uq_commenters_github_user_id"),
        CheckConstraint("github_user_id > 0", name="github_user_id_positive"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    github_user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    login: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    profile_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    is_banned: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class CommenterSession(Base):
    __tablename__ = "commenter_sessions"
    __table_args__ = (UniqueConstraint("token_hash", name="uq_commenter_sessions_token_hash"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    commenter_id: Mapped[int] = mapped_column(
        ForeignKey("commenters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    commenter: Mapped[Commenter] = relationship()


class CommentThread(Base):
    __tablename__ = "comment_threads"
    __table_args__ = (
        UniqueConstraint("resource_key", name="uq_comment_threads_resource_key"),
        UniqueConstraint("post_id", name="uq_comment_threads_post_id"),
        CheckConstraint(
            "(resource_key = 'about' AND post_id IS NULL) OR "
            "(resource_key <> 'about' AND post_id IS NOT NULL)",
            name="resource_key_matches_post",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    resource_key: Mapped[str] = mapped_column(String(48), nullable=False)
    post_id: Mapped[int | None] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), nullable=True
    )
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint("state IN ('visible', 'hidden', 'deleted')", name="state_values"),
        CheckConstraint("body IS NULL OR CHAR_LENGTH(body) <= 3000", name="body_length"),
        Index("ix_comments_thread_parent_id", "thread_id", "parent_id", "id"),
        Index("ix_comments_parent_id", "parent_id"),
        Index("ix_comments_newest", "created_at", "id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("comment_threads.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    commenter_id: Mapped[int | None] = mapped_column(
        ForeignKey("commenters.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    administrator_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    author_name: Mapped[str] = mapped_column(String(100), nullable=False)
    author_avatar_url: Mapped[str | None] = mapped_column(String(2048))
    author_profile_url: Mapped[str | None] = mapped_column(String(2048))
    body: Mapped[str | None] = mapped_column(LONGTEXT)
    state: Mapped[str] = mapped_column(
        String(16), nullable=False, default="visible", server_default="visible", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    edited_at: Mapped[datetime | None] = mapped_column(DateTime)

    commenter: Mapped[Commenter | None] = relationship()
    administrator: Mapped["User | None"] = relationship()
    replies: Mapped[list["Comment"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan", passive_deletes=True
    )
    parent: Mapped["Comment | None"] = relationship(
        back_populates="replies", remote_side="Comment.id"
    )
    likes: Mapped[list["CommentLike"]] = relationship(
        back_populates="comment", cascade="all, delete-orphan", passive_deletes=True
    )


class CommentLike(Base):
    __tablename__ = "comment_likes"
    __table_args__ = (
        UniqueConstraint("comment_id", "commenter_id", name="uq_comment_likes_comment_commenter"),
        Index("ix_comment_likes_comment_id", "comment_id"),
        Index("ix_comment_likes_commenter_id", "commenter_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    comment_id: Mapped[int] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), nullable=False
    )
    commenter_id: Mapped[int] = mapped_column(
        ForeignKey("commenters.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    comment: Mapped[Comment] = relationship(back_populates="likes")


class CommentRateBucket(Base):
    __tablename__ = "comment_rate_buckets"
    __table_args__ = (
        CheckConstraint("hits > 0", name="hits_positive"),
        Index("ix_comment_rate_buckets_bucket_start", "bucket_start"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    subject_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    bucket_start: Mapped[datetime] = mapped_column(DateTime, primary_key=True)
    hits: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")


class CommentAdminState(Base):
    __tablename__ = "comment_admin_state"
    __table_args__ = (CheckConstraint("id = 1", name="singleton_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime)


from app.models.auth import User  # noqa: E402  # resolve Administrator type
