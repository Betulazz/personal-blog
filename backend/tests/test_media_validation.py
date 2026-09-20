from io import BytesIO
from wave import open as wave_open

import pytest
from fastapi import UploadFile
from PIL import Image

from app.core.config import Settings
from app.core.exceptions import AppError
from app.services.media import inspect_upload


def _png_bytes(*, size: tuple[int, int] = (2, 3)) -> bytes:
    output = BytesIO()
    Image.new("RGBA", size, (42, 80, 120, 255)).save(output, format="PNG")
    return output.getvalue()


def _jpeg_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (2, 3), (42, 80, 120)).save(output, format="JPEG")
    return output.getvalue()


def _wav_bytes() -> bytes:
    output = BytesIO()
    with wave_open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\x00\x00" * 800)
    return output.getvalue()


def _upload(content: bytes, filename: str, content_type: str) -> UploadFile:
    return UploadFile(BytesIO(content), filename=filename, headers={"content-type": content_type})


@pytest.mark.asyncio
async def test_inspect_upload_verifies_actual_image_type_and_dimensions() -> None:
    inspection = await inspect_upload(
        _upload(_png_bytes(), "..\\avatar.png", "image/png"),
        Settings(),
    )

    assert inspection.media_kind == "image"
    assert inspection.content_type == "image/png"
    assert inspection.width == 2
    assert inspection.height == 3
    assert inspection.original_filename == "avatar.png"

    with pytest.raises(AppError, match="declared image type"):
        await inspect_upload(_upload(_jpeg_bytes(), "avatar.png", "image/png"), Settings())


@pytest.mark.asyncio
async def test_inspect_upload_rejects_oversize_and_processing_dimensions() -> None:
    content = _png_bytes(size=(3, 3))
    with pytest.raises(AppError) as size_error:
        await inspect_upload(
            _upload(content, "avatar.png", "image/png"),
            Settings(media_max_upload_bytes=len(content) - 1),
        )
    assert size_error.value.code == "media_too_large"

    with pytest.raises(AppError) as dimension_error:
        await inspect_upload(
            _upload(content, "avatar.png", "image/png"),
            Settings(image_max_pixels=4),
        )
    assert dimension_error.value.code == "image_dimensions_invalid"


@pytest.mark.asyncio
async def test_inspect_upload_verifies_parseable_audio() -> None:
    inspection = await inspect_upload(
        _upload(_wav_bytes(), "track.wav", "audio/wav"),
        Settings(),
    )
    assert inspection.media_kind == "audio"
    assert inspection.content_type == "audio/wav"
    assert inspection.width is None

    with pytest.raises(AppError) as mismatch:
        await inspect_upload(_upload(b"RIFFnot-a-wave", "track.wav", "audio/wav"), Settings())
    assert mismatch.value.code == "media_content_mismatch"
