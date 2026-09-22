import { isSafeContentUrl } from './markdown-safety'

export interface MarkdownPolicyReport {
  rawHtmlTags: number
  unsafeImages: number
  unsafeLinks: number
}

const TAG_PATTERN = /^<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*?)?\/?>/
const COMMENT_PATTERN = /^<!--[\s\S]*?-->/
const DECLARATION_PATTERN = /^<![A-Za-z][^<>]*>/
const PROCESSING_PATTERN = /^<\?[^<>]*\?>/
const AUTOLINK_PATTERN =
  /^<(?:[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^<>\s]+|[^<>\s@]+@[^<>\s]+\.[^<>\s]+)>/
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/
const INDENTED_CODE = /^(?: {4}|\t)/

interface Counter {
  count: number
}

const findClosingBackticks = (
  text: string,
  from: number,
  length: number,
): number => {
  for (let index = from; index < text.length; index += 1) {
    if (text[index] !== '`') continue
    let run = 0
    while (text[index + run] === '`') run += 1
    if (run === length) return index
    index += run - 1
  }
  return -1
}

const replaceTags = (
  text: string,
  replace: (tag: string) => string,
  counter: Counter,
  keepCode = true,
): string => {
  let result = ''
  let index = 0
  while (index < text.length) {
    const character = text[index]!
    if (character === '`') {
      let run = 0
      while (text[index + run] === '`') run += 1
      const closing = findClosingBackticks(text, index + run, run)
      if (closing === -1) {
        result += text.slice(index, index + run)
        index += run
      } else {
        if (keepCode) result += text.slice(index, closing + run)
        index = closing + run
      }
      continue
    }
    if (character !== '<') {
      result += character
      index += 1
      continue
    }

    const rest = text.slice(index)
    const autolink = AUTOLINK_PATTERN.exec(rest)
    if (autolink) {
      result += autolink[0]
      index += autolink[0].length
      continue
    }
    const tag =
      TAG_PATTERN.exec(rest) ??
      COMMENT_PATTERN.exec(rest) ??
      DECLARATION_PATTERN.exec(rest) ??
      PROCESSING_PATTERN.exec(rest)
    if (tag) {
      result += replace(tag[0])
      counter.count += 1
      index += tag[0].length
      continue
    }
    if (rest.startsWith('<!--')) {
      result += replace('<')
      counter.count += 1
      index += 1
      continue
    }
    result += character
    index += 1
  }
  return result
}

const mapMarkdownLines = (
  source: string,
  transform: (line: string) => string,
  keepCode = true,
) => {
  const output: string[] = []
  let fence: { character: string; length: number } | null = null

  for (const line of source.split('\n')) {
    if (fence) {
      if (keepCode) output.push(line)
      const marker = fence.character === '`' ? '`' : '~'
      if (new RegExp(`^ {0,3}${marker}{${fence.length},}\\s*$`).test(line)) {
        fence = null
      }
      continue
    }

    const opening = FENCE_OPEN.exec(line)
    if (opening) {
      fence = { character: opening[1]![0]!, length: opening[1]!.length }
      if (keepCode) output.push(line)
      continue
    }

    if (INDENTED_CODE.test(line)) {
      if (keepCode) output.push(line)
      continue
    }

    output.push(transform(line))
  }

  return output.join('\n')
}

export const escapeRawHtmlTags = (
  source: string,
): { escapedTags: number; source: string } => {
  const counter: Counter = { count: 0 }
  const escaped = mapMarkdownLines(source, (line) =>
    replaceTags(line, (tag) => `&lt;${tag.slice(1)}`, counter),
  )

  return { escapedTags: counter.count, source: escaped }
}

const stripCodeRegions = (source: string) =>
  mapMarkdownLines(
    source,
    (line) => replaceTags(line, () => '', { count: 0 }, false),
    false,
  )

const LINK_OR_IMAGE = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)/g
const REFERENCE_DEFINITION = /^\s*\[(?!\^)[^\]]+\]:\s*(\S+)/gm
const FOOTNOTE_DEFINITION = /^(\s{0,3})\[(\^[^\]]+)\]:/

export const inspectMarkdownPolicy = (source: string): MarkdownPolicyReport => {
  const report: MarkdownPolicyReport = {
    rawHtmlTags: escapeRawHtmlTags(source).escapedTags,
    unsafeImages: 0,
    unsafeLinks: 0,
  }

  const scannable = stripCodeRegions(source)
  for (const match of scannable.matchAll(LINK_OR_IMAGE)) {
    const target = (match[3] ?? '').replace(/^<|>$/g, '')
    if (isSafeContentUrl(target)) continue
    if (match[1] === '!') report.unsafeImages += 1
    else report.unsafeLinks += 1
  }
  for (const match of scannable.matchAll(REFERENCE_DEFINITION)) {
    if (!isSafeContentUrl((match[1] ?? '').replace(/^<|>$/g, ''))) {
      report.unsafeLinks += 1
    }
  }

  return report
}

export const literalizeFootnoteDefinitions = (source: string) =>
  mapMarkdownLines(source, (line) =>
    line.replace(FOOTNOTE_DEFINITION, '$1\\[$2\\]:'),
  )

export const prepareEditorMarkdown = (source: string) =>
  escapeRawHtmlTags(
    literalizeFootnoteDefinitions(
      source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'),
    ),
  ).source

const DROP_WITH_CONTENT = new Set([
  'applet',
  'audio',
  'base',
  'button',
  'canvas',
  'dialog',
  'embed',
  'form',
  'frame',
  'frameset',
  'iframe',
  'input',
  'link',
  'math',
  'meta',
  'noscript',
  'object',
  'option',
  'script',
  'select',
  'source',
  'style',
  'svg',
  'template',
  'textarea',
  'track',
  'video',
])

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
])

const stripHtmlFallback = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

export const sanitizePastedHtml = (html: string): string => {
  if (typeof DOMParser === 'undefined') {
    return stripHtmlFallback(html)
  }

  const document = new DOMParser().parseFromString(html, 'text/html')
  const walker = document.createTreeWalker(document.body, 1)
  const elements: Element[] = []
  while (walker.nextNode()) {
    elements.push(walker.currentNode as Element)
  }

  for (const element of elements) {
    const tag = element.tagName.toLowerCase()
    if (tag === 'img') {
      const alt = element.getAttribute('alt')?.trim() ?? ''
      element.replaceWith(...(alt ? [document.createTextNode(alt)] : []))
      continue
    }
    if (DROP_WITH_CONTENT.has(tag)) {
      element.remove()
      continue
    }
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes))
      continue
    }

    const href = tag === 'a' ? element.getAttribute('href') : null
    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name)
    }
    if (tag === 'a') {
      if (!href || !isSafeContentUrl(href)) {
        element.replaceWith(...Array.from(element.childNodes))
        continue
      }
      element.setAttribute('href', href)
    }
  }

  return document.body.innerHTML
}
