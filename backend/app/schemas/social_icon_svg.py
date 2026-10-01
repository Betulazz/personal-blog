import math
import re
from xml.etree import ElementTree

MAX_SOCIAL_ICON_SVG_LENGTH = 20_000
_SVG_NAMESPACE = "http://www.w3.org/2000/svg"
_NUMBER = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
_NUMBER_RE = re.compile(rf"^{_NUMBER}$")
_LENGTH_RE = re.compile(rf"^{_NUMBER}(?:%|px|em|ex|rem|pt|pc|cm|mm|in)?$")
_PATH_DATA_RE = re.compile(r"^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\-\s]*$")
_ID_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$")
_LOCAL_URL_RE = re.compile(r"^url\(\s*#[A-Za-z_][A-Za-z0-9_.:-]{0,127}\s*\)$")
_COLOR_RE = re.compile(
    r"^(?:currentColor|none|transparent|#[0-9A-Fa-f]{3,8}|[A-Za-z]{1,32}|"
    r"(?:rgb|rgba|hsl|hsla)\([0-9A-Fa-f.,%+\-/\s]{1,80}\)|"
    r"url\(\s*#[A-Za-z_][A-Za-z0-9_.:-]{0,127}\s*\))$",
    re.IGNORECASE,
)
_TRANSFORM_RE = re.compile(
    rf"^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\(\s*{_NUMBER}"
    rf"(?:[\s,]+{_NUMBER})*\s*\)\s*)+$"
)
_SVG_TAGS = {
    "svg",
    "g",
    "path",
    "circle",
    "rect",
    "line",
    "polyline",
    "polygon",
    "ellipse",
    "defs",
    "clipPath",
    "mask",
    "linearGradient",
    "radialGradient",
    "stop",
}
_SVG_ATTRIBUTES = {
    "id",
    "viewBox",
    "preserveAspectRatio",
    "fill",
    "fill-opacity",
    "fill-rule",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-opacity",
    "stroke-dasharray",
    "stroke-dashoffset",
    "opacity",
    "transform",
    "gradientTransform",
    "gradientUnits",
    "spreadMethod",
    "clipPathUnits",
    "clip-path",
    "mask",
    "maskUnits",
    "maskContentUnits",
    "stop-color",
    "stop-opacity",
    "offset",
    "d",
    "points",
    "x",
    "y",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "x1",
    "x2",
    "y1",
    "y2",
    "width",
    "height",
}
_LENGTH_ATTRIBUTES = {
    "stroke-width",
    "stroke-dashoffset",
    "offset",
    "x",
    "y",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "x1",
    "x2",
    "y1",
    "y2",
    "width",
    "height",
}
_OPACITY_ATTRIBUTES = {"opacity", "fill-opacity", "stroke-opacity", "stop-opacity"}
_ENUM_ATTRIBUTES = {
    "fill-rule": {"nonzero", "evenodd"},
    "stroke-linecap": {"butt", "round", "square"},
    "stroke-linejoin": {"arcs", "bevel", "miter", "miter-clip", "round"},
    "gradientUnits": {"objectBoundingBox", "userSpaceOnUse"},
    "spreadMethod": {"pad", "reflect", "repeat"},
    "clipPathUnits": {"objectBoundingBox", "userSpaceOnUse"},
    "maskUnits": {"objectBoundingBox", "userSpaceOnUse"},
    "maskContentUnits": {"objectBoundingBox", "userSpaceOnUse"},
}


def _local_name(tag: str) -> tuple[str, str | None]:
    if tag.startswith("{"):
        namespace, _, name = tag[1:].partition("}")
        return name, namespace
    return tag, None


def _safe_view_box(value: str) -> bool:
    parts = [part for part in re.split(r"[\s,]+", value.strip()) if part]
    if len(parts) != 4 or not all(_NUMBER_RE.fullmatch(part) for part in parts):
        return False
    try:
        return (
            math.isfinite(float(parts[0]))
            and math.isfinite(float(parts[1]))
            and math.isfinite(float(parts[2]))
            and math.isfinite(float(parts[3]))
            and float(parts[2]) > 0
            and float(parts[3]) > 0
        )
    except ValueError:
        return False


