from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

moment_tags = Table(
    "moment_tags",
    Base.metadata,
    Column("moment_id", ForeignKey("moments.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    Index("ix_moment_tags_tag_id", "tag_id"),
    mysql_engine="InnoDB",
    mysql_charset="utf8mb4",
    mysql_collate="utf8mb4_0900_ai_ci",
)


class MomentStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class Moment(Base):
    __tablename__ = "moments"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published')", name="status_values"),
        Index("ix_moments_public_listing", "status", "published_at"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    body: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    location: Mapped[str | None] = mapped_column(String(160))
    mood: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=MomentStatus.DRAFT, server_default=MomentStatus.DRAFT
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
        secondary=moment_tags,
        back_populates="moments",
        passive_deletes=True,
    )
    images: Mapped[list["MomentImage"]] = relationship(
        back_populates="moment",
        cascade="all, delete-orphan",
        order_by="MomentImage.position, MomentImage.id",
        passive_deletes=True,
    )


class MomentImage(Base):
    __tablename__ = "moment_images"
    __table_args__ = (
        CheckConstraint("width > 0", name="width_positive"),
        CheckConstraint("height > 0", name="height_positive"),
        CheckConstraint("position >= 0", name="position_non_negative"),
        UniqueConstraint("moment_id", "position", name="uq_moment_images_moment_position"),
        Index("ix_moment_images_moment_id", "moment_id"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    moment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("moments.id", ondelete="CASCADE"), nullable=False
    )
    src: Mapped[str] = mapped_column(String(2048), nullable=False)
    alt: Mapped[str] = mapped_column(String(200), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    moment: Mapped[Moment] = relationship(back_populates="images")


from app.models.taxonomy import Tag  # noqa: E402  # resolve relationship types
