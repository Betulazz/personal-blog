from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


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

    images: Mapped[list["ChatterImage"]] = relationship(
        back_populates="chatter",
        cascade="all, delete-orphan",
        order_by="ChatterImage.position, ChatterImage.id",
        passive_deletes=True,
    )


class ChatterImage(Base):
    __tablename__ = "chatter_images"
    __table_args__ = (
        CheckConstraint("width > 0", name="width_positive"),
        CheckConstraint("height > 0", name="height_positive"),
        CheckConstraint("position >= 0", name="position_non_negative"),
        UniqueConstraint("chatter_id", "position", name="uq_chatter_images_chatter_position"),
        Index("ix_chatter_images_chatter_id", "chatter_id"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    chatter_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("chatters.id", ondelete="CASCADE"), nullable=False
    )
    src: Mapped[str] = mapped_column(String(2048), nullable=False)
    alt: Mapped[str] = mapped_column(String(200), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    chatter: Mapped[Chatter] = relationship(back_populates="images")
