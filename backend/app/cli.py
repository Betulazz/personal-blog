import argparse
import asyncio
import getpass
import os
import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path

from pydantic import ValidationError

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.session import async_session_factory, dispose_engine
from app.schemas.auth import CreateAdminRequest
from app.seed import seed_public_data
from app.services.auth import AuthService
from app.services.background_gallery_import import import_managed_background
from app.storage.factory import create_storage_adapter


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Personal Blog backend administration CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "create-admin",
        help="Interactively create the first Administrator after migrations have run",
    )
    subparsers.add_parser(
        "seed-public",
        help="Seed idempotent public acceptance content without creating an Administrator",
    )
    subparsers.add_parser(
        "import-background",
        help=(
            "Import repository-root bg.jpeg into Media Assets and append it to "
            "the Background Gallery"
        ),
    )
    serve_live = subparsers.add_parser(
        "serve-live",
        help="Migrate, seed public acceptance content, and serve the native API",
    )
    serve_live.add_argument("--host", default="127.0.0.1")
    serve_live.add_argument("--port", default=8000, type=int)
    args = parser.parse_args(argv)

    if args.command == "create-admin":
        return asyncio.run(_create_admin())
    if args.command == "seed-public":
        return asyncio.run(_seed_public())
    if args.command == "import-background":
        return asyncio.run(_import_background())
    if args.command == "serve-live":
        return _serve_live(args.host, args.port)
    return 2


async def _create_admin() -> int:
    try:
        payload = _prompt_for_admin()
    except (EOFError, KeyboardInterrupt):
        print("Administrator creation cancelled.", file=sys.stderr)
        return 130
    except (ValidationError, ValueError) as exc:
        print(_validation_message(exc), file=sys.stderr)
        return 2

    async with async_session_factory() as session:
        try:
            await AuthService(session, get_settings()).create_first_admin(payload)
        except AppError as exc:
            print(exc.message, file=sys.stderr)
            return 1

    print(f"Administrator '{payload.username.strip().casefold()}' created.")
    return 0


async def _seed_public() -> int:
    try:
        async with async_session_factory() as session:
            summary = await seed_public_data(session)
    finally:
        await dispose_engine()
    print(
        "Seeded public acceptance content: "
        f"{summary.posts} Posts, {summary.chatters} Chatter entries, {summary.projects} Projects, "
        f"{summary.friends} Friend Links, {summary.music_tracks} Music Tracks."
    )
    print("No Administrator was created or changed.")
    return 0


async def _import_background() -> int:
    settings = get_settings()
    source_path = Path(__file__).parents[2] / "bg.jpeg"
    try:
        async with async_session_factory() as session:
            result = await import_managed_background(
                session,
                settings,
                create_storage_adapter(settings),
                source_path,
            )
    except AppError as exc:
        print(exc.message, file=sys.stderr)
        return 1
    finally:
        await dispose_engine()

    action = "Added" if result.added_to_gallery else "Already present"
    print(
        f"{action} managed background {result.asset_key}; "
        f"Background Gallery now has {result.gallery_count} entries."
    )
    return 0


def _serve_live(host: str, port: int) -> int:
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
    subprocess.run([sys.executable, "-m", "app.cli", "seed-public"], check=True)
    asyncio.run(_seed_live_admin_from_environment())
    import uvicorn

    uvicorn.run("app.main:app", host=host, port=port, log_level="warning")
    return 0


async def _seed_live_admin_from_environment() -> None:
    """Create an opt-in local acceptance Administrator when credentials are supplied."""

    username = os.environ.get("LIVE_ACCEPTANCE_ADMIN_USERNAME")
    password = os.environ.get("LIVE_ACCEPTANCE_ADMIN_PASSWORD")
    if not username or not password:
        return

    async with async_session_factory() as session:
        try:
            await AuthService(session, get_settings()).create_first_admin(
                CreateAdminRequest(
                    username=username,
                    email=os.environ.get("LIVE_ACCEPTANCE_ADMIN_EMAIL"),
                    password=password,
                )
            )
        except AppError as exc:
            if exc.code != "administrator_exists":
                raise


def _prompt_for_admin() -> CreateAdminRequest:
    chosen_username = input("Administrator username: ")
    chosen_email = input("Email (optional): ") or None
    password = getpass.getpass("Password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise ValueError("Passwords do not match")
    return CreateAdminRequest(username=chosen_username, email=chosen_email, password=password)


def _validation_message(exc: ValidationError | ValueError) -> str:
    if isinstance(exc, ValueError) and not isinstance(exc, ValidationError):
        return f"Invalid Administrator details: {exc}"
    messages = [str(error.get("msg", "Invalid value")) for error in exc.errors()]
    return "Invalid Administrator details: " + "; ".join(messages)


if __name__ == "__main__":
    raise SystemExit(main())
