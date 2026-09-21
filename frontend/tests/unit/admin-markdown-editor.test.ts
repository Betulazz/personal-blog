import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'

import { createAdminMarkdownExtensions } from '../../app/utils/admin-markdown-editor'

const editors: Editor[] = []

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy())
})

const createEditor = (content: string) => {
  const editor = new Editor({
    content,
    contentType: 'markdown',
    extensions: createAdminMarkdownExtensions(),
  })
  editors.push(editor)
  return editor
}

describe('admin Markdown editor', () => {
  it('round-trips supported Markdown through Tiptap without losing meaning', () => {
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
    const editor = createEditor(source)
    const serialized = editor.getMarkdown()
    const reloaded = createEditor(serialized)

    expect(serialized).toContain('夜间记录')
    expect(serialized).toContain('保留引用和 **强调**')
    expect(serialized).toContain('```ts')
    expect(serialized).toMatch(/\|\s+能力\s+\|\s+结果/)
    expect(serialized).toContain('内联数学 $x^2 + y^2 = z^2$。')
    expect(serialized).toContain('$$\n\\sum_{i=1}^n i\n$$')
    expect(reloaded.getMarkdown()).toContain('![封面](/uploads/cover.webp)')
    expect(reloaded.getMarkdown()).toContain('$$\n\\sum_{i=1}^n i\n$$')
  })
})
