from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.api.dependencies import get_current_user, get_media_service, require_csrf
from app.models.auth import User
from app.models.media import MediaAsset
from app.schemas.common import ApiResponse, PaginationMeta
from app.schemas.media import MediaAssetCollectionResponse, MediaAssetResponse
from app.services.media import MediaAssetService

router = APIRouter()
CurrentAdmin = Annotated[User, Depends(get_current_user)]


@router.get("/admin/media", response_model=MediaAssetCollectionResponse)
async def list_admin_media(
    _: CurrentAdmin,
    service: Annotated[MediaAssetService, Depends(get_media_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> MediaAssetCollectionResponse:
    assets, total = await service.list_all(page=page, page_size=page_size)
    return MediaAssetCollectionResponse(
        data=[_response(asset, service) for asset in assets],
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size if total else 0,
        ),
    )


@router.get("/admin/media/{asset_id}", response_model=ApiResponse[MediaAssetResponse])
async def get_admin_media(
    asset_id: int,
    _: CurrentAdmin,
    service: Annotated[MediaAssetService, Depends(get_media_service)],
) -> ApiResponse[MediaAssetResponse]:
    asset = await service.detail(asset_id)
    return ApiResponse(data=_response(asset, service))


@router.post(
    "/admin/media",
    response_model=ApiResponse[MediaAssetResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def upload_admin_media(
    _: CurrentAdmin,
    service: Annotated[MediaAssetService, Depends(get_media_service)],
    file: Annotated[UploadFile, File(...)],
) -> ApiResponse[MediaAssetResponse]:
    asset = await service.upload(file)
    return ApiResponse(data=_response(asset, service))


@router.delete(
    "/admin/media/orphans/{key:path}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def cleanup_admin_media_orphan(
    key: str,
    _: CurrentAdmin,
    service: Annotated[MediaAssetService, Depends(get_media_service)],
) -> ApiResponse[dict[str, bool]]:
    return ApiResponse(data=await service.cleanup_orphan(key))


@router.delete(
    "/admin/media/{asset_id}",
    response_model=ApiResponse[dict[str, bool]],
    dependencies=[Depends(require_csrf)],
)
async def delete_admin_media(
    asset_id: int,
    _: CurrentAdmin,
    service: Annotated[MediaAssetService, Depends(get_media_service)],
    purge_metadata: bool = Query(default=False),
) -> ApiResponse[dict[str, bool]]:
    return ApiResponse(data=await service.delete(asset_id, purge_metadata=purge_metadata))


def _response(asset: MediaAsset, service: MediaAssetService) -> MediaAssetResponse:
    return MediaAssetResponse(
        id=asset.id,
        original_filename=asset.original_filename,
        media_kind=asset.media_kind,
        content_type=asset.content_type,
        size_bytes=asset.size_bytes,
        width=asset.width,
        height=asset.height,
        storage_strategy=asset.storage_strategy,
        key=asset.key,
        url=service.public_url(asset.key),
        created_at=asset.created_at,
    )
