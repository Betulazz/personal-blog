import math
import re

_CJK_CHARACTERS = re.compile(
    r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff"
    r"\uac00-\ud7af\U00020000-\U0002FA1F]"
)
_MARKDOWN_LINK = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
_BLOCK_MARKERS = re.compile(
    r"(?m)^\s{0,3}(?:#{1,6}[ \t]+|>[ \t]?|[-+*][ \t]+(?:\[[ xX]\][ \t]+)?|\d+[.)][ \t]+)"
)
_HTML_TAG = re.compile(r"</?[A-Za-z][^>]*>")
_LATIN_WORD = re.compile(r"[\w]+(?:['’\-][\w]+)*", re.UNICODE)


def calculate_reading_time_minutes(markdown: str) -> int:
    """Estimate reading time from canonical Markdown at 200 words / 400 CJK chars per minute."""
    readable_text = _MARKDOWN_LINK.sub(r"\1", markdown)
    readable_text = _BLOCK_MARKERS.sub("", readable_text)
    readable_text = _HTML_TAG.sub(" ", readable_text)
    cjk_characters = len(_CJK_CHARACTERS.findall(readable_text))
    latin_words = len(_LATIN_WORD.findall(_CJK_CHARACTERS.sub(" ", readable_text)))
    reading_minutes = math.ceil(latin_words / 200 + cjk_characters / 400)
    return max(1, reading_minutes) if readable_text.strip() else 0
