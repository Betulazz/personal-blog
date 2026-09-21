"""Idempotent public content used by native live acceptance runs."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chatter import Chatter, ChatterStatus
from app.models.moment import Moment, MomentImage, MomentStatus
from app.models.music import MusicTrack
from app.models.portfolio import FriendLink, Project, ProjectStatus, SiteSettings
from app.models.post import Post, PostStatus
from app.models.taxonomy import Category, Tag

SEED_POST_SLUGS = (
    "live-acceptance-begins-with-content",
    "live-acceptance-markdown",
    "live-acceptance-small-contracts",
)


@dataclass(frozen=True, slots=True)
class PublicSeedSummary:
    """Counts returned by the seed command for operator feedback."""

    posts: int
    moments: int
    chatters: int
    projects: int
    friends: int
    music_tracks: int


@dataclass(frozen=True, slots=True)
class _PostSeed:
    slug: str
    title: str
    summary: str
    body: str
    category: str
    tags: tuple[str, ...]
    published_at: datetime
    reading_time_minutes: int
    pinned: bool = False
    cover_url: str | None = None
    cover_alt: str | None = None


@dataclass(frozen=True, slots=True)
class _MomentSeed:
    body: str
    location: str | None
    mood: str | None
    tags: tuple[str, ...]
    published_at: datetime
    images: tuple[tuple[str, str, int, int], ...] = ()


@dataclass(frozen=True, slots=True)
class _ChatterSeed:
    title: str
    lead: str
    body: str
    mood: str
    tags: tuple[str, ...]
    published_at: datetime


@dataclass(frozen=True, slots=True)
class _ProjectSeed:
    name: str
    description: str
    technology: list[str]
    time_span: str
    source_url: str | None
    demo_url: str | None
    status: ProjectStatus
    featured: bool
    display_order: int


@dataclass(frozen=True, slots=True)
class _FriendSeed:
    name: str
    description: str
    url: str
    display_order: int


@dataclass(frozen=True, slots=True)
class _MusicSeed:
    title: str
    artist: str
    source_url: str
    display_order: int


_POSTS = (
    _PostSeed(
        slug="live-acceptance-begins-with-content",
        title="公开验收从真实内容开始",
        summary="用原生 Node、Python 和 MySQL 验证一个页面从数据到浏览器的完整路径。",
        body=(
            "## 一条真实的路径\n\n"
            "这篇文章来自本地 MySQL 的公开验收数据。它经过 FastAPI、Nuxt SSR，"
            "最后才到达浏览器。\n\n"
            "> 可观察的内容，比看起来像内容的 fixture 更可靠。\n\n"
            "- SSR 首屏包含文章标题\n"
            "- 浏览器水合不重复读取同一份数据\n"
            "- 失败时仍然保留可恢复的布局"
        ),
        category="live-acceptance",
        tags=("ssr", "mysql", "acceptance"),
        published_at=datetime(2026, 9, 20, 12, 0),
        reading_time_minutes=4,
        pinned=True,
        cover_url="/images/background/ambient-640.avif",
        cover_alt="深蓝色空间中的柔和光晕",
    ),
    _PostSeed(
        slug="live-acceptance-markdown",
        title="Markdown 仍然是一条可迁移的路",
        summary="让标题、表格、代码、数学和不可靠的媒体都在真实文章里接受检查。",
        body=(
            "## 可迁移的正文\n\n"
            "Markdown 让长期写作不必绑定某一个编辑器。\n\n"
            "| 能力 | 结果 |\n| --- | --- |\n| 可读 | 可以直接审阅源文件 |\n"
            "| 可迁移 | 可以跨编辑器保存 |\n\n"
            "```ts\nconst source = 'markdown'\n```\n\n"
            "行内数学 $E=mc^2$ 保持在普通段落中。\n\n"
            "![验收中 intentionally missing 的媒体](/uploads/live-acceptance/missing-markdown.webp)"
        ),
        category="live-acceptance",
        tags=("markdown", "accessibility"),
        published_at=datetime(2026, 9, 18, 12, 0),
        reading_time_minutes=5,
    ),
    _PostSeed(
        slug="live-acceptance-small-contracts",
        title="小而明确的边界更容易被验证",
        summary="公开内容、状态和错误都应该有清晰的边界，方便人和机器一起检查。",
        body=(
            "把领域边界说清楚，页面就不必猜测数据来自哪里。\n\n"
            "这条记录专门覆盖搜索、分类和标签导航的真实链接。"
        ),
        category="engineering",
        tags=("api", "testing"),
        published_at=datetime(2026, 9, 16, 12, 0),
        reading_time_minutes=3,
    ),
)

_CATEGORIES = (
    ("现场验收", "live-acceptance"),
    ("工程实践", "engineering"),
)

_TAGS = (
    ("SSR", "ssr"),
    ("MySQL", "mysql"),
    ("Acceptance", "acceptance"),
    ("Markdown", "markdown"),
    ("Accessibility", "accessibility"),
    ("API", "api"),
    ("Testing", "testing"),
    ("Building", "building"),
    ("Reading", "reading"),
)

_MOMENTS = (
    _MomentSeed(
        body="真实数据抵达浏览器之后，页面才真正开始接受验收。",
        location="本地工作台",
        mood="专注",
        tags=("building",),
        published_at=datetime(2026, 9, 20, 8, 30),
        images=(("/images/background/ambient-640.avif", "深蓝色空间中的柔和光晕", 640, 360),),
    ),
    _MomentSeed(
        body="刻意保留一张失效媒体，确认恢复状态不会把内部错误带到公开页面。",
        location=None,
        mood="检查",
        tags=("testing",),
        published_at=datetime(2026, 9, 19, 7, 0),
        images=(("/uploads/live-acceptance/missing-moment.webp", "已移除的示例图片", 640, 360),),
    ),
    _MomentSeed(
        body="页面既要在有内容时成立，也要在暂时没有内容时保持清楚。",
        location="窗边",
        mood="平静",
        tags=(),
        published_at=datetime(2026, 9, 17, 6, 0),
    ),
)

_CHATTER = (
    _ChatterSeed(
        title="先让 SSR 交付第一句话",
        lead="首屏内容不应该等到水合结束才出现。",
        body="首屏内容不应该等到水合结束才出现，浏览器只是继续接管已经有意义的页面。",
        mood="工程",
        tags=("ssr", "testing"),
        published_at=datetime(2026, 9, 19, 12, 0),
    ),
    _ChatterSeed(
        title="错误也是公开体验的一部分",
        lead="恢复动作应该和成功内容一样，拥有清楚的层级。",
        body="恢复动作应该和成功内容一样，拥有清楚的层级；错误消息不该泄露 SQL、路径或 traceback。",
        mood="产品",
        tags=("accessibility", "api"),
        published_at=datetime(2026, 9, 18, 12, 0),
    ),
    _ChatterSeed(
        title="把数据边界留在数据层",
        lead="页面只消费稳定的公开契约，不承担持久化模型的细节。",
        body="页面只消费稳定的公开契约，不承担持久化模型的细节。",
        mood="架构",
        tags=("api",),
        published_at=datetime(2026, 9, 16, 12, 0),
    ),
)


async def seed_public_data(session: AsyncSession) -> PublicSeedSummary:
    """Insert or refresh the public acceptance dataset without creating an Administrator."""

    categories = await _upsert_categories(session)
    tags = await _upsert_tags(session)
    await _upsert_posts(session, categories, tags)
    await _upsert_moments(session, tags)
    await _upsert_chatters(session, tags)
    await _upsert_portfolio(session)
    await _upsert_settings(session)
    await _upsert_music(session)
    await session.commit()
    return PublicSeedSummary(
        posts=len(_POSTS),
        moments=len(_MOMENTS),
        chatters=len(_CHATTER),
        projects=2,
        friends=2,
        music_tracks=2,
    )


async def _upsert_categories(session: AsyncSession) -> dict[str, Category]:
    categories: dict[str, Category] = {}
    for name, slug in _CATEGORIES:
        category = await session.scalar(select(Category).where(Category.slug == slug))
        if category is None:
            category = Category(name=name, slug=slug)
            session.add(category)
        else:
            category.name = name
        categories[slug] = category
    await session.flush()
    return categories


async def _upsert_tags(session: AsyncSession) -> dict[str, Tag]:
    tags: dict[str, Tag] = {}
    for name, slug in _TAGS:
        tag = await session.scalar(select(Tag).where(Tag.slug == slug))
        if tag is None:
            tag = Tag(name=name, slug=slug)
            session.add(tag)
        else:
            tag.name = name
        tags[slug] = tag
    await session.flush()
    return tags


async def _upsert_posts(
    session: AsyncSession,
    categories: dict[str, Category],
    tags: dict[str, Tag],
) -> None:
    for seed in _POSTS:
        post = await session.scalar(
            select(Post).options(selectinload(Post.tags)).where(Post.slug == seed.slug)
        )
        if post is None:
            post = Post(slug=seed.slug)
            session.add(post)
        post.title = seed.title
        post.summary = seed.summary
        post.body = seed.body
        post.status = PostStatus.PUBLISHED
        post.is_pinned = seed.pinned
        post.reading_count = 12
        post.reading_time_minutes = seed.reading_time_minutes
        post.cover_url = seed.cover_url
        post.cover_alt = seed.cover_alt
        post.category = categories[seed.category]
        post.tags = [tags[tag_slug] for tag_slug in seed.tags]
        post.published_at = seed.published_at
    await session.flush()


async def _upsert_moments(session: AsyncSession, tags: dict[str, Tag]) -> None:
    for seed in _MOMENTS:
        moment = await session.scalar(
            select(Moment)
            .options(selectinload(Moment.tags), selectinload(Moment.images))
            .where(Moment.body == seed.body)
        )
        if moment is None:
            moment = Moment(body=seed.body)
            session.add(moment)
        moment.location = seed.location
        moment.mood = seed.mood
        moment.status = MomentStatus.PUBLISHED
        moment.published_at = seed.published_at
        moment.tags = [tags[tag_slug] for tag_slug in seed.tags]
        moment.images = []
        await session.flush()
        moment.images = [
            MomentImage(src=src, alt=alt, width=width, height=height, position=position)
            for position, (src, alt, width, height) in enumerate(seed.images)
        ]
    await session.flush()


async def _upsert_chatters(session: AsyncSession, tags: dict[str, Tag]) -> None:
    for seed in _CHATTER:
        chatter = await session.scalar(
            select(Chatter).options(selectinload(Chatter.tags)).where(Chatter.title == seed.title)
        )
        if chatter is None:
            chatter = Chatter(title=seed.title)
            session.add(chatter)
        chatter.lead = seed.lead
        chatter.body = seed.body
        chatter.mood = seed.mood
        chatter.status = ChatterStatus.PUBLISHED
        chatter.published_at = seed.published_at
        chatter.tags = [tags[tag_slug] for tag_slug in seed.tags]
    await session.flush()


async def _upsert_portfolio(session: AsyncSession) -> None:
    projects = (
        _ProjectSeed(
            name="Quiet Public Surface",
            description="一个用真实公开契约验证首屏、状态和恢复路径的小型实验。",
            technology=["Nuxt", "TypeScript", "FastAPI"],
            time_span="2026.08 — 至今",
            source_url="https://github.com/example/quiet-public-surface",
            demo_url="https://example.com/quiet-public-surface",
            status=ProjectStatus.ACTIVE,
            featured=True,
            display_order=0,
        ),
        _ProjectSeed(
            name="Portable Notes",
            description="围绕 Markdown、搜索和长期维护整理的一组内容工具。",
            technology=["Markdown", "MySQL", "Playwright"],
            time_span="2026.05 — 2026.08",
            source_url="https://github.com/example/portable-notes",
            demo_url=None,
            status=ProjectStatus.DEVELOPING,
            featured=True,
            display_order=1,
        ),
    )
    for project_seed in projects:
        project = await session.scalar(select(Project).where(Project.name == project_seed.name))
        if project is None:
            project = Project(name=project_seed.name)
            session.add(project)
        project.description = project_seed.description
        project.technology = project_seed.technology
        project.time_span = project_seed.time_span
        project.source_url = project_seed.source_url
        project.demo_url = project_seed.demo_url
        project.status = project_seed.status
        project.featured = project_seed.featured
        project.display_order = project_seed.display_order

    friends = (
        _FriendSeed(
            name="Quiet Interfaces",
            description="记录界面、阅读和那些不急着完成的灵感。",
            url="https://example.com/quiet-interfaces",
            display_order=0,
        ),
        _FriendSeed(
            name="Small Contracts",
            description="一份持续整理中的前端工程与可访问性笔记。",
            url="https://example.com/small-contracts",
            display_order=1,
        ),
    )
    for friend_seed in friends:
        friend = await session.scalar(select(FriendLink).where(FriendLink.name == friend_seed.name))
        if friend is None:
            friend = FriendLink(name=friend_seed.name)
            session.add(friend)
        friend.avatar_url = None
        friend.avatar_alt = None
        friend.description = friend_seed.description
        friend.url = friend_seed.url
        friend.display_order = friend_seed.display_order
        friend.is_active = True
    await session.flush()


async def _upsert_settings(session: AsyncSession) -> None:
    settings = await session.scalar(select(SiteSettings).where(SiteSettings.id == 1))
    if settings is not None:
        return
    session.add(
        SiteSettings(
            id=1,
            name="夜航手记",
            tagline="让真实内容先抵达，再让细节慢慢发光",
            description="关于技术、生活与把复杂事情做清楚的个人记录。",
            profile="一个喜欢把复杂问题拆小、把长期工作做得可持续的人。",
            about={
                "interests": ["独立产品", "可访问性", "环境音乐"],
                "skills": [
                    {"name": "界面与体验", "items": ["Vue / Nuxt", "TypeScript"]},
                    {"name": "服务与数据", "items": ["FastAPI", "MySQL"]},
                ],
                "story": [
                    "这段内容来自原生 MySQL 的公开验收数据。",
                    "它与公开内容一起经过 SSR、浏览器和失败状态检查。",
                ],
                "timeline": [
                    {
                        "period": "2026",
                        "title": "让内容回到真实路径",
                        "description": "从本地数据库到浏览器，逐层检查公开体验。",
                    }
                ],
            },
            social_links=[
                {"href": "https://github.com/", "kind": "code", "label": "GitHub"},
                {"href": "https://example.com/contact", "kind": "social", "label": "Notes"},
            ],
            seo_defaults={
                "title": "夜航手记",
                "description": "关于技术、生活与把复杂事情做清楚的个人记录。",
                "keywords": ["Nuxt", "FastAPI", "MySQL"],
                "canonical_url": None,
                "og_image_url": None,
                "twitter_card": "summary",
            },
            footer={"note": "一个从真实数据开始的个人出版空间。", "copyright": "", "icp": ""},
            contact={"email": "live@example.com", "note": "欢迎从公开配置发来一封信。"},
            homepage_visibility={
                "posts": True,
                "moments": True,
                "chatter": True,
                "projects": True,
                "friends": True,
                "music": True,
            },
        )
    )
    await session.flush()


async def _upsert_music(session: AsyncSession) -> None:
    tracks = (
        _MusicSeed(
            title="夜色里的测试音轨",
            artist="本地公开验收",
            source_url="/uploads/live-acceptance/missing-audio.mp3",
            display_order=0,
        ),
        _MusicSeed(
            title="安静的恢复路径",
            artist="本地公开验收",
            source_url="/uploads/live-acceptance/missing-audio-2.mp3",
            display_order=1,
        ),
    )
    for track_seed in tracks:
        track = await session.scalar(select(MusicTrack).where(MusicTrack.title == track_seed.title))
        if track is None:
            track = MusicTrack(title=track_seed.title, artist=track_seed.artist)
            session.add(track)
        track.album = "Live acceptance"
        track.source_strategy = "local_media"
        track.source_url = track_seed.source_url
        track.artwork_url = None
        track.artwork_alt = None
        track.duration_seconds = None
        track.display_order = track_seed.display_order
        track.is_enabled = True
    await session.flush()
