from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.api.dependencies import get_media_service
from app.services.media import MediaAssetService

router = APIRouter()


@router.get("/uploads/{key:path}", response_class=Response)
async def deliver_media(
    key: str,
    service: Annotated[MediaAssetService, Depends(get_media_service)],
) -> Response:
    asset, content = await service.read(key)
    return Response(
        content=content,
        media_type=asset.content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": str(len(content)),
            "X-Content-Type-Options": "nosniff",
        },
    )
