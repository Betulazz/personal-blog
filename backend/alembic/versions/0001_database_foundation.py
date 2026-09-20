"""Establish the initial explicit migration boundary.

Domain tables are introduced by the persistence slices that own them. Keeping
this revision intentionally empty still gives every environment a concrete
Alembic head and makes schema changes explicit from the first database.
"""

from collections.abc import Sequence

revision: str = "0001_database_foundation"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
