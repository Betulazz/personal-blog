import json
from pathlib import Path

import pytest

from app.services.runtime_uptime import RuntimeUptime


class FakeMonotonic:
    def __init__(self) -> None:
        self.value = 100.0

    def __call__(self) -> float:
        return self.value

    def advance(self, seconds: float) -> None:
        self.value += seconds


@pytest.mark.asyncio
async def test_runtime_uptime_is_saved_and_resumed(tmp_path: Path) -> None:
    state_file = tmp_path / "runtime" / "uptime.json"
    clock = FakeMonotonic()
    first_run = RuntimeUptime(state_file, monotonic=clock)

    await first_run.start()
    clock.advance(3_600.8)
    assert await first_run.elapsed_seconds() == 3_600
    await first_run.stop()

    saved = json.loads(state_file.read_text(encoding="utf-8"))
    assert saved["schema_version"] == 1
    assert saved["total_seconds"] == pytest.approx(3_600.8)

    second_run = RuntimeUptime(state_file, monotonic=clock)
    await second_run.start()
    clock.advance(5.4)
    assert await second_run.elapsed_seconds() == 3_606
    await second_run.stop()

    resumed = json.loads(state_file.read_text(encoding="utf-8"))
    assert resumed["total_seconds"] == pytest.approx(3_606.2)


@pytest.mark.asyncio
async def test_runtime_uptime_checkpoint_persists_while_running(tmp_path: Path) -> None:
    state_file = tmp_path / "uptime.json"
    clock = FakeMonotonic()
    uptime = RuntimeUptime(
        state_file,
        checkpoint_interval=3_600,
        monotonic=clock,
    )

    await uptime.start()
    clock.advance(20.5)
    await uptime.checkpoint()

    saved = json.loads(state_file.read_text(encoding="utf-8"))
    assert saved["total_seconds"] == pytest.approx(20.5)
    assert await uptime.elapsed_seconds() == 20
    await uptime.stop()
