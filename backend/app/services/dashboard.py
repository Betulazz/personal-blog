from dataclasses import dataclass

from app.repositories.dashboard import (
    DashboardActivity,
    DashboardCounts,
    DashboardRepository,
)


@dataclass(frozen=True, slots=True)
class DashboardSnapshot:
    counts: DashboardCounts
    recent_activity: list[DashboardActivity]


class DashboardService:
    def __init__(self, repository: DashboardRepository) -> None:
        self._repository = repository

    async def summary(self) -> DashboardSnapshot:
        activities = await self._repository.recent_activity(limit=8)
        activities.sort(key=lambda activity: (activity.updated_at, activity.id), reverse=True)
        return DashboardSnapshot(
            counts=await self._repository.counts(),
            recent_activity=activities[:8],
        )
