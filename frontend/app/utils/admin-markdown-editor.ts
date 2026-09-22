import { Node as TiptapNode, type AnyExtension } from '@tiptap/core'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

import { isSafeContentUrl } from './markdown-safety'

const MathBlock = TiptapNode.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      content: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-math-block': '',
        class: 'markdown-math-block',
      },
      node.attrs.content,
    ]
  },

  markdownTokenName: 'mathBlock',

  parseMarkdown: (token, helpers) =>
    helpers.createNode('mathBlock', {
      content: token.text ?? token.content ?? '',
    }),

  markdownTokenizer: {
    name: 'mathBlock',
    level: 'block' as const,
    start: (source: string) => source.indexOf('$$'),
    tokenize: (source: string) => {
      const match = source.match(/^\$\$\r?\n([\s\S]*?)\r?\n\$\$(?:\r?\n|$)/)
      if (!match) return undefined
      return {
        type: 'mathBlock',
        raw: match[0],
        text: match[1],
      }
    },
  },

  renderMarkdown: (node) => `$$\n${node.attrs?.content ?? ''}\n$$`,
})

const MathInline = TiptapNode.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      content: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        'data-math-inline': '',
        class: 'markdown-math-inline',
      },
      `$${node.attrs.content}$`,
    ]
  },

  markdownTokenName: 'mathInline',

  parseMarkdown: (token, helpers) =>
    helpers.createNode('mathInline', {
      content: token.text ?? token.content ?? '',
    }),

  markdownTokenizer: {
    name: 'mathInline',
    level: 'inline' as const,
    start: (source: string) => source.indexOf('$'),
    tokenize: (source: string) => {
      const match = source.match(/^\$(?!\$)([^$\r\n]+?)\$/)
      if (!match) return undefined
      return {
        type: 'mathInline',
        raw: match[0],
        text: match[1],
      }
    },
  },

  renderMarkdown: (node) => `$${node.attrs?.content ?? ''}$`,
})

const SafeLink = Link.extend({
  renderMarkdown: (node, helpers) => {
    const href = String(node.attrs?.href ?? '')
    const text = helpers.renderChildren(node)
    if (!isSafeContentUrl(href)) return text
    const title = String(node.attrs?.title ?? '')
    const safeTitle = title.replace(/["\r\n]/g, '').trim()
    return safeTitle
      ? `[${text}](${href} "${safeTitle}")`
      : `[${text}](${href})`
  },
})

const SafeImage = Image.extend({
  renderMarkdown: (node) => {
    const src = String(node.attrs?.src ?? '')
    const alt = String(node.attrs?.alt ?? '')
    if (!isSafeContentUrl(src)) return alt
    return `![${alt}](${src})`
  },
})

export const createAdminMarkdownExtensions = (): AnyExtension[] => [
  StarterKit.configure({ link: false }),
  SafeLink.configure({
    isAllowedUri: (url) => Boolean(url) && isSafeContentUrl(url),
    openOnClick: false,
  }),
  SafeImage.configure({ allowBase64: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({ placeholder: '用 Markdown 写下值得留下的内容…' }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  MathBlock,
  MathInline,
  Markdown,
]
