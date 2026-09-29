import { describe, expect, it } from 'vitest'

import { renderPostMarkdownDocument } from '../../app/utils/post-markdown'

describe('post markdown rendering', () => {
  it('renders supported Markdown safely and builds stable heading anchors', async () => {
    const source = [
      '# 中文标题',
      '',
      '## 重复标题',
      '',
      '## 重复标题',
      '',
      '### 第三级标题',
      '',
      '#### 第四级标题',
      '',
      '##### 第五级标题',
      '',
      '###### 第六级标题',
      '',
      '## asdad',
      '',
      '## asdad',
      '',
      '[安全链接](https://example.com)',
      '',
      '<script>alert(1)</script>',
    ].join('\n')
    const document = await renderPostMarkdownDocument(source)

    expect(document.toc).toEqual([
      { id: '中文标题', level: 1, text: '中文标题' },
      { id: '重复标题', level: 2, text: '重复标题' },
      { id: '重复标题-2', level: 2, text: '重复标题' },
      { id: '第三级标题', level: 3, text: '第三级标题' },
      { id: '第四级标题', level: 4, text: '第四级标题' },
      { id: '第五级标题', level: 5, text: '第五级标题' },
      { id: '第六级标题', level: 6, text: '第六级标题' },
      { id: 'asdad', level: 2, text: 'asdad' },
      { id: 'asdad-2', level: 2, text: 'asdad' },
    ])
    expect(document.html).toContain('<h2 id="中文标题">中文标题</h2>')
    expect(document.html).toContain('<h3 id="重复标题-2">重复标题</h3>')
    expect(document.html).toContain('<h4 id="第三级标题">第三级标题</h4>')
    expect(document.html).toContain('<h5 id="第四级标题">第四级标题</h5>')
    expect(document.html).toContain('<h6 id="第五级标题">第五级标题</h6>')
    expect(document.html).toContain('<h6 id="第六级标题">第六级标题</h6>')
    expect(document.html).toContain('<h3 id="asdad">asdad</h3>')
    expect(document.html).toContain('<h3 id="asdad-2">asdad</h3>')
    expect(document.html).not.toContain('<h1')
    expect(source).toContain('# 中文标题')
    expect(document.html).toContain('target="_blank"')
    expect(document.html).toContain('rel="noopener noreferrer"')
    expect(document.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(document.html).not.toContain('<script>')
  })

  it('rejects unsafe links and gives images a recoverable missing-media state', async () => {
    const document = await renderPostMarkdownDocument(
      [
        '[unsafe](javascript:alert(1))',
        '',
        '![Missing media](/uploads/missing.webp)',
      ].join('\n'),
    )

    expect(document.html).not.toContain('href="javascript:')
    expect(document.html).toContain('data-post-media')
    expect(document.html).toContain('data-media-fallback')
    expect(document.html).toContain('Missing media')
  })

  it('renders math and fenced code through the route-scoped enhancement path', async () => {
    const document = await renderPostMarkdownDocument(
      [
        'Inline math $E=mc^2$.',
        '',
        '$$',
        '\\sum_{i=1}^n i = \\frac{n(n+1)}{2}',
        '$$',
        '',
        '```ts',
        'const greeting: string = "你好"',
        '```',
      ].join('\n'),
    )

    expect(document.html).toContain('katex')
    expect(document.html).toContain('shiki')
    expect(document.html).toContain('const')
    expect(document.html).toContain('language-ts')
  })

  it('keeps malformed input and long code lines renderable', async () => {
    const document = await renderPostMarkdownDocument(
      [
        '## Unicode 🌌 内容',
        '',
        '```unknown-language',
        'a'.repeat(240),
        '```',
        '',
        '[broken](https://example.com',
      ].join('\n'),
    )

    expect(document.html).toContain('id="unicode-内容"')
    expect(document.html).toContain('a'.repeat(240))
    expect(document.html).toContain('broken')
  })
})
