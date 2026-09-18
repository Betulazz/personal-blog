from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session
from app.repositories.system import SystemRepository
from app.schemas.common import ApiResponse
from app.schemas.health import HealthStatus
from app.services.system import SystemService

router = APIRouter()


@router.get("/health/live", response_model=ApiResponse[HealthStatus])
async def live() -> ApiResponse[HealthStatus]:
    return ApiResponse(data=HealthStatus(status="ok"))


@router.get("/health/ready", response_model=ApiResponse[HealthStatus])
async def ready(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiResponse[HealthStatus]:
    service = SystemService(SystemRepository(session))
    await service.require_database()
    return ApiResponse(data=HealthStatus(status="ready"))
