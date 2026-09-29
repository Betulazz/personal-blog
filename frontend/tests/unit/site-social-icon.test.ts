import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SiteSocialIcon from '../../app/components/SiteSocialIcon.vue'

describe('SiteSocialIcon', () => {
  it('uses a generic decorative icon for missing and unknown presets', () => {
    const missing = mount(SiteSocialIcon)
    const unknown = mount(SiteSocialIcon, {
      props: { icon: { type: 'preset', preset: 'retired-platform' } },
    })

    expect(missing.get('svg.site-social-icon').attributes('aria-hidden')).toBe(
      'true',
    )
    expect(unknown.get('svg.site-social-icon').attributes('aria-hidden')).toBe(
      'true',
    )
  })

  it('falls back if a custom Media Asset cannot load', async () => {
    const wrapper = mount(SiteSocialIcon, {
      props: {
        icon: {
          type: 'media',
          url: '/uploads/images/unavailable.webp',
        },
      },
    })

    await wrapper.get('img.site-social-icon').trigger('error')

    expect(wrapper.find('img.site-social-icon').exists()).toBe(false)
    expect(wrapper.get('svg.site-social-icon').attributes('aria-hidden')).toBe(
      'true',
    )
  })
})
