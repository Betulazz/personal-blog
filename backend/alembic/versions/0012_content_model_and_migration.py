"""Consolidate Moments into Chatter and retire Post Categories / Chatter Tags.

All removed v1 fields and relationships are copied to a private JSON archive
before the legacy schema is removed. Uploaded files are never touched.
"""

from collections.abc import Sequence
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

revision: str = "0012_content_model_and_migration"
down_revision: str | None = "0011_post_seo_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    op.create_table(
        "content_migration_archive",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("source_key", sa.String(length=120), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "archived_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_content_migration_archive"),
        sa.UniqueConstraint(
            "source_type", "source_key", name="uq_content_migration_archive_source"
        ),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    _create_chatter_images()

    archive = sa.Table("content_migration_archive", sa.MetaData(), autoload_with=bind)
    moments = _rows(bind, "moments")
    chatter_rows = _rows(bind, "chatters")
    categories = _rows(bind, "categories")
    tags = _rows(bind, "tags")

    moment_tags = _rows(bind, "moment_tags")
    chatter_tags = _rows(bind, "chatter_tags")
    moment_images = _rows(bind, "moment_images")

    for category in categories:
        _archive(archive, "category", category["id"], category)
    for post_id, category_id in bind.execute(
        sa.text("SELECT id, category_id FROM posts WHERE category_id IS NOT NULL")
    ):
        _archive(
            archive,
            "post_category",
            post_id,
            {"post_id": post_id, "category_id": category_id},
        )

    for tag in tags:
        _archive(archive, "tag", tag["id"], tag)
    for relation in moment_tags:
        _archive(
            archive,
            "moment_tag",
            f"{relation['moment_id']}:{relation['tag_id']}",
            relation,
        )
    for relation in chatter_tags:
        _archive(
            archive,
            "chatter_tag",
            f"{relation['chatter_id']}:{relation['tag_id']}",
            relation,
        )

    images_by_moment: dict[int, list[dict[str, Any]]] = {}
    for image in moment_images:
        images_by_moment.setdefault(image["moment_id"], []).append(image)
        _archive(archive, "moment_image", image["id"], image)
    tags_by_moment: dict[int, list[int]] = {}
    for relation in moment_tags:
        tags_by_moment.setdefault(relation["moment_id"], []).append(relation["tag_id"])
    tags_by_chatter: dict[int, list[int]] = {}
    for relation in chatter_tags:
        tags_by_chatter.setdefault(relation["chatter_id"], []).append(relation["tag_id"])

    for chatter in chatter_rows:
        original = {**chatter, "tag_ids": tags_by_chatter.get(chatter["id"], [])}
        _archive(archive, "chatter", chatter["id"], original)
        lead = chatter.get("lead")
        if lead and lead.strip():
            body = f"{lead.strip()}\n\n{chatter['body']}"
            bind.execute(
                sa.text("UPDATE chatters SET body = :body WHERE id = :id"),
                {"body": body, "id": chatter["id"]},
            )

    max_chatter_id = max((int(row["id"]) for row in chatter_rows), default=0)
    chatter_table = sa.Table("chatters", sa.MetaData(), autoload_with=bind)
    chatter_image_table = sa.Table("chatter_images", sa.MetaData(), autoload_with=bind)
    for offset, moment in enumerate(moments, start=1):
        new_id = max_chatter_id + offset
        original = {
            **moment,
            "images": sorted(
                images_by_moment.get(moment["id"], []),
                key=lambda image: (image["position"], image["id"]),
            ),
            "tag_ids": tags_by_moment.get(moment["id"], []),
            "migrated_chatter_id": new_id,
        }
        _archive(archive, "moment", moment["id"], original)

        body = moment["body"]
        if moment.get("location") and moment["location"].strip():
            body = f"{body.rstrip()}\n\n地点：{moment['location'].strip()}"
        bind.execute(
            chatter_table.insert().values(
                id=new_id,
                title=None,
                body=body,
                mood=moment.get("mood"),
                status=moment["status"],
                published_at=moment.get("published_at"),
                created_at=moment["created_at"],
                updated_at=moment["updated_at"],
            )
        )
        for image in original["images"]:
            bind.execute(
                chatter_image_table.insert().values(
                    chatter_id=new_id,
                    src=image["src"],
                    alt=image["alt"],
                    width=image["width"],
                    height=image["height"],
                    position=image["position"],
                )
            )

    op.drop_table("chatter_tags")
    op.drop_table("moment_tags")
    op.drop_table("moment_images")
    op.drop_table("moments")

    op.drop_column("chatters", "lead")
    op.drop_constraint("fk_posts_category_id_categories", "posts", type_="foreignkey")
    op.drop_index("ix_posts_category_public", table_name="posts")
    op.drop_index("ix_posts_category_id", table_name="posts")
    op.drop_column("posts", "category_id")
    op.drop_index("ix_categories_slug", table_name="categories")
    op.drop_index("ix_categories_name", table_name="categories")
    op.drop_table("categories")

    bind.execute(sa.text("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM post_tags)"))


