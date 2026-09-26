import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ProjectCard from '../../app/components/portfolio/ProjectCard.vue'
import PublicCollectionState from '../../app/components/public/PublicCollectionState.vue'
import PublicPageState from '../../app/components/public/PublicPageState.vue'
import { toPublicAbout } from '../../app/api/client'
import type { PublicSiteSettings } from '../../app/types/site'
import { getSafeExternalUrl } from '../../app/utils/external-links'

describe('secondary public content contracts', () => {
  it('maps live Site Identity About settings without a frontend fixture', () => {
    const settings: PublicSiteSettings = {
      about: {
        interests: ['独立产品'],
        skills: [{ items: ['TypeScript'], name: '界面与体验' }],
        story: ['来自公开配置的故事。'],
        timeline: [
          {
            description: '从 API 读取。',
            period: '2026',
            title: '公开配置',
          },
        ],
      },
      backgroundGallery: [],
      contact: { email: 'live@example.com', note: '欢迎来信。' },
      description: '站点描述',
      footer: { copyright: '', icp: '', note: '页脚说明' },
      homepageVisibility: {
        chatter: true,
        friends: true,
        music: true,
        moments: true,
        posts: true,
        projects: true,
      },
      name: '夜航手记',
      profile: '公开简介',
      socialLinks: [],
      tagline: '公开配置',
    }

    expect(toPublicAbout(settings)).toMatchObject({
      contact: settings.contact,
      interests: ['独立产品'],
      name: '夜航手记',
      profile: '公开简介',
      story: ['来自公开配置的故事。'],
      timeline: [{ period: '2026', title: '公开配置' }],
    })
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
          projectType: 'personal',
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

describe('GitHub Open-source Project presentation', () => {
  it('shows a safe repository destination without Personal Project metadata', () => {
    const wrapper = mount(ProjectCard, {
      global: {
        stubs: {
          UiBadge: { template: '<span><slot /></span>' },
        },
      },
      props: {
        project: {
          description: '人工维护的开源仓库介绍。',
          featured: true,
          id: 'github-project-test',
          name: 'Open Source Archive',
          projectType: 'github_open_source',
          repositoryUrl: 'https://github.com/example/open-source-archive',
        },
      },
    })

    const repositoryLink = wrapper.get('a')
    expect(wrapper.text()).toContain('GitHub 开源')
    expect(repositoryLink.attributes('href')).toBe(
      'https://github.com/example/open-source-archive',
    )
    expect(repositoryLink.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.find('.project-card__meta').exists()).toBe(false)
    expect(wrapper.find('.project-card__stack').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('开发时间')
    expect(wrapper.text()).not.toContain('暂无公开演示')
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
