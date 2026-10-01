"""Add GitHub commenters and locally owned comment threads."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

revision: str = "0017_github_comments"
down_revision: str | None = "0016_background_gallery"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "commenters",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("github_user_id", sa.BigInteger(), nullable=False),
        sa.Column("login", sa.String(100), nullable=False),
        sa.Column("avatar_url", sa.String(2048)),
        sa.Column("profile_url", sa.String(2048), nullable=False),
        sa.Column("is_banned", sa.Boolean(), server_default="0", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint("github_user_id > 0", name="ck_commenters_github_user_id_positive"),
        sa.PrimaryKeyConstraint("id", name="pk_commenters"),
        sa.UniqueConstraint("github_user_id", name="uq_commenters_github_user_id"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_commenters_login", "commenters", ["login"])
    op.create_index("ix_commenters_is_banned", "commenters", ["is_banned"])

    op.create_table(
        "commenter_sessions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("commenter_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime()),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["commenter_id"],
            ["commenters.id"],
            name="fk_commenter_sessions_commenter_id_commenters",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_commenter_sessions"),
        sa.UniqueConstraint("token_hash", name="uq_commenter_sessions_token_hash"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_commenter_sessions_commenter_id", "commenter_sessions", ["commenter_id"])
    op.create_index("ix_commenter_sessions_expires_at", "commenter_sessions", ["expires_at"])

    op.create_table(
        "comment_threads",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("resource_key", sa.String(48), nullable=False),
        sa.Column("post_id", sa.BigInteger()),
        sa.Column("is_open", sa.Boolean(), server_default="1", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "(resource_key = 'about' AND post_id IS NULL) OR "
            "(resource_key <> 'about' AND post_id IS NOT NULL)",
            name="ck_comment_threads_resource_key_matches_post",
        ),
        sa.ForeignKeyConstraint(
            ["post_id"], ["posts.id"], name="fk_comment_threads_post_id_posts", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_comment_threads"),
        sa.UniqueConstraint("post_id", name="uq_comment_threads_post_id"),
        sa.UniqueConstraint("resource_key", name="uq_comment_threads_resource_key"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )

    op.create_table(
        "comments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("thread_id", sa.BigInteger(), nullable=False),
        sa.Column("parent_id", sa.BigInteger()),
        sa.Column("commenter_id", sa.BigInteger()),
        sa.Column("administrator_id", sa.BigInteger()),
        sa.Column("author_name", sa.String(100), nullable=False),
        sa.Column("author_avatar_url", sa.String(2048)),
        sa.Column("author_profile_url", sa.String(2048)),
        sa.Column("body", mysql.LONGTEXT()),
        sa.Column("state", sa.String(16), server_default="visible", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column("edited_at", sa.DateTime()),
        sa.CheckConstraint(
            "state IN ('visible', 'hidden', 'deleted')", name="ck_comments_state_values"
        ),
        sa.CheckConstraint(
            "body IS NULL OR CHAR_LENGTH(body) <= 3000", name="ck_comments_body_length"
        ),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["comment_threads.id"],
            name="fk_comments_thread_id_comment_threads",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["comments.id"],
            name="fk_comments_parent_id_comments",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["commenter_id"],
            ["commenters.id"],
            name="fk_comments_commenter_id_commenters",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["administrator_id"],
            ["users.id"],
            name="fk_comments_administrator_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_comments"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_comments_thread_parent_id", "comments", ["thread_id", "parent_id", "id"])
    op.create_index("ix_comments_parent_id", "comments", ["parent_id"])
    op.create_index("ix_comments_newest", "comments", ["created_at", "id"])
    op.create_index("ix_comments_commenter_id", "comments", ["commenter_id"])
    op.create_index("ix_comments_administrator_id", "comments", ["administrator_id"])
    op.create_index("ix_comments_state", "comments", ["state"])
    op.create_index("ix_comments_created_at", "comments", ["created_at"])

    op.create_table(
        "comment_likes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("comment_id", sa.BigInteger(), nullable=False),
        sa.Column("commenter_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["comment_id"],
            ["comments.id"],
            name="fk_comment_likes_comment_id_comments",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["commenter_id"],
            ["commenters.id"],
            name="fk_comment_likes_commenter_id_commenters",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_comment_likes"),
        sa.UniqueConstraint(
            "comment_id", "commenter_id", name="uq_comment_likes_comment_commenter"
        ),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_comment_likes_comment_id", "comment_likes", ["comment_id"])
    op.create_index("ix_comment_likes_commenter_id", "comment_likes", ["commenter_id"])

    op.create_table(
        "comment_rate_buckets",
        sa.Column("subject_key", sa.String(64), nullable=False),
        sa.Column("bucket_start", sa.DateTime(), nullable=False),
        sa.Column("hits", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint("hits > 0", name="ck_comment_rate_buckets_hits_positive"),
        sa.PrimaryKeyConstraint("subject_key", "bucket_start", name="pk_comment_rate_buckets"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index(
        "ix_comment_rate_buckets_bucket_start",
        "comment_rate_buckets",
        ["bucket_start"],
    )

    op.create_table(
        "comment_admin_state",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("last_seen_at", sa.DateTime()),
        sa.CheckConstraint("id = 1", name="ck_comment_admin_state_singleton_id"),
        sa.PrimaryKeyConstraint("id", name="pk_comment_admin_state"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.execute("INSERT INTO comment_admin_state (id, last_seen_at) VALUES (1, NULL)")
    op.execute(
        "INSERT INTO comment_threads (resource_key, post_id, is_open) "
        "SELECT CONCAT('post:', id), id, 1 FROM posts WHERE status = 'published'"
    )
    op.execute(
        "INSERT INTO comment_threads (resource_key, post_id, is_open) VALUES ('about', NULL, 1)"
    )


def downgrade() -> None:
    op.drop_table("comment_admin_state")
    op.drop_table("comment_rate_buckets")
    op.drop_table("comment_likes")
    op.drop_table("comments")
    op.drop_table("comment_threads")
    op.drop_table("commenter_sessions")
    op.drop_table("commenters")
