"""Add Posts, Categories, Tags, and the normalized Post-Tag relationship."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

revision: str = "0003_post_taxonomy"
down_revision: str | None = "0002_administrator_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_categories"),
        sa.UniqueConstraint("name", name="uq_categories_name"),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_categories_name", "categories", ["name"], unique=False)
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=False)

    op.create_table(
        "tags",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_tags"),
        sa.UniqueConstraint("name", name="uq_tags_name"),
        sa.UniqueConstraint("slug", name="uq_tags_slug"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_tags_name", "tags", ["name"], unique=False)
    op.create_index("ix_tags_slug", "tags", ["slug"], unique=False)

    op.create_table(
        "posts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("summary", sa.String(length=500), server_default="", nullable=False),
        sa.Column("body", mysql.LONGTEXT(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("is_pinned", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("reading_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "reading_time_minutes", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("cover_url", sa.String(length=2048), nullable=True),
        sa.Column("cover_alt", sa.String(length=200), nullable=True),
        sa.Column("category_id", sa.BigInteger(), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint("status IN ('draft', 'published')", name="ck_posts_status_values"),
        sa.CheckConstraint("reading_count >= 0", name="ck_posts_reading_count_non_negative"),
        sa.CheckConstraint("reading_time_minutes >= 0", name="ck_posts_reading_time_non_negative"),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_posts_category_id_categories",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_posts"),
        sa.UniqueConstraint("slug", name="uq_posts_slug"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_posts_slug", "posts", ["slug"], unique=False)
    op.create_index("ix_posts_category_id", "posts", ["category_id"], unique=False)
    op.create_index("ix_posts_published_at", "posts", ["published_at"], unique=False)
    op.create_index(
        "ix_posts_public_listing", "posts", ["status", "is_pinned", "published_at"], unique=False
    )
    op.create_index(
        "ix_posts_category_public", "posts", ["category_id", "status", "published_at"], unique=False
    )

    op.create_table(
        "post_tags",
        sa.Column("post_id", sa.BigInteger(), nullable=False),
        sa.Column("tag_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["post_id"], ["posts.id"], name="fk_post_tags_post_id_posts", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tags.id"], name="fk_post_tags_tag_id_tags", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("post_id", "tag_id", name="pk_post_tags"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_post_tags_tag_id", "post_tags", ["tag_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_post_tags_tag_id", table_name="post_tags")
    op.drop_table("post_tags")
    op.drop_index("ix_posts_category_public", table_name="posts")
    op.drop_index("ix_posts_public_listing", table_name="posts")
    op.drop_index("ix_posts_published_at", table_name="posts")
    op.drop_index("ix_posts_category_id", table_name="posts")
    op.drop_index("ix_posts_slug", table_name="posts")
    op.drop_table("posts")
    op.drop_index("ix_tags_slug", table_name="tags")
    op.drop_index("ix_tags_name", table_name="tags")
    op.drop_table("tags")
    op.drop_index("ix_categories_slug", table_name="categories")
    op.drop_index("ix_categories_name", table_name="categories")
    op.drop_table("categories")
