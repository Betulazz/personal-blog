import MarkdownIt from 'markdown-it'
import type { Env, StateBlock, StateInline, Token } from 'markdown-it'

import { isSafeContentUrl } from './markdown-safety'

export interface PostTocItem {
  id: string
  level: number
  text: string
}

export interface RenderedPostMarkdown {
  html: string
  toc: PostTocItem[]
}

interface MarkdownRenderOptions {
  enhance?: boolean
}

const isSafeUrl = isSafeContentUrl

const isExternalHttpUrl = (value: string) => /^https?:\/\//i.test(value)

const slugifyHeading = (text: string) => {
  const slug = text
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}

const inlineText = (tokens: Token[] | null): string =>
  (tokens ?? [])
    .map((token) => {
      if (token.type === 'softbreak' || token.type === 'hardbreak') {
        return ' '
      }
      if (token.type === 'image') {
        return token.attrGet('alt') ?? token.content
      }
      if (token.type === 'math_inline') {
        return token.content
      }
      if (token.children) {
        return inlineText(token.children)
      }
      return token.content
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

const collectDocumentMetadata = (tokens: Token[], env: Env) => {
  const toc: PostTocItem[] = []
  const usedIds = new Map<string, number>()

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    if (token.type !== 'heading_open') {
      continue
    }

    const level = Number(token.tag.slice(1))
    const renderLevel = Math.min(level + 1, 6)
    const renderTag = `h${renderLevel}`
    const inline = tokens[index + 1]
    const text = inline?.type === 'inline' ? inlineText(inline.children) : ''
    const baseId = slugifyHeading(text)
    const occurrence = (usedIds.get(baseId) ?? 0) + 1
    usedIds.set(baseId, occurrence)
    const id = occurrence === 1 ? baseId : `${baseId}-${occurrence}`

    token.attrSet('id', id)
    token.tag = renderTag
    for (
      let closeIndex = index + 1;
      closeIndex < tokens.length;
      closeIndex += 1
    ) {
      const closingToken = tokens[closeIndex]!
      if (closingToken.type === 'heading_close') {
        closingToken.tag = renderTag
        break
      }
    }
    toc.push({ id, level, text })
  }

  env.postToc = toc
}

const parseInlineMath = (state: StateInline, silent: boolean) => {
  const start = state.pos
  if (
    state.src.charCodeAt(start) !== 36 ||
    state.src.charCodeAt(start + 1) === 36
  ) {
    return false
  }

  const end = state.src.indexOf('$', start + 1)
  if (
    end === -1 ||
    end === start + 1 ||
    /\s/.test(state.src.charAt(start + 1))
  ) {
    return false
  }

  const content = state.src.slice(start + 1, end)
  if (/\s$/.test(content) || content.includes('\n')) {
    return false
  }
  if (silent) {
    return true
  }

  const token = state.push('math_inline', 'span', 0)
  token.content = content
  token.markup = '$'
  state.pos = end + 1
  return true
}

const parseBlockMath = (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
) => {
  const start = state.bMarks[startLine]! + state.tShift[startLine]!
  const firstLine = state.src.slice(start, state.eMarks[startLine]!).trim()
  if (firstLine !== '$$') {
    return false
  }

  let nextLine = startLine + 1
  const content: string[] = []
  while (nextLine < endLine) {
    const lineStart = state.bMarks[nextLine]! + state.tShift[nextLine]!
    const line = state.src.slice(lineStart, state.eMarks[nextLine]!)
    if (line.trim() === '$$') {
      break
    }
    content.push(line)
    nextLine += 1
  }

  if (nextLine >= endLine || silent) {
    return nextLine < endLine
  }

  const token = state.push('math_block', 'div', 0)
  token.block = true
  token.content = content.join('\n')
  token.markup = '$$'
  token.map = [startLine, nextLine + 1]
  state.line = nextLine + 1
  return true
}

const createMarkdown = () => {
  const markdown = new MarkdownIt({
    breaks: false,
    html: false,
    linkify: false,
    typographer: false,
  })

  markdown.inline.ruler.after('escape', 'post_math_inline', parseInlineMath)
  markdown.block.ruler.before('fence', 'post_math_block', parseBlockMath)
  markdown.core.ruler.push('post_document_metadata', (state) => {
    collectDocumentMetadata(state.tokens, state.env)
  })

  markdown.renderer.rules.math_inline = (tokens, index) => {
    const token = tokens[index]!
    return (
      (token.meta?.html as string | undefined) ??
      `<span class="post-markdown__math" data-math-source="${markdown.utils.escapeHtml(token.content)}">${markdown.utils.escapeHtml(token.content)}</span>`
    )
  }
  markdown.renderer.rules.math_block = (tokens, index) => {
    const token = tokens[index]!
    return (
      (token.meta?.html as string | undefined) ??
      `<div class="post-markdown__math post-markdown__math--block" data-math-source="${markdown.utils.escapeHtml(token.content)}">${markdown.utils.escapeHtml(token.content)}</div>\n`
    )
  }

  markdown.renderer.rules.link_open = (
    tokens,
    index,
    options,
    _env,
    renderer,
  ) => {
    const token = tokens[index]!
    const href = String(token.attrGet('href') ?? '')
    if (!isSafeUrl(href)) {
      token.attrSet('href', '#')
      token.attrSet('aria-disabled', 'true')
    } else if (isExternalHttpUrl(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }
    return renderer.renderToken(tokens, index, options)
  }

  markdown.renderer.rules.image = (tokens, index) => {
    const token = tokens[index]!
    const src = String(token.attrGet('src') ?? '')
    const alt = markdown.renderer.renderInlineAsText(
      token.children ?? [],
      markdown.options,
      undefined,
    )
    if (!isSafeUrl(src)) {
      return `<span class="post-markdown__media-fallback" data-media-fallback role="img" aria-label="${markdown.utils.escapeHtml(alt || '媒体内容暂不可用')}">媒体内容暂不可用</span>`
    }

    token.attrSet('alt', alt)
    token.attrSet('loading', 'lazy')
    token.attrSet('decoding', 'async')
    token.attrSet('data-post-media', 'true')
    return `<figure class="post-markdown__figure"><img${markdown.renderer.renderAttrs(token)} /><span class="post-markdown__media-fallback" data-media-fallback hidden role="img" aria-label="媒体内容暂不可用">媒体内容暂不可用</span></figure>`
  }

  markdown.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index]!
    const language = token.info.trim().split(/\s+/u)[0] || 'text'
    const highlighted = token.meta?.highlighted as string | undefined
    const dataLanguage = markdown.utils.escapeHtml(language)
    if (highlighted) {
      return `<div class="post-markdown__code language-${dataLanguage}" data-language="${dataLanguage}">${highlighted}</div>\n`
    }

    return `<pre class="post-markdown__code-block"><code class="language-${dataLanguage}">${markdown.utils.escapeHtml(token.content)}</code></pre>\n`
  }

  return markdown
}

