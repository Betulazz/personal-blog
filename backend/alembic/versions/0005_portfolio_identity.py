"""Add Projects, Friend Links, and Site Identity settings."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy.sql.elements import conv

from alembic import op

revision: str = "0005_portfolio_identity"
down_revision: str | None = "0004_moment_chatter"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("logo_url", sa.String(length=2048), nullable=True),
        sa.Column("logo_alt", sa.String(length=200), nullable=True),
        sa.Column("stack", mysql.JSON(), nullable=False),
        sa.Column("time_span", sa.String(length=120), nullable=False),
        sa.Column("source_url", sa.String(length=2048), nullable=True),
        sa.Column("demo_url", sa.String(length=2048), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("featured", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("display_order", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('developing', 'active', 'archived')",
            name=conv("ck_projects_status_values"),
        ),
        sa.CheckConstraint(
            "display_order >= 0", name=conv("ck_projects_display_order_non_negative")
        ),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index(
        "ix_projects_public_listing", "projects", ["featured", "display_order", "id"], unique=False
    )

    op.create_table(
        "friend_links",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
        sa.Column("avatar_alt", sa.String(length=200), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("display_order", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "display_order >= 0", name=conv("ck_friend_links_display_order_non_negative")
        ),
        sa.PrimaryKeyConstraint("id", name="pk_friend_links"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index(
        "ix_friend_links_public_listing",
        "friend_links",
        ["is_active", "display_order", "id"],
        unique=False,
    )

    op.create_table(
        "site_settings",
        sa.Column("id", sa.BigInteger(), autoincrement=False, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("tagline", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("profile", sa.Text(), nullable=False),
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
        sa.Column("avatar_alt", sa.String(length=200), nullable=True),
        sa.Column("favicon_url", sa.String(length=2048), nullable=True),
        sa.Column("social_links", mysql.JSON(), nullable=False),
        sa.Column("seo_defaults", mysql.JSON(), nullable=False),
        sa.Column("footer", mysql.JSON(), nullable=False),
        sa.Column("contact", mysql.JSON(), nullable=False),
        sa.Column("homepage_visibility", mysql.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_site_settings"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )


def downgrade() -> None:
    op.drop_table("site_settings")
    op.drop_index("ix_friend_links_public_listing", table_name="friend_links")
    op.drop_table("friend_links")
    op.drop_index("ix_projects_public_listing", table_name="projects")
    op.drop_table("projects")
