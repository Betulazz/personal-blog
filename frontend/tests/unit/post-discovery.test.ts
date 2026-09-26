import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PostCollectionState from '../../app/components/blog/PostCollectionState.vue'
import {
  buildPostQuery,
  buildPostRouteQuery,
  getPostPageCount,
  isPostQueryPageOutOfRange,
} from '../../app/utils/post-discovery'
import { renderPostMarkdown } from '../../app/utils/post-markdown'

describe('post discovery query contract', () => {
  it('normalizes unsafe and empty URL values to a safe first page', () => {
    expect(
      buildPostQuery({
        page: 'not-a-number',
        q: '  Markdown  ',
        tag: 'unsafe value',
      }),
    ).toEqual({
      page: 1,
      pageSize: 4,
      q: 'Markdown',
    })
  })

  it('keeps path taxonomy filters while preserving linkable query filters', () => {
    const query = buildPostQuery(
      { page: '2', q: 'Nuxt', tag: 'typescript' },
      { tagSlug: 'typescript' },
    )

    expect(query).toEqual({
      page: 2,
      pageSize: 4,
      q: 'Nuxt',
      tag: 'typescript',
    })
    expect(buildPostRouteQuery(query)).toEqual({
      page: '2',
      q: 'Nuxt',
      tag: 'typescript',
    })
  })

  it('rejects partially numeric pagination values instead of truncating them', () => {
    expect(buildPostQuery({ page: '2abc' }).page).toBe(1)
    expect(buildPostQuery({ page: '3.5' }).page).toBe(1)
  })

  it('omits default values from generated links and preserves useful filters', () => {
    expect(
      buildPostRouteQuery({
        page: 1,
        pageSize: 4,
        q: 'Nuxt',
        tag: 'typescript',
      }),
    ).toEqual({ q: 'Nuxt', tag: 'typescript' })
  })
})

describe('Post collection states', () => {
  const global = {
    stubs: {
      NuxtLink: {
        name: 'NuxtLink',
        props: { to: { type: String, required: true } },
        template: '<a :href="to"><slot /></a>',
      },
      UiButton: {
        name: 'UiButton',
        emits: ['click'],
        template:
          '<button aria-label="重新加载" @click="$emit(\'click\')"><slot /></button>',
      },
    },
  }

  it('keeps loading state visible as a skeleton with an accessible status', () => {
    const wrapper = mount(PostCollectionState, {
      global,
      props: { label: '文章', status: 'loading' },
    })

    expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('正在加载文章')
  })

  it('offers recovery for empty, stale-page, not-found and error states', async () => {
    const empty = mount(PostCollectionState, {
      global,
      props: { label: '搜索结果', recoveryHref: '/posts', status: 'empty' },
    })
    const stalePage = mount(PostCollectionState, {
      global,
      props: {
        label: '文章',
        recoveryHref: '/posts?page=2',
        status: 'out-of-range',
      },
    })
    const notFound = mount(PostCollectionState, {
      global,
      props: {
        label: '分类',
        recoveryHref: '/categories',
        status: 'not-found',
      },
    })
    const error = mount(PostCollectionState, {
      global,
      props: { label: '文章', status: 'error' },
    })

    expect(empty.text()).toContain('查看全部文章')
    expect(stalePage.text()).toContain('这一页暂不存在')
    expect(stalePage.text()).toContain('返回可用页面')
    expect(notFound.text()).toContain('没有找到这个分类')
    await error.get('[aria-label="重新加载"]').trigger('click')
    expect(error.emitted('retry')).toHaveLength(1)
  })
})

describe('post discovery pagination contract', () => {
  it('calculates bounded page counts and identifies stale page links', () => {
    expect(getPostPageCount(9, 4)).toBe(3)
    expect(getPostPageCount(0, 4)).toBe(0)
    expect(isPostQueryPageOutOfRange(4, 3)).toBe(true)
    expect(isPostQueryPageOutOfRange(1, 0)).toBe(false)
  })
})

describe('Post collection contracts', () => {
  it('renders Markdown without raw HTML or unsafe links', () => {
    const html = renderPostMarkdown(
      '<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n**safe**',
    )

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('<strong>safe</strong>')
  })
})
