from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProjectStatus(StrEnum):
    DEVELOPING = "developing"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ProjectType(StrEnum):
    PERSONAL = "personal"
    GITHUB_OPEN_SOURCE = "github_open_source"


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "status IS NULL OR status IN ('developing', 'active', 'archived')",
            name="status_values",
        ),
        CheckConstraint(
            "project_type IN ('personal', 'github_open_source')", name="project_type_values"
        ),
        CheckConstraint(
            "(project_type = 'personal' AND technology IS NOT NULL AND time_span IS NOT NULL "
            "AND status IS NOT NULL AND repository_url IS NULL) OR "
            "(project_type = 'github_open_source' AND technology IS NULL AND time_span IS NULL "
            "AND status IS NULL AND source_url IS NULL AND demo_url IS NULL "
            "AND repository_url IS NOT NULL)",
            name="variant_fields",
        ),
        CheckConstraint("display_order >= 0", name="display_order_non_negative"),
        Index("ix_projects_public_listing", "featured", "display_order", "id"),
        Index("ix_projects_project_type", "project_type"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(2048))
    logo_alt: Mapped[str | None] = mapped_column(String(200))
    project_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ProjectType.PERSONAL,
        server_default=ProjectType.PERSONAL,
    )
    technology: Mapped[list[str] | None] = mapped_column(JSON(none_as_null=True))
    time_span: Mapped[str | None] = mapped_column(String(120))
    source_url: Mapped[str | None] = mapped_column(String(2048))
    demo_url: Mapped[str | None] = mapped_column(String(2048))
    repository_url: Mapped[str | None] = mapped_column(String(2048))
    status: Mapped[str | None] = mapped_column(String(20))
    featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    display_order: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0, server_default="0"
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


class FriendLink(Base):
    __tablename__ = "friend_links"
    __table_args__ = (
        CheckConstraint("display_order >= 0", name="display_order_non_negative"),
        Index("ix_friend_links_public_listing", "is_active", "display_order", "id"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    avatar_alt: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    display_order: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0, server_default="0"
    )
    is_active: Mapped[bool] = mapped_column(
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


class SiteSettings(Base):
    __tablename__ = "site_settings"
    __table_args__ = (
        CheckConstraint("id = 1", name="singleton_id"),
        {
            "mysql_engine": "InnoDB",
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_0900_ai_ci",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    tagline: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    profile: Mapped[str] = mapped_column(Text, nullable=False)
    about: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    avatar_alt: Mapped[str | None] = mapped_column(String(200))
    favicon_url: Mapped[str | None] = mapped_column(String(2048))
    social_links: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    footer: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    contact: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    homepage_visibility: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    background_gallery: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
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
