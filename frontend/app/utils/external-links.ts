const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:'])

export const getSafeExternalUrl = (value?: string) => {
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    return SAFE_EXTERNAL_PROTOCOLS.has(url.protocol)
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}
