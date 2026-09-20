"""Rename Project stack storage to the domain term technology."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_project_technology_name"
down_revision: str | None = "0005_portfolio_identity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "projects",
        "stack",
        existing_type=sa.JSON(),
        new_column_name="technology",
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "projects",
        "technology",
        existing_type=sa.JSON(),
        new_column_name="stack",
        existing_nullable=False,
    )
