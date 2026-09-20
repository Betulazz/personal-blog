from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.chatters import router as chatters_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.media import router as media_router
from app.api.v1.routes.moments import router as moments_router
from app.api.v1.routes.music import router as music_router
from app.api.v1.routes.portfolio import router as portfolio_router
from app.api.v1.routes.posts import router as posts_router
from app.api.v1.routes.taxonomy import router as taxonomy_router

router = APIRouter()
router.include_router(health_router, tags=["health"])
router.include_router(auth_router, tags=["authentication"])
router.include_router(moments_router, tags=["moments"])
router.include_router(media_router, tags=["media"])
router.include_router(music_router, tags=["music"])
router.include_router(chatters_router, tags=["chatter"])
router.include_router(posts_router, tags=["posts"])
router.include_router(portfolio_router, tags=["portfolio"])
router.include_router(taxonomy_router, tags=["taxonomy"])
