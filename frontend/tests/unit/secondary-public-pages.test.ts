import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ProjectCard from '../../app/components/portfolio/ProjectCard.vue'
import PublicCollectionState from '../../app/components/public/PublicCollectionState.vue'
import PublicPageState from '../../app/components/public/PublicPageState.vue'
import { portfolioFixtureProvider } from '../../app/composables/portfolioFixtures'
import { getSafeExternalUrl } from '../../app/utils/external-links'

describe('secondary public content contracts', () => {
  it('keeps Project metadata complete and Friend Links curated', async () => {
    const projects = await portfolioFixtureProvider.listProjects()
    const friends = await portfolioFixtureProvider.listFriends()

    expect(projects.data).toHaveLength(3)
    expect(projects.data[0]).toMatchObject({
      featured: true,
      sourceUrl: expect.stringMatching(/^https:\/\//),
      status: expect.stringMatching(/^(active|archived|developing)$/),
      timeSpan: expect.any(String),
    })
    expect(projects.data.every((project) => project.stack.length > 0)).toBe(
      true,
    )
    expect(friends.data).toHaveLength(3)
    expect(friends.data.every((friend) => /^https:\/\//.test(friend.url))).toBe(
      true,
    )
    expect(friends.data.every((friend) => friend.avatar !== undefined)).toBe(
      true,
    )
  })

  it('allows only http and https destinations for outbound cards', () => {
    expect(getSafeExternalUrl('https://example.com/project')).toBe(
      'https://example.com/project',
    )
    expect(getSafeExternalUrl('http://example.com/project')).toBe(
      'http://example.com/project',
    )
    expect(getSafeExternalUrl('javascript:alert(1)')).toBeUndefined()
    expect(getSafeExternalUrl('//example.com/project')).toBeUndefined()
  })
})

describe('Project media fallback', () => {
  it('turns an unavailable project logo into an accessible fallback', async () => {
    const wrapper = mount(ProjectCard, {
      global: {
        stubs: {
          UiBadge: { template: '<span><slot /></span>' },
        },
      },
      props: {
        project: {
          description: '一个用于验证媒体恢复的项目。',
          featured: false,
          id: 'project-media-test',
          logo: {
            alt: '测试项目标志',
            height: 100,
            src: '/missing-project-logo.webp',
            width: 100,
          },
          name: 'Missing Logo',
          stack: ['Vue'],
          status: 'active',
          timeSpan: '2026 — 至今',
        },
      },
    })

    await wrapper.get('img').trigger('error')

    expect(wrapper.get('[role="img"]').text()).toContain('媒体暂不可用')
    expect(wrapper.text()).toContain('Missing Logo')
  })
})

describe('secondary page states', () => {
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

  it('keeps loading, empty, and error recovery states observable', async () => {
    const loading = mount(PublicPageState, {
      global,
      props: { label: '关于页面', recoveryHref: '/', status: 'loading' },
    })
    const empty = mount(PublicPageState, {
      global,
      props: { label: '项目', recoveryHref: '/', status: 'empty' },
    })
    const error = mount(PublicPageState, {
      global,
      props: {
        errorMessage: '公开内容暂时不可用。',
        label: '友链',
        recoveryHref: '/friends',
        status: 'error',
      },
    })
    const offline = mount(PublicPageState, {
      global,
      props: { label: '关于页面', recoveryHref: '/', status: 'offline' },
    })

    expect(loading.get('[aria-busy="true"]').text()).toContain(
      '正在加载关于页面',
    )
    expect(empty.text()).toContain('还没有找到项目')
    expect(error.text()).toContain('公开内容暂时不可用。')
    expect(offline.text()).toContain('当前处于离线状态')
    await error.get('[aria-label="重新加载"]').trigger('click')
    expect(error.emitted('retry')).toHaveLength(1)
  })

  it('keeps offline recovery explicit', () => {
    const offline = mount(PublicCollectionState, {
      global,
      props: { label: '项目', recoveryHref: '/projects', status: 'offline' },
    })

    expect(offline.text()).toContain('当前处于离线状态')
    expect(offline.text()).toContain('网络恢复后')
  })
})
