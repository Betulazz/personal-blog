import pytest

from app.core.exceptions import AppError
from app.services.comments import _render_markdown


def test_supported_comment_markdown_is_rendered_and_html_is_escaped():
    html = _render_markdown(
        "# Heading\n\n**bold** and *italic*\n\n- bullet\n\n1. ordered\n\n"
        "> quoted\n\n`inline`\n\n```python\nprint(1)\n```\n\n---\n\n"
        "[link](https://example.com)\n\n<script>alert(1)</script>"
    )
    for tag in ("h1", "strong", "em", "ul", "ol", "blockquote", "code", "pre", "hr", "a"):
        assert f"<{tag}" in html
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "nofollow noopener noreferrer" in html


@pytest.mark.parametrize(
    "body", ["[unsafe](javascript:alert)", "![image](https://example.com/a.png)"]
)
def test_comment_markdown_still_rejects_unsafe_links_and_media(body):
    with pytest.raises(AppError):
        _render_markdown(body)
