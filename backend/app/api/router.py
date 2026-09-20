from fastapi import APIRouter

from app.api.media import router as media_delivery_router
from app.api.v1.router import router as v1_router

api_router = APIRouter()
api_router.include_router(v1_router, prefix="/api/v1")
api_router.include_router(media_delivery_router)
