const SAFE_LINK_SCHEME = /^(?:https?:|mailto:|tel:)/i
const SAFE_LOCAL_PATH = /^(?:[/.#]|$)/

const hasControlCharacter = (value: string) =>
  [...value].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1f || code === 0x7f
  })

const decodeUri = (value: string): string | null => {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

export const isSafeMarkdownUrl = (value: string): boolean => {
  const normalized = value.trim()
  if (!normalized || hasControlCharacter(normalized)) {
    return false
  }

  const decoded = decodeUri(normalized)
  if (decoded === null || hasControlCharacter(decoded)) {
    return false
  }

  return SAFE_LINK_SCHEME.test(decoded) || SAFE_LOCAL_PATH.test(decoded)
}

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

export const isRelativeContentPath = (value: string): boolean => {
  const normalized = value.trim()
  if (
    !normalized ||
    normalized.startsWith('//') ||
    hasControlCharacter(normalized)
  ) {
    return false
  }

  const decoded = decodeUri(normalized)
  if (decoded === null || hasControlCharacter(decoded)) {
    return false
  }

  return !SCHEME.test(decoded)
}

export const isSafeContentUrl = (value: string): boolean =>
  isSafeMarkdownUrl(value) || isRelativeContentPath(value)
