import json
import os
import subprocess
import sys
from collections.abc import AsyncIterator
from datetime import datetime
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.db.session import create_database_engine

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
async def migration_mysql_engine(
    mysql_database_url: str,
    migrated_mysql_database: str,
) -> AsyncIterator[AsyncEngine]:
    engine = create_database_engine(mysql_database_url)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_mysql_upgrade_archives_and_migrates_representative_v1_content(
    mysql_database_url: str,
    migrated_mysql_database: str,
    migration_mysql_engine: AsyncEngine,
) -> None:
    _alembic(mysql_database_url, "downgrade", "0011_post_seo_fields")
    legacy_published_at = datetime(2021, 4, 3, 2, 1, 0)
    legacy_created_at = datetime(2020, 2, 1, 0, 0, 0)

    async with migration_mysql_engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO categories (id, name, slug) "
                "VALUES (10001, '旧分类', 'legacy-category')"
            )
        )
        await connection.execute(
            text(
                "INSERT INTO tags (id, name, slug) VALUES "
                "(10001, '文章标签', 'post-tag'), (10002, '旧动态标签', 'legacy-tag')"
            )
        )
        await connection.execute(
            text(
                "INSERT INTO music_tracks (id, title, artist, album, source_strategy, "
                "source_url, artwork_url, artwork_alt, duration_seconds, display_order, "
                "is_enabled, created_at, updated_at) VALUES "
                "(10001, '旧音轨', '旧歌手', '旧专辑', 'local_media', "
                "'/uploads/audio/legacy-track.mp3', '/uploads/images/legacy-cover.webp', "
                "'旧封面', 180, 0, 1, :created_at, :created_at)"
            ),
            {"created_at": legacy_created_at},
        )
        await connection.execute(
            text(
                "INSERT INTO posts (id, title, slug, body, status, category_id, "
                "seo_title, seo_description, canonical_url, og_image_url, "
                "published_at, created_at, updated_at) VALUES "
                "(10001, '旧文章', 'legacy-post', '文章正文', 'published', 10001, "
                "'旧文章 SEO 标题', '旧文章 SEO 描述', "
                "'https://legacy.example.com/post', '/uploads/legacy-og.webp', "
                ":published_at, :created_at, :created_at)"
            ),
            {"published_at": legacy_published_at, "created_at": legacy_created_at},
        )
        await connection.execute(
            text(
                "INSERT INTO site_settings "
                "(id, name, tagline, description, profile, about, avatar_url, avatar_alt, "
                "favicon_url, social_links, seo_defaults, footer, contact, homepage_visibility) "
                "VALUES (1, '旧站点', '', '旧描述', '', "
                ":about, NULL, NULL, NULL, :social_links, :seo_defaults, :footer, :contact, "
                ":homepage_visibility)"
            ),
            {
                "about": json.dumps({"interests": [], "skills": [], "story": [], "timeline": []}),
                "social_links": "[]",
                "seo_defaults": json.dumps(
                    {
                        "title": "旧站点 SEO 标题",
                        "description": "旧站点 SEO 描述",
                        "keywords": ["旧关键词"],
                        "canonical_url": "https://legacy.example.com/",
                        "og_image_url": "/uploads/legacy-site-og.webp",
                        "twitter_card": "summary",
                    }
                ),
                "footer": json.dumps({"note": "", "copyright": "", "icp": ""}),
                "contact": json.dumps({"email": "", "note": ""}),
                "homepage_visibility": json.dumps(
                    {
                        "posts": True,
                        "moments": True,
                        "chatter": True,
                        "projects": True,
                        "friends": True,
                        "music": True,
                    }
                ),
            },
        )
        await connection.execute(
            text("INSERT INTO post_tags (post_id, tag_id) VALUES (10001, 10001)")
        )
        await connection.execute(
            text(
                "INSERT INTO chatters (id, title, `lead`, body, mood, status, published_at, "
                "created_at, updated_at) VALUES (10001, '旧杂谈', '旧引子', '旧正文', '安静', "
                "'draft', NULL, :created_at, :created_at)"
            ),
            {"created_at": legacy_created_at},
        )
        await connection.execute(
            text("INSERT INTO chatter_tags (chatter_id, tag_id) VALUES (10001, 10002)")
        )
        await connection.execute(
            text(
                "INSERT INTO moments (id, body, location, mood, status, published_at, "
                "created_at, updated_at) VALUES "
                "(10001, '旧动态正文', '窗边', '平静', 'published', :published_at, "
                ":created_at, :created_at), "
                "(10002, '未发布旧动态', NULL, NULL, 'draft', NULL, :created_at, :created_at)"
            ),
            {"published_at": legacy_published_at, "created_at": legacy_created_at},
        )
        await connection.execute(
            text(
                "INSERT INTO moment_images "
                "(id, moment_id, src, alt, width, height, position) "
                "VALUES (10001, 10001, '/uploads/legacy.webp', '旧图', 640, 480, 0)"
            )
        )
        await connection.execute(
            text("INSERT INTO moment_tags (moment_id, tag_id) VALUES (10001, 10002)")
        )

    _alembic(mysql_database_url, "upgrade", "head")

    try:
        async with migration_mysql_engine.connect() as connection:
            moment_tables = await connection.execute(text("SHOW TABLES LIKE 'moments'"))
            categories = await connection.execute(text("SHOW TABLES LIKE 'categories'"))
            category_column = await connection.execute(
                text("SHOW COLUMNS FROM posts LIKE 'category_id'")
            )
            chatter_tag_table = await connection.execute(text("SHOW TABLES LIKE 'chatter_tags'"))
            legacy_music_source = await connection.execute(
                text("SHOW COLUMNS FROM music_tracks LIKE 'source_url'")
            )
            post_seo_column = await connection.execute(
                text("SHOW COLUMNS FROM posts LIKE 'seo_title'")
            )
            site_seo_column = await connection.execute(
                text("SHOW COLUMNS FROM site_settings LIKE 'seo_defaults'")
            )
            netease_music_id = await connection.execute(
                text("SHOW COLUMNS FROM music_tracks LIKE 'netease_song_id'")
            )
            assert moment_tables.first() is None
            assert categories.first() is None
            assert category_column.first() is None
            assert chatter_tag_table.first() is None
            assert legacy_music_source.first() is None
            assert post_seo_column.first() is None
            assert site_seo_column.first() is None
            assert netease_music_id.first() is not None
            assert await connection.scalar(text("SELECT COUNT(*) FROM music_tracks")) == 0

            unchanged_post = (
                (
                    await connection.execute(
                        text(
                            "SELECT title, slug, body, status, published_at, created_at, "
                            "updated_at "
                            "FROM posts WHERE id = 10001"
                        )
                    )
                )
                .mappings()
                .one()
            )
            assert unchanged_post == {
                "title": "旧文章",
                "slug": "legacy-post",
                "body": "文章正文",
                "status": "published",
                "published_at": legacy_published_at,
                "created_at": legacy_created_at,
                "updated_at": legacy_created_at,
            }

            migrated = await connection.execute(
                text(
                    "SELECT id, body, mood, status, published_at, created_at "
                    "FROM chatters WHERE id IN (10001, 10002, 10003) ORDER BY id"
                )
            )
            rows = migrated.mappings().all()
            assert [row["id"] for row in rows] == [10001, 10002, 10003]
            assert rows[0]["body"] == "旧引子\n\n旧正文"
            assert rows[0]["published_at"] is None
            assert rows[1]["body"] == "旧动态正文\n\n地点：窗边"
            assert rows[1]["mood"] == "平静"
            assert rows[1]["status"] == "published"
            assert rows[1]["published_at"] == legacy_published_at
            assert rows[1]["created_at"] == legacy_created_at
            assert rows[2]["body"] == "未发布旧动态"
            assert rows[2]["status"] == "draft"
            assert rows[2]["published_at"] is None

            archived_post_seo = await connection.scalar(
                text(
                    "SELECT payload FROM content_migration_archive "
                    "WHERE source_type = 'post_seo' AND source_key = '10001'"
                )
            )
            if isinstance(archived_post_seo, str):
                archived_post_seo = json.loads(archived_post_seo)
            assert archived_post_seo == {
                "seo_title": "旧文章 SEO 标题",
                "seo_description": "旧文章 SEO 描述",
                "canonical_url": "https://legacy.example.com/post",
                "og_image_url": "/uploads/legacy-og.webp",
            }

            archived_site_seo = await connection.scalar(
                text(
                    "SELECT payload FROM content_migration_archive "
                    "WHERE source_type = 'site_seo_defaults' AND source_key = '1'"
                )
            )
            if isinstance(archived_site_seo, str):
                archived_site_seo = json.loads(archived_site_seo)
            assert archived_site_seo["seo_defaults"]["title"] == "旧站点 SEO 标题"
            assert archived_site_seo["seo_defaults"]["canonical_url"] == (
                "https://legacy.example.com/"
            )

            images = await connection.execute(
                text(
                    "SELECT chatter_id, src, alt, width, height, position "
                    "FROM chatter_images WHERE chatter_id = 10002"
                )
            )
            assert images.mappings().one() == {
                "chatter_id": 10002,
                "src": "/uploads/legacy.webp",
                "alt": "旧图",
                "width": 640,
                "height": 480,
                "position": 0,
            }

            tags = await connection.execute(text("SELECT id FROM tags ORDER BY id"))
            assert [row[0] for row in tags] == [10001]
            archived = await connection.execute(
                text(
                    "SELECT source_type, source_key, payload "
                    "FROM content_migration_archive "
                    "WHERE source_key IN ('10001', '10002') ORDER BY id"
                )
            )
            archive_rows = archived.mappings().all()
            assert any(row["source_type"] == "moment" for row in archive_rows)
            assert any(row["source_type"] == "category" for row in archive_rows)
            assert any(row["source_type"] == "post_category" for row in archive_rows)
            assert any(row["source_type"] == "chatter" for row in archive_rows)
            archived_music = await connection.scalar(
                text(
                    "SELECT payload FROM content_migration_archive "
                    "WHERE source_type = 'legacy_music_track' AND source_key = '10001'"
                )
            )
            if isinstance(archived_music, str):
                archived_music = json.loads(archived_music)
            assert archived_music["source_url"] == "/uploads/audio/legacy-track.mp3"
            assert archived_music["artwork_url"] == "/uploads/images/legacy-cover.webp"
        _alembic_check(mysql_database_url)
    finally:
        async with migration_mysql_engine.begin() as connection:
            await connection.execute(text("DELETE FROM chatters WHERE id IN (10001, 10002, 10003)"))
            await connection.execute(text("DELETE FROM posts WHERE id = 10001"))
            await connection.execute(text("DELETE FROM site_settings WHERE id = 1"))
            await connection.execute(text("DELETE FROM tags WHERE id IN (10001, 10002)"))
            await connection.execute(
                text(
                    "DELETE FROM content_migration_archive WHERE source_key IN "
                    "('10001', '10002', '10001:10002')"
                )
            )
            await connection.execute(
                text(
                    "DELETE FROM content_migration_archive "
                    "WHERE source_type = 'legacy_music_track' AND source_key = '10001'"
                )
            )
            await connection.execute(
                text(
                    "DELETE FROM content_migration_archive "
                    "WHERE source_type = 'site_seo_defaults' AND source_key = '1'"
                )
            )


def _alembic(database_url: str, action: str, revision: str) -> None:
    _run_alembic(database_url, action, revision)


def _alembic_check(database_url: str) -> None:
    _run_alembic(database_url, "check")


def _run_alembic(database_url: str, *arguments: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=BACKEND_ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        pytest.fail(f"Alembic {' '.join(arguments)} failed:\n{result.stdout}\n{result.stderr}")
