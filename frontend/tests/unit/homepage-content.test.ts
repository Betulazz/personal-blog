import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import HomeSectionState from '../../app/components/home/HomeSectionState.vue'
import { toHomepageSection } from '../../app/utils/homepage'
import { homepageFixtures } from '../../app/composables/homepageFixtures'

describe('homepage content state', () => {
  it('keeps a stable loading state for a section', () => {
    const wrapper = mount(HomeSectionState, {
      props: { label: '最新文章', status: 'loading' },
    })

    expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('正在加载最新文章')
  })

  it('explains an empty section without collapsing its layout', () => {
    const wrapper = mount(HomeSectionState, {
      props: { label: '最近动态', status: 'empty' },
    })

    expect(wrapper.get('[role="status"]').text()).toContain(
      '这里暂时没有最近动态',
    )
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe(
      'polite',
    )
  })

  it('offers a retry action when a section fails', async () => {
    const wrapper = mount(HomeSectionState, {
      props: {
        errorMessage: '内容服务暂时没有响应。',
        label: '精选项目',
        status: 'error',
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain(
      '内容服务暂时没有响应。',
    )
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('keeps partial content visible while offering recovery', async () => {
    const wrapper = mount(HomeSectionState, {
      props: {
        label: '最近文章',
        status: 'partial-error',
      },
      slots: { default: '<article>已加载的文章</article>' },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain(
      '部分最近文章暂时不可用',
    )
    expect(wrapper.text()).toContain('已加载的文章')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})

describe('homepage fixtures', () => {
  it('preserves separate domain sections and future API-shaped fields', () => {
    expect(homepageFixtures.posts.data[0]).toMatchObject({
      category: { name: expect.any(String), slug: expect.any(String) },
      publishedAt: expect.any(String),
      slug: expect.any(String),
      summary: expect.any(String),
      tags: expect.any(Array),
      title: expect.any(String),
    })
    expect(homepageFixtures.moments.data[0]).toMatchObject({
      body: expect.any(String),
      publishedAt: expect.any(String),
    })
    expect(homepageFixtures.chatter.data[0]).toMatchObject({
      lead: expect.any(String),
      publishedAt: expect.any(String),
      title: expect.any(String),
    })
    expect(homepageFixtures.projects.data[0]).toMatchObject({
      description: expect.any(String),
      selected: true,
      stack: expect.any(Array),
      status: expect.any(String),
    })
  })
})

describe('homepage provider state mapping', () => {
  it('maps complete, empty, loading, and recoverable error responses', () => {
    const response = homepageFixtures.posts
    const emptyResponse = {
      ...response,
      data: [],
      pagination: {
        ...response.pagination,
        pageSize: 0,
        total: 0,
        totalPages: 0,
      },
    }

    expect(toHomepageSection(response, false, null, '最新文章').status).toBe(
      'ready',
    )
    expect(
      toHomepageSection(emptyResponse, false, null, '最新文章').status,
    ).toBe('empty')
    expect(toHomepageSection(response, true, null, '最新文章').status).toBe(
      'loading',
    )
    expect(
      toHomepageSection(
        response,
        false,
        new Error('服务暂时不可用'),
        '最新文章',
      ),
    ).toMatchObject({
      error: { message: '服务暂时不可用' },
      status: 'partial-error',
    })
    expect(
      toHomepageSection(
        emptyResponse,
        false,
        new Error('服务暂时不可用'),
        '最新文章',
      ),
    ).toMatchObject({
      error: { message: '服务暂时不可用' },
      status: 'error',
    })
  })
})
