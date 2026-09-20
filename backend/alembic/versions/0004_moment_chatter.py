"""Add independent Moment and Chatter lifecycles."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

revision: str = "0004_moment_chatter"
down_revision: str | None = "0003_post_taxonomy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "moments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("body", mysql.LONGTEXT(), nullable=False),
        sa.Column("location", sa.String(length=160), nullable=True),
        sa.Column("mood", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint("status IN ('draft', 'published')", name="ck_moments_status_values"),
        sa.PrimaryKeyConstraint("id", name="pk_moments"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_moments_published_at", "moments", ["published_at"], unique=False)
    op.create_index(
        "ix_moments_public_listing", "moments", ["status", "published_at"], unique=False
    )

    op.create_table(
        "moment_images",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("moment_id", sa.BigInteger(), nullable=False),
        sa.Column("src", sa.String(length=2048), nullable=False),
        sa.Column("alt", sa.String(length=200), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint("width > 0", name="ck_moment_images_width_positive"),
        sa.CheckConstraint("height > 0", name="ck_moment_images_height_positive"),
        sa.CheckConstraint("position >= 0", name="ck_moment_images_position_non_negative"),
        sa.ForeignKeyConstraint(
            ["moment_id"],
            ["moments.id"],
            name="fk_moment_images_moment_id_moments",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_moment_images"),
        sa.UniqueConstraint("moment_id", "position", name="uq_moment_images_moment_position"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_moment_images_moment_id", "moment_images", ["moment_id"], unique=False)

    op.create_table(
        "moment_tags",
        sa.Column("moment_id", sa.BigInteger(), nullable=False),
        sa.Column("tag_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["moment_id"],
            ["moments.id"],
            name="fk_moment_tags_moment_id_moments",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tags.id"], name="fk_moment_tags_tag_id_tags", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("moment_id", "tag_id", name="pk_moment_tags"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_moment_tags_tag_id", "moment_tags", ["tag_id"], unique=False)

    op.create_table(
        "chatters",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("lead", sa.String(length=500), nullable=True),
        sa.Column("body", mysql.LONGTEXT(), nullable=False),
        sa.Column("mood", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint("status IN ('draft', 'published')", name="ck_chatters_status_values"),
        sa.PrimaryKeyConstraint("id", name="pk_chatters"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_chatters_published_at", "chatters", ["published_at"], unique=False)
    op.create_index(
        "ix_chatters_public_listing", "chatters", ["status", "published_at"], unique=False
    )

    op.create_table(
        "chatter_tags",
        sa.Column("chatter_id", sa.BigInteger(), nullable=False),
        sa.Column("tag_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["chatter_id"],
            ["chatters.id"],
            name="fk_chatter_tags_chatter_id_chatters",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tags.id"], name="fk_chatter_tags_tag_id_tags", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("chatter_id", "tag_id", name="pk_chatter_tags"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_chatter_tags_tag_id", "chatter_tags", ["tag_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_chatter_tags_tag_id", table_name="chatter_tags")
    op.drop_table("chatter_tags")
    op.drop_index("ix_chatters_public_listing", table_name="chatters")
    op.drop_index("ix_chatters_published_at", table_name="chatters")
    op.drop_table("chatters")
    op.drop_index("ix_moment_tags_tag_id", table_name="moment_tags")
    op.drop_table("moment_tags")
    op.drop_index("ix_moment_images_moment_id", table_name="moment_images")
    op.drop_table("moment_images")
    op.drop_index("ix_moments_public_listing", table_name="moments")
    op.drop_index("ix_moments_published_at", table_name="moments")
    op.drop_table("moments")
