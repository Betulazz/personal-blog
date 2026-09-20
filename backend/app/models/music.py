from datetime import datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MusicTrack(Base):
    __tablename__ = "music_tracks"
    __table_args__ = (
        CheckConstraint(
            "source_strategy IN ('remote_url', 'local_media', 's3_media')",
            name="source_strategy_values",
        ),
        CheckConstraint(
            "duration_seconds IS NULL OR duration_seconds > 0",
            name="duration_seconds_positive",
        ),
        CheckConstraint("display_order >= 0", name="display_order_non_negative"),
        Index("ix_music_tracks_public_listing", "is_enabled", "display_order", "id"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    artist: Mapped[str] = mapped_column(String(200), nullable=False)
    album: Mapped[str | None] = mapped_column(String(200))
    source_strategy: Mapped[str] = mapped_column(String(32), nullable=False)
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    artwork_url: Mapped[str | None] = mapped_column(String(2048))
    artwork_alt: Mapped[str | None] = mapped_column(String(200))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    display_order: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0, server_default="0"
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
