"""Remove empty placeholders left by deleting a root before its replies."""

from alembic import op

revision = "0019_prune_deleted_roots"
down_revision = "0018_comment_read_receipts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # MySQL multi-table DELETE avoids a same-target subquery. Keep roots with
    # any surviving reply, including hidden replies, and all live comments.
    op.execute(
        "DELETE root FROM comments AS root "
        "LEFT JOIN comments AS reply ON reply.parent_id = root.id "
        "WHERE root.parent_id IS NULL AND root.state = 'deleted' "
        "AND root.body IS NULL AND reply.id IS NULL"
    )


def downgrade() -> None:
    # These comments were already deleted by their authors. Never resurrect
    # erased placeholders or invent their former contents during downgrade.
    pass
