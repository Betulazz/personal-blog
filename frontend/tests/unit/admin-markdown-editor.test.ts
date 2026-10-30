import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'

import {
  escapeRawHtmlTags,
  inspectMarkdownPolicy,
  looksLikeMarkdown,
  prepareEditorMarkdown,
  sanitizePastedHtml,
} from '../../app/utils/admin-markdown-editor-policy'
import { createAdminMarkdownExtensions } from '../../app/utils/admin-markdown-editor'
import {
  isRelativeContentPath,
  isSafeContentUrl,
  isSafeMarkdownUrl,
} from '../../app/utils/markdown-safety'
import { extractPostToc } from '../../app/utils/post-markdown'
import { markdownRoundTripFixtures } from '../fixtures/markdown-round-trip'

const editors: Editor[] = []

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy())
})

const createEditor = (content: string) => {
  const editor = new Editor({
    content: prepareEditorMarkdown(content),
    contentType: 'markdown',
    extensions: createAdminMarkdownExtensions(),
  })
  editors.push(editor)
  return editor
}

const words = (value: string) => value.match(/[\p{Letter}\p{Number}]+/gu) ?? []

describe('admin Markdown editor round trips', () => {
  for (const fixture of markdownRoundTripFixtures) {
    it(`${fixture.name} [${fixture.category}]`, () => {
      const editor = createEditor(fixture.markdown)
      const serialized = editor.getMarkdown()
      const reloaded = createEditor(serialized)

      expect(reloaded.getMarkdown()).toBe(serialized)
      for (const expected of fixture.contains) {
        expect(serialized).toContain(expected)
      }
      for (const rejected of fixture.rejects ?? []) {
        expect(serialized).not.toContain(rejected)
      }
      if (fixture.contentLossGuard !== false) {
        for (const word of words(fixture.markdown)) {
          expect(serialized, `${fixture.name} keeps "${word}"`).toContain(word)
        }
      }
      if (fixture.expectTocStable !== false) {
        expect(extractPostToc(serialized)).toEqual(
          extractPostToc(fixture.markdown),
        )
      }
    })
  }

  it('keeps a canonical document stable across repeated load and save cycles', () => {
    const source = [
      '# 夜间记录',
      '',
      '> 保留引用和 **强调**。',
      '',
      '- 便携',
      '- 可迁移',
      '',
      '`inline code`',
      '',
      '```ts',
      'const answer = 42',
      '```',
      '',
      '| 能力 | 结果 |',
      '| --- | --- |',
      '| 表格 | 保留 |',
      '',
      '[链接](https://example.com)',
      '',
      '![封面](/uploads/cover.webp)',
      '',
      '内联数学 $x^2 + y^2 = z^2$。',
      '',
      '$$',
      '\\sum_{i=1}^n i',
      '$$',
    ].join('\n')
    const first = createEditor(source).getMarkdown()
    const second = createEditor(first).getMarkdown()
    const third = createEditor(second).getMarkdown()

    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(first).toContain('夜间记录')
    expect(first).toContain('![封面](/uploads/cover.webp)')
    expect(first).toContain('内联数学 $x^2 + y^2 = z^2$。')
  })

  it('preserves stable heading anchors so the public TOC survives a save cycle', () => {
    const source = [
      '# 标题一',
      '',
      '## 重复标题',
      '',
      '## 重复标题',
      '',
      '### 标题（含标点）与 `code` $x^2$',
    ].join('\n')
    const before = extractPostToc(source)
    const after = extractPostToc(createEditor(source).getMarkdown())

    expect(after).toEqual(before)
    expect(after.map((item) => item.id)).toEqual([
      '标题一',
      '重复标题',
      '重复标题-2',
      '标题-含标点-与-code-x-2',
    ])
  })
})

