import argparse
import asyncio
import getpass
import sys
from collections.abc import Sequence

from pydantic import ValidationError

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.session import async_session_factory
from app.schemas.auth import CreateAdminRequest
from app.services.auth import AuthService


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Personal Blog backend administration CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "create-admin",
        help="Interactively create the first Administrator after migrations have run",
    )
    args = parser.parse_args(argv)

    if args.command == "create-admin":
        return asyncio.run(_create_admin())
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
