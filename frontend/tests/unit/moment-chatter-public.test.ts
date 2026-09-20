import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PublicCollectionState from '../../app/components/public/PublicCollectionState.vue'
import MomentCard from '../../app/components/moments/MomentCard.vue'
import { chatterFixtureProvider } from '../../app/composables/chatterFixtures'
import { momentFixtureProvider } from '../../app/composables/momentFixtures'
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
        tag: 'building-notes',
      }),
    ).toEqual({
      page: 1,
      pageSize: 12,
      q: '夜里',
      tag: 'building-notes',
    })

    expect(
      buildPublicFeedRouteQuery({
        page: 1,
        pageSize: 12,
        q: '夜里',
        tag: 'building-notes',
      }),
    ).toEqual({ q: '夜里', tag: 'building-notes' })
  })
})

describe('fixture-backed public content contracts', () => {
  it('keeps Moment fields optional and filters the chronological feed', async () => {
    const response = await momentFixtureProvider.listMoments({
      page: 1,
      pageSize: 12,
    })

    expect(response.data.length).toBeGreaterThanOrEqual(4)
    expect(response.data[0]).toMatchObject({
      body: expect.any(String),
      id: expect.any(String),
      publishedAt: expect.any(String),
      tags: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          slug: expect.any(String),
        }),
      ]),
    })
    expect(response.data.some((moment) => moment.images?.length)).toBe(true)
    expect(response.data.some((moment) => !moment.location)).toBe(true)

    const filtered = await momentFixtureProvider.listMoments({
      page: 1,
      pageSize: 12,
      q: '窗帘',
    })

    expect(filtered.data.map((moment) => moment.id)).toEqual([
      'moment-soft-light',
    ])
  })

  it('keeps Chatter composed and filters by tag independently from Moments', async () => {
    const response = await chatterFixtureProvider.listChatter({
      page: 1,
      pageSize: 12,
      tag: 'typescript',
    })

    expect(response.data).toHaveLength(1)
    expect(response.data[0]).toMatchObject({
      body: expect.any(String),
      mood: expect.any(String),
      title: '先把边界说清楚',
    })
    expect(response.filters).toEqual({ tag: 'typescript' })
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

describe('Moment media fallback', () => {
  it('turns a failed optional image into an accessible fallback', async () => {
    const wrapper = mount(MomentCard, {
      global: {
        stubs: {
          NuxtLink: {
            props: { to: { type: [String, Object], required: true } },
            template: '<a><slot /></a>',
          },
          UiBadge: { template: '<span><slot /></span>' },
        },
      },
      props: {
        moment: {
          body: '一段带有图片的动态。',
          id: 'moment-media-test',
          images: [
            {
              alt: '测试媒体',
              height: 100,
              src: '/missing-image.webp',
              width: 100,
            },
          ],
          publishedAt: '2026-09-18T08:00:00.000Z',
          tags: [{ name: '测试', slug: 'test' }],
        },
      },
    })

    await wrapper.get('img').trigger('error')

    expect(wrapper.get('[role="img"]').text()).toContain('媒体暂不可用')
    expect(wrapper.text()).toContain('一段带有图片的动态。')
  })
})
