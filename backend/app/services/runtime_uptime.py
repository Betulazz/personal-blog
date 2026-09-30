import asyncio
import json
import logging
import math
import os
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class RuntimeUptime:
    """Accumulate process run time and checkpoint it to durable local storage."""

    def __init__(
        self,
        state_file: Path,
        *,
        checkpoint_interval: float = 15.0,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        if checkpoint_interval <= 0:
            raise ValueError("checkpoint_interval must be positive")

        self._state_file = state_file
        self._checkpoint_interval = checkpoint_interval
        self._monotonic = monotonic
        self._lock = asyncio.Lock()
        self._accumulated_seconds = 0.0
        self._started_at: float | None = None
        self._checkpoint_task: asyncio.Task[None] | None = None
        self._stop_checkpoints: asyncio.Event | None = None

    async def start(self) -> None:
        async with self._lock:
            if self._started_at is not None:
                raise RuntimeError("Runtime uptime has already started")

            accumulated = await asyncio.to_thread(self._read_state)
            await asyncio.to_thread(self._write_state, accumulated)
            self._accumulated_seconds = accumulated
            self._started_at = self._monotonic()
            self._stop_checkpoints = asyncio.Event()
            self._checkpoint_task = asyncio.create_task(
                self._checkpoint_loop(self._stop_checkpoints),
                name="runtime-uptime-checkpoint",
            )

    async def elapsed_seconds(self) -> int:
        async with self._lock:
            elapsed = self._accumulated_seconds
            if self._started_at is not None:
                elapsed += max(0.0, self._monotonic() - self._started_at)
            return math.floor(elapsed)

    async def checkpoint(self) -> None:
        async with self._lock:
            if self._started_at is None:
                return

            now = self._monotonic()
            accumulated = self._accumulated_seconds + max(0.0, now - self._started_at)
            await asyncio.to_thread(self._write_state, accumulated)
            self._accumulated_seconds = accumulated
            self._started_at = now

    async def stop(self) -> None:
        task = self._checkpoint_task
        self._checkpoint_task = None
        stop_checkpoints = self._stop_checkpoints
        self._stop_checkpoints = None
        if stop_checkpoints is not None:
            stop_checkpoints.set()
        if task is not None:
            await task

        async with self._lock:
            if self._started_at is None:
                return

            now = self._monotonic()
            accumulated = self._accumulated_seconds + max(0.0, now - self._started_at)
            await asyncio.to_thread(self._write_state, accumulated)
            self._accumulated_seconds = accumulated
            self._started_at = None

    async def _checkpoint_loop(self, stop_event: asyncio.Event) -> None:
        while not stop_event.is_set():
            try:
                await asyncio.wait_for(
                    stop_event.wait(),
                    timeout=self._checkpoint_interval,
                )
                return
            except TimeoutError:
                pass
            try:
                await self.checkpoint()
            except Exception:
                logger.exception("Could not save runtime uptime checkpoint")

    def _read_state(self) -> float:
        try:
            payload: Any = json.loads(self._state_file.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return 0.0
        except (OSError, json.JSONDecodeError) as error:
            raise RuntimeError(
                f"Could not read runtime uptime state: {self._state_file}"
            ) from error

        schema_version = payload.get("schema_version") if isinstance(payload, dict) else None
        if isinstance(schema_version, bool) or schema_version != 1:
            raise RuntimeError(
                f"Runtime uptime state has an unsupported format: {self._state_file}"
            )

        accumulated = payload.get("total_seconds")
        if (
            isinstance(accumulated, bool)
            or not isinstance(accumulated, (int, float))
            or not math.isfinite(accumulated)
            or accumulated < 0
        ):
            raise RuntimeError(f"Runtime uptime state has an invalid duration: {self._state_file}")
        return float(accumulated)

    def _write_state(self, accumulated: float) -> None:
        self._state_file.parent.mkdir(parents=True, exist_ok=True)
        file_descriptor, temporary_name = tempfile.mkstemp(
            dir=self._state_file.parent,
            prefix=f".{self._state_file.name}.",
            suffix=".tmp",
        )
        temporary_path = Path(temporary_name)
        try:
            with os.fdopen(file_descriptor, "w", encoding="utf-8") as temporary_file:
                json.dump(
                    {"schema_version": 1, "total_seconds": accumulated},
                    temporary_file,
                )
                temporary_file.write("\n")
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_path, self._state_file)
        finally:
            temporary_path.unlink(missing_ok=True)
