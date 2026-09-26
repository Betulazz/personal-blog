import { describe, expect, it } from 'vitest'

import { derivePostDescription } from '../../app/utils/automatic-metadata'

describe('automatic Post descriptions', () => {
  it('uses the ordinary Post summary when present', () => {
    expect(
      derivePostDescription('  一段文章摘要。  ', '# 正文', '站点描述'),
    ).toBe('一段文章摘要。')
  })

  it('derives a readable excerpt from Markdown when summary is empty', () => {
    expect(
      derivePostDescription(
        '',
        '# 长期写作\n\n记录 **重要内容** 与 [链接](https://example.com)。',
        '站点描述',
      ),
    ).toBe('长期写作 记录 重要内容 与 链接。')
  })

  it('falls back to Site Identity text for an empty Post', () => {
    expect(derivePostDescription(' ', '  ', '站点描述')).toBe('站点描述')
  })
})
