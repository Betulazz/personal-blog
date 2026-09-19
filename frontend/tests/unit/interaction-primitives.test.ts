import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Dialog from '../../app/components/ui/Dialog.vue'
import Dropdown from '../../app/components/ui/Dropdown.vue'
import Select from '../../app/components/ui/Select.vue'
import Sheet from '../../app/components/ui/Sheet.vue'
import Tooltip from '../../app/components/ui/Tooltip.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('accessible interaction primitives', () => {
  it('select exposes a labeled combobox and forwards native control attributes', async () => {
    const onBlur = vi.fn()
    const wrapper = mount(Select, {
      props: {
        label: '默认分类',
        options: [{ label: '前端开发', value: 'frontend' }],
      },
      attrs: { 'data-form-field': 'category', onBlur },
    })

    const combobox = wrapper.get('[role="combobox"]')
    expect(combobox.attributes('aria-labelledby')).toBeDefined()
    expect(combobox.attributes('data-form-field')).toBe('category')
    expect(wrapper.get('.field').attributes('data-form-field')).toBeUndefined()
    await combobox.trigger('blur')
    expect(onBlur).toHaveBeenCalledOnce()
  })

  it.each([
    ['dialog', Dialog, '发布确认'],
    ['sheet', Sheet, '移动端目录'],
  ] as const)(
    '%s exposes its title and visible dialog state',
    async (_, component, title) => {
      mount(component, {
        attachTo: document.body,
        props: { description: '覆盖层描述', open: true, title },
        slots: { default: '可见内容' },
      })

      await Promise.resolve()
      const overlay = document.body.querySelector('[role="dialog"]')
      expect(overlay?.getAttribute('aria-labelledby')).toBeTruthy()
      expect(overlay?.textContent).toContain(title)
      expect(overlay?.textContent).toContain('可见内容')
    },
  )

  it('tooltip exposes visible help text when its trigger receives keyboard focus', async () => {
    const wrapper = mount(Tooltip, {
      attachTo: document.body,
      props: { content: '保存前会检查必填字段', label: '保存帮助' },
    })

    await wrapper.get('button').trigger('focusin')
    await Promise.resolve()
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip?.textContent).toContain('保存前会检查必填字段')
    expect(wrapper.get('button').attributes('aria-describedby')).toBeTruthy()
  })

  it('dropdown exposes a named menu trigger through its public label', () => {
    const wrapper = mount(Dropdown, {
      props: {
        label: '更多操作',
        items: [{ label: '归档文章', value: 'archive' }],
      },
    })

    expect(wrapper.get('button').attributes('aria-label')).toBe('更多操作')
    expect(wrapper.get('button').attributes('aria-haspopup')).toBe('menu')
  })
})
