from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatter import Chatter
from app.models.portfolio import FriendLink, Project
from app.models.post import Post


@dataclass(frozen=True, slots=True)
class DashboardCounts:
    posts: int
    published_posts: int
    draft_posts: int
    chatter: int
    projects: int
    friends: int
    total_reading_count: int


@dataclass(frozen=True, slots=True)
class DashboardActivity:
    id: int
    type: str
    title: str
    status: str | None
    updated_at: datetime


class DashboardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def counts(self) -> DashboardCounts:
        post_statuses = await self._session.execute(
            select(Post.status, func.count(Post.id)).group_by(Post.status)
        )
        status_counts = {str(status): int(count) for status, count in post_statuses}
        total_reading_count = int(
            await self._session.scalar(select(func.coalesce(func.sum(Post.reading_count), 0))) or 0
        )
        return DashboardCounts(
            posts=sum(status_counts.values()),
            published_posts=status_counts.get("published", 0),
            draft_posts=status_counts.get("draft", 0),
            chatter=await self._count(Chatter),
            projects=await self._count(Project),
            friends=await self._count(FriendLink),
            total_reading_count=total_reading_count,
        )

    async def recent_activity(self, limit: int) -> list[DashboardActivity]:
        activities: list[DashboardActivity] = []
        activities.extend(
            DashboardActivity(
                id=int(row.id),
                type="post",
                title=row.title,
                status=row.status,
                updated_at=row.updated_at,
            )
            for row in (
                await self._session.execute(
                    select(Post.id, Post.title, Post.status, Post.updated_at)
                    .order_by(Post.updated_at.desc(), Post.id.desc())
                    .limit(limit)
                )
            ).all()
        )
        activities.extend(
            DashboardActivity(
                id=int(row.id),
                type="chatter",
                title=_content_title(row.title or row.body),
                status=row.status,
                updated_at=row.updated_at,
            )
            for row in (
                await self._session.execute(
                    select(
                        Chatter.id,
                        Chatter.title,
                        Chatter.body,
                        Chatter.status,
                        Chatter.updated_at,
                    )
                    .order_by(Chatter.updated_at.desc(), Chatter.id.desc())
                    .limit(limit)
                )
            ).all()
        )
        activities.extend(
            DashboardActivity(
                id=int(row.id),
                type="project",
                title=row.name,
                status=row.status,
                updated_at=row.updated_at,
            )
            for row in (
                await self._session.execute(
                    select(Project.id, Project.name, Project.status, Project.updated_at)
                    .order_by(Project.updated_at.desc(), Project.id.desc())
                    .limit(limit)
                )
            ).all()
        )
        activities.extend(
            DashboardActivity(
                id=int(row.id),
                type="friend",
                title=row.name,
                status="active" if row.is_active else "inactive",
                updated_at=row.updated_at,
            )
            for row in (
                await self._session.execute(
                    select(
                        FriendLink.id,
                        FriendLink.name,
                        FriendLink.is_active,
                        FriendLink.updated_at,
                    )
                    .order_by(FriendLink.updated_at.desc(), FriendLink.id.desc())
                    .limit(limit)
                )
            ).all()
        )
        return activities

    async def _count(self, model: type[Chatter] | type[Project] | type[FriendLink]) -> int:
        return int(await self._session.scalar(select(func.count(model.id))) or 0)


def _content_title(value: str) -> str:
    title = " ".join(value.split())
    return title[:120] + ("…" if len(title) > 120 else "")
