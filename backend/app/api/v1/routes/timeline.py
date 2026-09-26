from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session
from app.api.v1.routes.chatters import _public_chatter
from app.api.v1.routes.posts import _normalize_query, _pagination, _post_summary, _public_counts
from app.models.post import Post
from app.repositories.timeline import TimelineRepository
from app.schemas.timeline import TimelineChatter, TimelineCollectionResponse, TimelinePost
from app.services.posts import PostService

router = APIRouter()


@router.get("/moments", response_model=TimelineCollectionResponse)
async def list_timeline(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=80),
) -> TimelineCollectionResponse:
    search = _normalize_query(q)
    entries, total = await TimelineRepository(session).list_public(
        search=search, offset=(page - 1) * page_size, limit=page_size
    )
    counts = await _public_counts(PostService(session), [e for e in entries if isinstance(e, Post)])
    return TimelineCollectionResponse(
        data=[
            TimelinePost(content=_post_summary(entry, counts))
            if isinstance(entry, Post)
            else TimelineChatter(content=_public_chatter(entry))
            for entry in entries
        ],
        pagination=_pagination(page, page_size, total),
        filters={"q": search} if search else {},
    )
