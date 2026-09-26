export const derivePostDescription = (
  summary: string,
  body: string,
  fallback: string,
): string => {
  const source = summary.trim() || body
  const description = source
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`{1,3}/g, '')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s*/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)

  return description || fallback
}