describe('admin Markdown editor safe policy', () => {
  it('detects Markdown while leaving ordinary pasted text to the editor', () => {
    for (const source of [
      '# 标题',
      '- 列表',
      '正文 **粗体** 和 *斜体*',
      '[链接](https://example.com)',
      '```ts\nconst x = 1\n```',
      '| 列 | 值 |\n| --- | --- |\n| 一 | 二 |',
      '公式 $x^2$',
    ]) {
      expect(looksLikeMarkdown(source), source).toBe(true)
    }
    for (const source of ['普通文字', '#话题', '价格 $20', '2 * 3 = 6']) {
      expect(looksLikeMarkdown(source), source).toBe(false)
    }
  })

  it('neutralizes unsafe links instead of storing them', () => {
    const editor = createEditor(
      '[危险](javascript:alert(1)) 与 [数据](data:text/html;base64,PHNjcmlwdD4=)',
    )
    const serialized = editor.getMarkdown()

    expect(serialized).not.toContain('javascript:')
    expect(serialized).not.toContain('data:text/html')
    expect(serialized).toContain('危险')
    expect(serialized).toContain('数据')
  })

  it('refuses to apply unsafe link commands', () => {
    const editor = createEditor('安全文本')
    editor.commands.selectAll()
    const applied = editor.commands.setLink({ href: 'javascript:alert(1)' })

    expect(applied).toBe(false)
    expect(editor.getMarkdown()).not.toContain('javascript:')
    expect(editor.getMarkdown()).toContain('安全文本')
  })

  it('drops unsafe image sources but keeps their alt text', () => {
    const editor = createEditor('![替代文本](javascript:alert(1))')

    expect(editor.getMarkdown()).toBe('替代文本')
  })

  it('keeps relative links and images instead of destroying them', () => {
    const editor = createEditor(
      '[指南](guide/intro) 与 ![封面](images/cover.webp)',
    )
    const serialized = editor.getMarkdown()

    expect(serialized).toContain('[指南](guide/intro)')
    expect(serialized).toContain('![封面](images/cover.webp)')
  })

  it('keeps Media Asset references untouched and provider-agnostic', () => {
    const editor = createEditor('')
    editor.commands.setImage({
      alt: '封面',
      src: '/uploads/images/2026/09/cover.webp',
    })
    const serialized = editor.getMarkdown()

    expect(serialized).toContain('![封面](/uploads/images/2026/09/cover.webp)')
    expect(serialized).not.toContain('http')
  })

  it('never emits raw HTML tags that could execute when rendered', () => {
    const editor = createEditor(
      '<script>alert(1)</script> <img src="x" onerror="alert(2)"> 安全',
    )
    const serialized = editor.getMarkdown()

    expect(serialized).not.toContain('<script')
    expect(serialized).not.toContain('<img')
    expect(serialized).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(serialized).toContain('安全')
  })

  it('reports the constructs that the policy neutralizes', () => {
    const report = inspectMarkdownPolicy(
      [
        '<div>块</div>',
        '',
        '[链接](vbscript:msgbox(1))',
        '![图片](javascript:alert(1))',
        '',
        '```',
        '<span>代码里的标签不算</span>',
        '```',
      ].join('\n'),
    )

    expect(report).toEqual({
      rawHtmlTags: 2,
      unsafeImages: 1,
      unsafeLinks: 1,
    })
  })

  it('does not count markers inside code fences or inline code', () => {
    const report = inspectMarkdownPolicy(
      ['`<span>` 与 `[x](javascript:1)`', '', '```', '<div>', '```'].join('\n'),
    )

    expect(report).toEqual({
      rawHtmlTags: 0,
      unsafeImages: 0,
      unsafeLinks: 0,
    })
  })
})

describe('content URL safety', () => {
  it('keeps absolute and relative content URLs safe while rejecting schemes', () => {
    expect(isSafeMarkdownUrl('https://example.com/a')).toBe(true)
    expect(isSafeMarkdownUrl('/uploads/a.webp')).toBe(true)
    expect(isSafeMarkdownUrl('guide/intro')).toBe(false)
    expect(isRelativeContentPath('guide/intro')).toBe(true)
    expect(isRelativeContentPath('?page=2')).toBe(true)

    expect(isSafeContentUrl('guide/intro')).toBe(true)
    expect(isSafeContentUrl('https://example.com/a')).toBe(true)
    expect(isSafeContentUrl('/posts/x')).toBe(true)
    expect(isSafeContentUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeContentUrl('java%73cript:alert(1)')).toBe(false)
    expect(isSafeContentUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isSafeContentUrl('//cdn.example.com/x')).toBe(true)
    expect(isSafeContentUrl('guide/ja\nvascript:alert(1)')).toBe(false)
  })
})

describe('markdown safety helpers', () => {
  it('normalizes BOM and CRLF without touching code content', () => {
    const source = '\uFEFF# 标题\r\n\r\n```\r\n<div>代码</div>\r\n```\r\n'

    expect(prepareEditorMarkdown(source)).toBe(
      '# 标题\n\n```\n<div>代码</div>\n```\n',
    )
  })

  it('escapes tag-like text outside code and autolinks', () => {
    const escaped = escapeRawHtmlTags(
      [
        '<div>a</div>',
        '<https://example.com>',
        '作者 <owner@example.com>',
      ].join('\n'),
    )

    expect(escaped.escapedTags).toBe(2)
    expect(escaped.source).toContain('&lt;div>a&lt;/div>')
    expect(escaped.source).toContain('<https://example.com>')
    expect(escaped.source).toContain('<owner@example.com>')
  })

  it('drops active pasted HTML while keeping safe formatting and text', () => {
    expect(sanitizePastedHtml('<script>alert(1)</script>你好')).toBe('你好')
    expect(sanitizePastedHtml('<script>alert(1)</script>你好')).not.toContain(
      'alert',
    )
    expect(sanitizePastedHtml('<iframe src="https://x.test"></iframe>')).toBe(
      '',
    )
    expect(
      sanitizePastedHtml('<img src="https://x.test/a.png" alt="封面">'),
    ).toBe('封面')
    expect(sanitizePastedHtml('<img src="https://x.test/a.png">')).toBe('')
    expect(sanitizePastedHtml('<a href="javascript:alert(1)">文字</a>')).toBe(
      '文字',
    )
    expect(
      sanitizePastedHtml(
        '<a href="https://example.com" onclick="alert(1)">站点</a>',
      ),
    ).toBe('<a href="https://example.com">站点</a>')
    expect(sanitizePastedHtml('<div style="color:red"><p>段落</p></div>')).toBe(
      '<p>段落</p>',
    )
    expect(sanitizePastedHtml('<strong>粗体</strong> 与 <em>斜体</em>')).toBe(
      '<strong>粗体</strong> 与 <em>斜体</em>',
    )
  })
})
