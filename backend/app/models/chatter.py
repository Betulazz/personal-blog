from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Table,
    func,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

chatter_tags = Table(
    "chatter_tags",
    Base.metadata,
    Column("chatter_id", ForeignKey("chatters.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    Index("ix_chatter_tags_tag_id", "tag_id"),
    mysql_engine="InnoDB",
    mysql_charset="utf8mb4",
    mysql_collate="utf8mb4_0900_ai_ci",
)


class ChatterStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class Chatter(Base):
    __tablename__ = "chatters"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published')", name="status_values"),
        Index("ix_chatters_public_listing", "status", "published_at"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str | None] = mapped_column(String(200))
    lead: Mapped[str | None] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    mood: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ChatterStatus.DRAFT, server_default=ChatterStatus.DRAFT
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    tags: Mapped[list["Tag"]] = relationship(
        secondary=chatter_tags,
        back_populates="chatters",
        passive_deletes=True,
    )


from app.models.taxonomy import Tag  # noqa: E402  # resolve relationship types
