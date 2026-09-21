"""Add per-Post SEO metadata."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011_post_seo_fields"
down_revision: str | None = "0010_site_settings_about"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("seo_title", sa.String(length=200), nullable=True))
    op.add_column("posts", sa.Column("seo_description", sa.String(length=500), nullable=True))
    op.add_column("posts", sa.Column("canonical_url", sa.String(length=2048), nullable=True))
    op.add_column("posts", sa.Column("og_image_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("posts", "og_image_url")
    op.drop_column("posts", "canonical_url")
    op.drop_column("posts", "seo_description")
    op.drop_column("posts", "seo_title")