def downgrade() -> None:
    bind = op.get_bind()
    archive = sa.Table("content_migration_archive", sa.MetaData(), autoload_with=bind)
    archived_moments = _archive_rows(bind, archive, "moment")
    migrated_ids = {int(row["migrated_chatter_id"]) for row in archived_moments}
    image_rows = _rows(bind, "chatter_images")
    unsupported_images = [row for row in image_rows if row["chatter_id"] not in migrated_ids]
    if unsupported_images:
        raise RuntimeError(
            "Cannot downgrade: Chatter images added after migration need a v1-compatible restore."
        )

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
    op.add_column("posts", sa.Column("category_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_posts_category_id_categories",
        "posts",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_posts_category_id", "posts", ["category_id"], unique=False)
    op.create_index("ix_posts_category_public", "posts", ["category_id", "status", "published_at"])

    op.add_column("chatters", sa.Column("lead", sa.String(length=500), nullable=True))
    _create_legacy_moment_tables()
    _create_legacy_tag_relations()

    tags_table = sa.Table("tags", sa.MetaData(), autoload_with=bind)
    for row in _archive_rows(bind, archive, "tag"):
        values = _model_values(row, tags_table)
        if bind.execute(sa.select(tags_table.c.id).where(tags_table.c.id == values["id"])).first():
            continue
        bind.execute(tags_table.insert().values(**values))

    categories_table = sa.Table("categories", sa.MetaData(), autoload_with=bind)
    for row in _archive_rows(bind, archive, "category"):
        bind.execute(categories_table.insert().values(**_model_values(row, categories_table)))

    for row in _archive_rows(bind, archive, "post_category"):
        bind.execute(
            sa.text("UPDATE posts SET category_id = :category_id WHERE id = :post_id"),
            row,
        )

    chatter_table = sa.Table("chatters", sa.MetaData(), autoload_with=bind)
    for row in _archive_rows(bind, archive, "chatter"):
        values = _model_values(row, chatter_table)
        values["lead"] = row.get("lead")
        tag_ids = row.get("tag_ids", [])
        chatter_id = values["id"]
        bind.execute(
            chatter_table.update().where(chatter_table.c.id == chatter_id).values(**values)
        )
        for tag_id in tag_ids:
            bind.execute(
                sa.text("INSERT IGNORE INTO chatter_tags (chatter_id, tag_id) VALUES (:c, :t)"),
                {"c": chatter_id, "t": tag_id},
            )

    if migrated_ids:
        bind.execute(
            sa.text("DELETE FROM chatters WHERE id IN :ids").bindparams(
                sa.bindparam("ids", expanding=True)
            ),
            {"ids": sorted(migrated_ids)},
        )

    moment_table = sa.Table("moments", sa.MetaData(), autoload_with=bind)
    for row in archived_moments:
        values = _model_values(row, moment_table)
        tag_ids = row.get("tag_ids", [])
        bind.execute(moment_table.insert().values(**values))
        for tag_id in tag_ids:
            bind.execute(
                sa.text("INSERT IGNORE INTO moment_tags (moment_id, tag_id) VALUES (:m, :t)"),
                {"m": values["id"], "t": tag_id},
            )

    images_table = sa.Table("moment_images", sa.MetaData(), autoload_with=bind)
    for row in _archive_rows(bind, archive, "moment_image"):
        bind.execute(images_table.insert().values(**_model_values(row, images_table)))

    op.drop_table("chatter_images")
    op.drop_table("content_migration_archive")


def _create_chatter_images() -> None:
    op.create_table(
        "chatter_images",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("chatter_id", sa.BigInteger(), nullable=False),
        sa.Column("src", sa.String(length=2048), nullable=False),
        sa.Column("alt", sa.String(length=200), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint("width > 0", name="ck_chatter_images_width_positive"),
        sa.CheckConstraint("height > 0", name="ck_chatter_images_height_positive"),
        sa.CheckConstraint("position >= 0", name="ck_chatter_images_position_non_negative"),
        sa.ForeignKeyConstraint(
            ["chatter_id"],
            ["chatters.id"],
            name="fk_chatter_images_chatter_id_chatters",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_chatter_images"),
        sa.UniqueConstraint("chatter_id", "position", name="uq_chatter_images_chatter_position"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_0900_ai_ci",
    )
    op.create_index("ix_chatter_images_chatter_id", "chatter_images", ["chatter_id"])


def _create_legacy_moment_tables() -> None:
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
    op.create_index("ix_moments_published_at", "moments", ["published_at"])
    op.create_index("ix_moments_public_listing", "moments", ["status", "published_at"])
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
    op.create_index("ix_moment_images_moment_id", "moment_images", ["moment_id"])


def _create_legacy_tag_relations() -> None:
    for name, parent_col, parent_table in (
        ("moment_tags", "moment_id", "moments"),
        ("chatter_tags", "chatter_id", "chatters"),
    ):
        op.create_table(
            name,
            sa.Column(parent_col, sa.BigInteger(), nullable=False),
            sa.Column("tag_id", sa.BigInteger(), nullable=False),
            sa.ForeignKeyConstraint(
                [parent_col],
                [f"{parent_table}.id"],
                name=f"fk_{name}_{parent_col}_{parent_table}",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["tag_id"], ["tags.id"], name=f"fk_{name}_tag_id_tags", ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint(parent_col, "tag_id", name=f"pk_{name}"),
            mysql_engine="InnoDB",
            mysql_charset="utf8mb4",
            mysql_collate="utf8mb4_0900_ai_ci",
        )
        op.create_index(f"ix_{name}_tag_id", name, ["tag_id"])


def _rows(bind: sa.Connection, table_name: str) -> list[dict[str, Any]]:
    table = sa.Table(table_name, sa.MetaData(), autoload_with=bind)
    result = bind.execute(sa.select(table).order_by(*table.primary_key))
    return [dict(row._mapping) for row in result]


def _archive(
    table: sa.Table, source_type: str, source_key: int | str, payload: dict[str, Any]
) -> None:
    bind = op.get_bind()
    bind.execute(
        table.insert().values(
            source_type=source_type,
            source_key=str(source_key),
            payload=_jsonable(payload),
        )
    )


def _archive_rows(bind: sa.Connection, table: sa.Table, source_type: str) -> list[dict[str, Any]]:
    return [
        row["payload"]
        for row in bind.execute(
            sa.select(table.c.payload)
            .where(table.c.source_type == source_type)
            .order_by(table.c.id)
        )
    ]


def _jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    return value


def _model_values(payload: dict[str, Any], table: sa.Table) -> dict[str, Any]:
    values = {key: value for key, value in payload.items() if key in table.c}
    for key, value in values.items():
        if key.endswith("_at") and isinstance(value, str):
            values[key] = datetime.fromisoformat(value)
    return values