def _safe_attribute(name: str, value: str) -> bool:
    if len(value) > MAX_SOCIAL_ICON_SVG_LENGTH:
        return False
    value = value.strip()
    if name == "id":
        return bool(_ID_RE.fullmatch(value))
    if name == "viewBox":
        return _safe_view_box(value)
    if name in {"d", "points", "stroke-dasharray"}:
        return bool(_PATH_DATA_RE.fullmatch(value))
    if name in {"transform", "gradientTransform"}:
        return bool(_TRANSFORM_RE.fullmatch(value))
    if name in {"fill", "stroke", "stop-color"}:
        return bool(_COLOR_RE.fullmatch(value))
    if name in {"clip-path", "mask"}:
        return value == "none" or bool(_LOCAL_URL_RE.fullmatch(value))
    if name in _LENGTH_ATTRIBUTES:
        return bool(_LENGTH_RE.fullmatch(value))
    if name in _OPACITY_ATTRIBUTES:
        return bool(_NUMBER_RE.fullmatch(value)) and 0 <= float(value) <= 1
    if name == "preserveAspectRatio":
        return value in {
            "none",
            "xMinYMin meet",
            "xMidYMin meet",
            "xMaxYMin meet",
            "xMinYMid meet",
            "xMidYMid meet",
            "xMaxYMid meet",
            "xMinYMax meet",
            "xMidYMax meet",
            "xMaxYMax meet",
            "xMinYMin slice",
            "xMidYMin slice",
            "xMaxYMin slice",
            "xMinYMid slice",
            "xMidYMid slice",
            "xMaxYMid slice",
            "xMinYMax slice",
            "xMidYMax slice",
            "xMaxYMax slice",
        }
    if name in _ENUM_ATTRIBUTES:
        return value in _ENUM_ATTRIBUTES[name]
    return False


def sanitize_social_icon_svg(source: str) -> str:
    """Keep only a small, inert subset of SVG suitable for inline icon rendering."""
    normalized = source.strip()
    if (
        not normalized
        or len(normalized) > MAX_SOCIAL_ICON_SVG_LENGTH
        or re.search(r"<!\s*(?:DOCTYPE|ENTITY)", normalized, re.IGNORECASE)
    ):
        raise ValueError("social icon must be SVG source no larger than 20000 characters")

    try:
        source_root = ElementTree.fromstring(normalized)
    except ElementTree.ParseError as error:
        raise ValueError("social icon must contain valid SVG markup") from error

    root_name, root_namespace = _local_name(source_root.tag)
    if root_name != "svg" or root_namespace not in {None, _SVG_NAMESPACE}:
        raise ValueError("social icon must have an SVG root element")

    view_box = source_root.attrib.get("viewBox")
    if view_box is None or not _safe_view_box(view_box):
        raise ValueError("social icon SVG must include a valid viewBox")

    clean_root = ElementTree.Element("svg", {"viewBox": view_box.strip()})
    for name, value in source_root.attrib.items():
        if name != "viewBox" and name in _SVG_ATTRIBUTES and _safe_attribute(name, value):
            clean_root.set(name, value.strip())

    element_count = 1

    def copy_children(
        source_element: ElementTree.Element,
        clean_element: ElementTree.Element,
        depth: int,
    ) -> None:
        nonlocal element_count
        if depth > 16:
            return
        for child in source_element:
            if not isinstance(child.tag, str):
                continue
            name, namespace = _local_name(child.tag)
            if name not in _SVG_TAGS or name == "svg" or namespace not in {None, _SVG_NAMESPACE}:
                continue
            element_count += 1
            if element_count > 256:
                raise ValueError("social icon SVG must contain no more than 256 elements")
            clean_child = ElementTree.SubElement(clean_element, name)
            for attribute, value in child.attrib.items():
                if attribute in _SVG_ATTRIBUTES and _safe_attribute(attribute, value):
                    clean_child.set(attribute, value.strip())
            copy_children(child, clean_child, depth + 1)

    copy_children(source_root, clean_root, 1)
    sanitized = ElementTree.tostring(clean_root, encoding="unicode", short_empty_elements=True)
    if len(sanitized) > MAX_SOCIAL_ICON_SVG_LENGTH:
        raise ValueError("sanitized social icon SVG exceeds 20000 characters")
    return sanitized
