const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MAX_SOCIAL_ICON_SVG_LENGTH = 20_000

const svgTags = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'defs',
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'stop',
])

const svgAttributes = new Set([
  'id',
  'viewBox',
  'preserveAspectRatio',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'transform',
  'gradientTransform',
  'gradientUnits',
  'spreadMethod',
  'clipPathUnits',
  'clip-path',
  'mask',
  'maskUnits',
  'maskContentUnits',
  'stop-color',
  'stop-opacity',
  'offset',
  'd',
  'points',
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x1',
  'x2',
  'y1',
  'y2',
  'width',
  'height',
])

const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?'
const numberPattern = new RegExp(`^${number}$`)
const lengthPattern = new RegExp(
  `^${number}(?:%|px|em|ex|rem|pt|pc|cm|mm|in)?$`,
)
const pathDataPattern = /^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\-\s]*$/
const idPattern = /^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$/
const localUrlPattern = /^url\(\s*#[A-Za-z_][A-Za-z0-9_.:-]{0,127}\s*\)$/
const colorPattern =
  /^(?:currentColor|none|transparent|#[0-9A-Fa-f]{3,8}|[A-Za-z]{1,32}|(?:rgb|rgba|hsl|hsla)\([0-9A-Fa-f.,%+\-/\s]{1,80}\)|url\(\s*#[A-Za-z_][A-Za-z0-9_.:-]{0,127}\s*\))$/i
const transformPattern = new RegExp(
  `^(?:\\s*(?:matrix|translate|scale|rotate|skewX|skewY)\\(\\s*${number}(?:[\\s,]+${number})*\\s*\\)\\s*)+$`,
)
const lengthAttributes = new Set([
  'stroke-width',
  'stroke-dashoffset',
  'offset',
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x1',
  'x2',
  'y1',
  'y2',
  'width',
  'height',
])
const opacityAttributes = new Set([
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
])
const enumAttributes: Record<string, Set<string>> = {
  'fill-rule': new Set(['nonzero', 'evenodd']),
  'stroke-linecap': new Set(['butt', 'round', 'square']),
  'stroke-linejoin': new Set(['arcs', 'bevel', 'miter', 'miter-clip', 'round']),
  gradientUnits: new Set(['objectBoundingBox', 'userSpaceOnUse']),
  spreadMethod: new Set(['pad', 'reflect', 'repeat']),
  clipPathUnits: new Set(['objectBoundingBox', 'userSpaceOnUse']),
  maskUnits: new Set(['objectBoundingBox', 'userSpaceOnUse']),
  maskContentUnits: new Set(['objectBoundingBox', 'userSpaceOnUse']),
}
const preserveAspectRatios = new Set([
  'none',
  'xMinYMin meet',
  'xMidYMin meet',
  'xMaxYMin meet',
  'xMinYMid meet',
  'xMidYMid meet',
  'xMaxYMid meet',
  'xMinYMax meet',
  'xMidYMax meet',
  'xMaxYMax meet',
  'xMinYMin slice',
  'xMidYMin slice',
  'xMaxYMin slice',
  'xMinYMid slice',
  'xMidYMid slice',
  'xMaxYMid slice',
  'xMinYMax slice',
  'xMidYMax slice',
  'xMaxYMax slice',
])

const safeViewBox = (value: string) => {
  const parts = value.trim().split(/[\s,]+/)
  return (
    parts.length === 4 &&
    parts.every((part) => numberPattern.test(part)) &&
    parts.every((part) => Number.isFinite(Number(part))) &&
    Number(parts[2]) > 0 &&
    Number(parts[3]) > 0
  )
}

const safeAttribute = (name: string, rawValue: string) => {
  if (rawValue.length > MAX_SOCIAL_ICON_SVG_LENGTH) return false
  const value = rawValue.trim()
  if (name === 'id') return idPattern.test(value)
  if (name === 'viewBox') return safeViewBox(value)
  if (name === 'd' || name === 'points' || name === 'stroke-dasharray') {
    return pathDataPattern.test(value)
  }
  if (name === 'transform' || name === 'gradientTransform') {
    return transformPattern.test(value)
  }
  if (name === 'fill' || name === 'stroke' || name === 'stop-color') {
    return colorPattern.test(value)
  }
  if (name === 'clip-path' || name === 'mask') {
    return value === 'none' || localUrlPattern.test(value)
  }
  if (lengthAttributes.has(name)) return lengthPattern.test(value)
  if (opacityAttributes.has(name)) {
    return numberPattern.test(value) && Number(value) >= 0 && Number(value) <= 1
  }
  if (name === 'preserveAspectRatio') return preserveAspectRatios.has(value)
  return enumAttributes[name]?.has(value) ?? false
}

/** Returns sanitized, inline-safe markup, or an empty string for invalid SVG. */
export const sanitizeSocialIconSvg = (source: string): string => {
  const normalized = source.trim()
  if (
    !normalized ||
    normalized.length > MAX_SOCIAL_ICON_SVG_LENGTH ||
    /<!\s*(?:DOCTYPE|ENTITY)/i.test(normalized) ||
    typeof DOMParser === 'undefined'
  ) {
    return ''
  }

  const parsed = new DOMParser().parseFromString(normalized, 'image/svg+xml')
  const sourceRoot = parsed.documentElement
  if (
    sourceRoot.localName !== 'svg' ||
    (sourceRoot.namespaceURI !== null &&
      sourceRoot.namespaceURI !== SVG_NAMESPACE)
  ) {
    return ''
  }

  const viewBox = sourceRoot.getAttribute('viewBox')
  if (!viewBox || !safeViewBox(viewBox)) return ''

  const cleanDocument = document.implementation.createDocument(
    SVG_NAMESPACE,
    'svg',
    null,
  )
  const cleanRoot = cleanDocument.documentElement
  cleanRoot.setAttribute('viewBox', viewBox.trim())
  for (const attribute of Array.from(sourceRoot.attributes)) {
    if (
      attribute.namespaceURI === null &&
      attribute.name !== 'viewBox' &&
      svgAttributes.has(attribute.name) &&
      safeAttribute(attribute.name, attribute.value)
    ) {
      cleanRoot.setAttribute(attribute.name, attribute.value.trim())
    }
  }

  let elementCount = 1
  let exceededElementLimit = false
  const copyChildren = (
    sourceElement: Element,
    cleanElement: Element,
    depth: number,
  ) => {
    if (depth > 16) return
    for (const child of Array.from(sourceElement.children)) {
      if (
        !svgTags.has(child.localName) ||
        child.localName === 'svg' ||
        (child.namespaceURI !== null && child.namespaceURI !== SVG_NAMESPACE)
      ) {
        continue
      }
      elementCount += 1
      if (elementCount > 256) {
        exceededElementLimit = true
        return
      }
      const cleanChild = cleanDocument.createElementNS(
        SVG_NAMESPACE,
        child.localName,
      )
      for (const attribute of Array.from(child.attributes)) {
        if (
          attribute.namespaceURI === null &&
          svgAttributes.has(attribute.name) &&
          safeAttribute(attribute.name, attribute.value)
        ) {
          cleanChild.setAttribute(attribute.name, attribute.value.trim())
        }
      }
      cleanElement.append(cleanChild)
      copyChildren(child, cleanChild, depth + 1)
    }
  }
  copyChildren(sourceRoot, cleanRoot, 1)
  if (exceededElementLimit) return ''

  cleanRoot.setAttribute('aria-hidden', 'true')
  cleanRoot.setAttribute('focusable', 'false')
  const sanitized = new XMLSerializer().serializeToString(cleanRoot)
  return sanitized.length <= MAX_SOCIAL_ICON_SVG_LENGTH ? sanitized : ''
}
