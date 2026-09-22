import type { MarkdownPolicyReport } from '../../app/utils/admin-markdown-editor-policy'

export interface MarkdownRoundTripFixture {
  category:
    | 'code'
    | 'heading'
    | 'image'
    | 'malformed'
    | 'math'
    | 'policy'
    | 'quote'
    | 'table'
    | 'toc'
    | 'unicode'
    | 'unsupported'
  contains: string[]
  contentLossGuard?: boolean
  expectTocStable?: boolean
  markdown: string
  name: string
  policy?: Partial<MarkdownPolicyReport>
  rejects?: string[]
}

export const markdownRoundTripFixtures: MarkdownRoundTripFixture[] = [
  {
    category: 'heading',
    contains: [
      '# 夜间记录',
      '## 重复的小节',
      '## 重复的小节',
      '### 标题（含标点）、`code` 与 $x^2$',
      '#### Emoji 🚀 与 العربية',
    ],
    markdown: [
      '# 夜间记录',
      '',
      '## 重复的小节',
      '',
      '## 重复的小节',
      '',
      '### 标题（含标点）、`code` 与 $x^2$',
      '',
      '#### Emoji 🚀 与 العربية',
    ].join('\n'),
    name: 'headings with duplicates, CJK punctuation, inline code and math',
  },
  {
    category: 'toc',
    contains: [
      '# 文档结构',
      '## 重复标题',
      '## 重复标题',
      '### 标题（含标点）与 `code` $x^2$',
      '#### Emoji 🚀 与 العربية',
    ],
    markdown: [
      '# 文档结构',
      '',
      '## 重复标题',
      '',
      '## 重复标题',
      '',
      '### 标题（含标点）与 `code` $x^2$',
      '',
      '#### Emoji 🚀 与 العربية',
    ].join('\n'),
    name: 'TOC anchors stay stable for duplicate, styled, and Unicode headings',
  },
  {
    category: 'heading',
    contains: ['## 引用里的标题'],
    markdown: ['```md', '## 引用里的标题', '```'].join('\n'),
    name: 'heading-looking lines inside fenced code stay code',
  },
  {
    category: 'code',
    contains: [
      '```ts',
      'const tag = "<div class=\\"card\\">"',
      'const math = "$$ not a block $$"',
      '```',
      '```',
      'unclosed fence',
      '```',
    ],
    markdown: [
      '```ts',
      'const tag = "<div class=\\"card\\">"',
      'const math = "$$ not a block $$"',
      '```',
      '',
      '```',
      'unclosed fence',
    ].join('\n'),
    name: 'fenced code keeps raw HTML and math markers intact',
  },
  {
    category: 'quote',
    contains: ['> 保留引用和 **强调**。', '> > 嵌套引用'],
    markdown: ['> 保留引用和 **强调**。', '>', '> > 嵌套引用'].join('\n'),
    name: 'quotes and nesting',
  },
  {
    category: 'quote',
    contains: ['- [ ] 任务一', '- [x] 任务二'],
    markdown: [
      '- [ ] 任务一',
      '- [x] 任务二',
      '',
      '- 普通列表项',
      '',
      '1. 有序一',
      '2. 有序二',
    ].join('\n'),
    name: 'task lists and ordered lists',
  },
  {
    category: 'table',
    contains: [
      '| 能力  | 结果  |',
      '| --- | --- |',
      '| 可读  | 保留  |',
      '| 表格  | 稳定  |',
    ],
    markdown: [
      '| 能力 | 结果 |',
      '| --- | --- |',
      '| 可读 | 保留 |',
      '| 表格 | 稳定 |',
    ].join('\n'),
    name: 'GFM table with CJK content',
  },
  {
    category: 'image',
    contains: [
      '[站内文章](/posts/spatial-notes)',
      '[外部链接](https://example.com/notes)',
      '[邮件](mailto:owner@example.com)',
      '[片段](#夜间记录)',
    ],
    markdown: [
      '[站内文章](/posts/spatial-notes)',
      '',
      '[外部链接](https://example.com/notes)',
      '',
      '[邮件](mailto:owner@example.com)',
      '',
      '[片段](#夜间记录)',
    ].join('\n'),
    name: 'supported link targets survive',
  },
  {
    category: 'image',
    contains: [
      '![封面](/uploads/images/2026/09/cover.webp)',
      '![外部图片](https://example.com/cover.webp)',
    ],
    markdown: [
      '![封面](/uploads/images/2026/09/cover.webp)',
      '',
      '![外部图片](https://example.com/cover.webp)',
    ].join('\n'),
    name: 'media references and external images survive',
  },
  {
    category: 'math',
    contains: [
      '行内数学 $x^2 + y^2 = z^2$。',
      '$$\n\\sum_{i=1}^n i = \\frac{n(n+1)}{2}\n$$',
    ],
    markdown: [
      '行内数学 $x^2 + y^2 = z^2$。',
      '',
      '$$',
      '\\sum_{i=1}^n i = \\frac{n(n+1)}{2}',
      '$$',
    ].join('\n'),
    name: 'inline and block math',
  },
  {
    category: 'unicode',
    contains: [
      '霓虹 ✨ café e\u0301 日本語 العربية',
      '全角标点：，。！？（）【】',
      'emoji 家族：👨‍👩‍👧‍👦',
    ],
    markdown: [
      '霓虹 ✨ café e\u0301 日本語 العربية',
      '',
      '全角标点：，。！？（）【】',
      '',
      'emoji 家族：👨‍👩‍👧‍👦',
    ].join('\n'),
    name: 'Unicode, combining marks, CJK punctuation and emoji',
  },
  {
    category: 'policy',
    contains: ['&lt;script&gt;alert(1)&lt;/script&gt;'],
    markdown: '正文 <script>alert(1)</script> 之后',
    name: 'disallowed raw HTML is kept as literal text',
    policy: { rawHtmlTags: 2 },
    rejects: ['<script', '</script'],
  },
  {
    category: 'policy',
    contains: ['&lt;div class="card"&gt;内容&lt;/div&gt;'],
    markdown: '<div class="card">内容</div>',
    name: 'raw HTML blocks never execute or get dropped',
    policy: { rawHtmlTags: 2 },
    rejects: ['<div'],
  },
  {
    category: 'policy',
    contains: ['https://example.com/auto'],
    markdown: '<https://example.com/auto>',
    name: 'autolinks stay links instead of literalized tags',
    rejects: ['&lt;https'],
  },
  {
    category: 'policy',
    contains: ['安全文本', '普通文字'],
    contentLossGuard: false,
    markdown: [
      '[安全文本](javascript:alert(1)) 后面继续',
      '',
      '![普通文字](java%73cript:alert(1))',
      '',
      '[数据链接](data:text/html;base64,PHNjcmlwdD4=)',
    ].join('\n'),
    name: 'unsafe links and images are neutralized on save',
    policy: { unsafeImages: 1, unsafeLinks: 2 },
    rejects: ['javascript:', 'java%73cript:', 'data:text/html'],
  },
  {
    category: 'policy',
    contains: ['参考链接', '不安全参考', 'https://example.com/notes'],
    contentLossGuard: false,
    markdown: [
      '[参考链接][safe]',
      '',
      '[safe]: https://example.com/notes',
      '',
      '[不安全参考][bad]',
      '',
      '[bad]: javascript:alert(1)',
    ].join('\n'),
    name: 'reference-style links resolve safely or stay literal text',
    policy: { unsafeLinks: 1 },
    rejects: ['javascript:'],
  },
  {
    category: 'malformed',
    contains: [
      '\\*\\*未闭合的强调',
      '尾随反斜杠 \\\\',
      '| 只有表头 |',
      '| ---- |',
      '| 没有结束 |',
      '```',
      '未闭合的围栏',
      '```',
    ],
    markdown: [
      '**未闭合的强调',
      '',
      '尾随反斜杠 \\',
      '',
      '| 只有表头 |',
      '| --- |',
      '| 没有结束',
      '',
      '```',
      '未闭合的围栏',
    ].join('\n'),
    name: 'malformed Markdown loads without throwing and keeps its text',
  },
  {
    category: 'unsupported',
    contains: ['脚注引用\\[^1\\]', '\\[^1\\]: 脚注内容'],
    markdown: ['脚注引用[^1]', '', '[^1]: 脚注内容'].join('\n'),
    name: 'footnote syntax is preserved as visible text instead of being dropped',
  },
  {
    category: 'unsupported',
    contains: [
      '==高亮==',
      '&lt;details&gt;&lt;summary&gt;折叠&lt;/summary&gt;内容&lt;/details&gt;',
      '{{ 组件 }}',
      '&lt;!-- 注释 --&gt;',
    ],
    markdown: [
      '==高亮== 不是受支持的 Markdown 扩展。',
      '',
      '<details><summary>折叠</summary>内容</details>',
      '',
      '{{ 组件 }} 与 <!-- 注释 --> 保持为文本。',
    ].join('\n'),
    name: 'unsupported extensions remain visible text',
    policy: { rawHtmlTags: 5 },
    rejects: ['<details', '<summary'],
  },
  {
    category: 'unsupported',
    contains: ['定义列表'],
    markdown: ['定义列表', ': 定义内容'].join('\n'),
    name: 'definition lists stay text',
  },
]