const setMathHtml = async (tokens: Token[]) => {
  const { default: katex } = await import('katex')
  for (const token of tokens) {
    if (token.type === 'math_inline' || token.type === 'math_block') {
      token.meta = {
        ...(token.meta ?? {}),
        html: katex.renderToString(token.content, {
          displayMode: token.type === 'math_block',
          output: 'html',
          throwOnError: false,
          trust: false,
        }),
      }
    }
    if (token.children) {
      await setMathHtml(token.children)
    }
  }
}

const normalizeLanguage = (value: string) => {
  const aliases: Record<string, string> = {
    js: 'javascript',
    md: 'markdown',
    py: 'python',
    sh: 'bash',
    ts: 'typescript',
    yml: 'yaml',
  }
  return aliases[value.toLocaleLowerCase()] ?? value.toLocaleLowerCase()
}

type PostHighlighter = Awaited<
  ReturnType<(typeof import('shiki'))['createHighlighter']>
>

let highlighterPromise: Promise<PostHighlighter> | undefined

const getPostHighlighter = async () => {
  if (!highlighterPromise) {
    const { createHighlighter } = await import('shiki')
    highlighterPromise = createHighlighter({
      langs: [
        'bash',
        'css',
        'html',
        'javascript',
        'json',
        'markdown',
        'python',
        'sql',
        'typescript',
        'vue',
        'yaml',
      ],
      themes: ['github-dark'],
    })
  }
  return highlighterPromise
}

const setCodeHtml = async (tokens: Token[]) => {
  const codeTokens = tokens.filter(
    (token) => token.type === 'fence' || token.type === 'code_block',
  )
  if (codeTokens.length === 0) {
    return
  }

  const highlighter = await getPostHighlighter()

  for (const token of codeTokens) {
    const rawLanguage = token.info.trim().split(/\s+/u)[0]
    const language = rawLanguage ? normalizeLanguage(rawLanguage) : 'text'
    let highlighted: string | undefined
    try {
      highlighted = highlighter.codeToHtml(token.content, {
        lang: language,
        theme: 'github-dark',
      })
    } catch {
      highlighted = undefined
    }
    if (highlighted) {
      token.meta = { ...(token.meta ?? {}), highlighted }
    }
  }
}

const renderDocument = async (
  source: string,
  options: MarkdownRenderOptions = {},
): Promise<RenderedPostMarkdown> => {
  const markdown = createMarkdown()
  const env: Env = {}
  const tokens = markdown.parse(source, env)

  if (options.enhance) {
    await Promise.all([setMathHtml(tokens), setCodeHtml(tokens)])
  }

  return {
    html: markdown.renderer.render(tokens, markdown.options, env),
    toc: (env.postToc as PostTocItem[] | undefined) ?? [],
  }
}

export const renderPostMarkdown = (source: string) => {
  const markdown = createMarkdown()
  const env: Env = {}
  const tokens = markdown.parse(source, env)
  return markdown.renderer.render(tokens, markdown.options, env)
}

export const extractPostToc = (source: string): PostTocItem[] => {
  const markdown = createMarkdown()
  const env: Env = {}
  markdown.parse(source, env)
  return (env.postToc as PostTocItem[] | undefined) ?? []
}

export const renderPostMarkdownDocument = (source: string) =>
  renderDocument(source, { enhance: true })
