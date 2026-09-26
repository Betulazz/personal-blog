import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PublicCollectionState from '../../app/components/public/PublicCollectionState.vue'
import ChatterCard from '../../app/components/chatter/ChatterCard.vue'
import {
  buildPublicFeedQuery,
  buildPublicFeedRouteQuery,
} from '../../app/utils/public-content'

describe('public feed query contract', () => {
  it('normalizes URL search and tag values without losing linkable state', () => {
    expect(
      buildPublicFeedQuery({
        page: 'not-a-number',
        q: '  夜里  ',
      }),
    ).toEqual({
      page: 1,
      pageSize: 12,
      q: '夜里',
    })

    expect(
      buildPublicFeedRouteQuery({
        page: 1,
        pageSize: 12,
        q: '夜里',
      }),
    ).toEqual({ q: '夜里' })
  })
})

describe('public collection states', () => {
  const global = {
    stubs: {
      NuxtLink: {
        props: { to: { type: String, required: true } },
        template: '<a :href="to"><slot /></a>',
      },
      UiButton: {
        emits: ['click'],
        template:
          '<button aria-label="重新加载" @click="$emit(\'click\')"><slot /></button>',
      },
    },
  }

  it('keeps loading and empty states accessible', () => {
    const loading = mount(PublicCollectionState, {
      global,
      props: { label: '动态', recoveryHref: '/moments', status: 'loading' },
    })
    const empty = mount(PublicCollectionState, {
      global,
      props: { label: '杂谈', recoveryHref: '/chatter', status: 'empty' },
    })

    expect(loading.get('[role="status"]').attributes('aria-busy')).toBe('true')
    expect(loading.text()).toContain('正在加载动态')
    expect(empty.text()).toContain('还没有找到杂谈')
    expect(empty.get('a').attributes('href')).toBe('/chatter')
  })

  it('offers error recovery without exposing internal errors', async () => {
    const wrapper = mount(PublicCollectionState, {
      global,
      props: {
        errorMessage: '内容服务暂时不可用。',
        label: '动态',
        recoveryHref: '/moments',
        status: 'error',
      },
    })

    expect(wrapper.text()).toContain('内容服务暂时不可用。')
    expect(wrapper.text()).not.toContain('SQL secret traceback')
    await wrapper.get('[aria-label="重新加载"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})

describe('Chatter inline content', () => {
  it('renders body-only entries with images and expands long entries accessibly', async () => {
    const body = '随手记下的想法。'.repeat(50)
    const wrapper = mount(ChatterCard, {
      global: {
        stubs: {
          UiGlassCard: { template: '<article><slot /></article>' },
          UiBadge: { template: '<span><slot /></span>' },
          UiButton: { template: '<button><slot /></button>' },
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
      props: {
        chatter: {
          id: '42',
          body,
          publishedAt: '2026-09-24T08:00:00Z',
          images: [
            { src: '/uploads/a.webp', alt: '照片', width: 640, height: 480 },
          ],
        },
      },
    })
    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.get('p').text()).not.toBe(body)
    expect(wrapper.get('img').attributes('alt')).toBe('照片')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('p').text()).toBe(body)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })
  it('bounds search and page values and preserves entry permalinks', () => {
    expect(
      buildPublicFeedQuery({
        q: 'x'.repeat(100),
        page: '999999999999999999999',
      }),
    ).toMatchObject({ q: 'x'.repeat(80), page: 1 })
    expect(
      buildPublicFeedRouteQuery(
        buildPublicFeedQuery({ entry: '42', tag: 'retired' }),
      ),
    ).toEqual({ entry: '42' })
  })
})
