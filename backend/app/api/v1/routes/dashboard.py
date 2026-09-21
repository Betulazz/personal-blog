from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db_session
from app.models.auth import User
from app.repositories.dashboard import DashboardRepository
from app.schemas.common import ApiResponse
from app.schemas.dashboard import (
    AdminDashboardResponse,
    DashboardActivityResponse,
    DashboardCountsResponse,
)
from app.services.dashboard import DashboardService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/admin/dashboard", response_model=ApiResponse[AdminDashboardResponse])
async def get_admin_dashboard(
    _: CurrentAdmin,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[AdminDashboardResponse]:
    snapshot = await DashboardService(DashboardRepository(session)).summary()
    return ApiResponse(
        data=AdminDashboardResponse(
            counts=DashboardCountsResponse(
                posts=snapshot.counts.posts,
                published_posts=snapshot.counts.published_posts,
                draft_posts=snapshot.counts.draft_posts,
                moments=snapshot.counts.moments,
                chatter=snapshot.counts.chatter,
                projects=snapshot.counts.projects,
                friends=snapshot.counts.friends,
                total_reading_count=snapshot.counts.total_reading_count,
            ),
            recent_activity=[
                DashboardActivityResponse(
                    id=activity.id,
                    type=activity.type,
                    title=activity.title,
                    status=activity.status,
                    updated_at=activity.updated_at,
                )
                for activity in snapshot.recent_activity
            ],
        )
    )
