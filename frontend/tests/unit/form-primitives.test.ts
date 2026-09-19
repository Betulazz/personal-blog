import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import Button from '../../app/components/ui/Button.vue'
import Input from '../../app/components/ui/Input.vue'
import Textarea from '../../app/components/ui/Textarea.vue'

describe('form primitives', () => {
  it('button exposes loading and disabled behavior without firing actions', async () => {
    const wrapper = mount(Button, {
      props: { loading: true },
      slots: { default: '保存更改' },
    })

    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('保存更改')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('input binds its label, description, error and public value event', async () => {
    const wrapper = mount(Input, {
      props: {
        label: '邮箱',
        description: '用于登录通知',
        error: '请输入有效邮箱',
        modelValue: '',
      },
      attrs: { inputmode: 'email', maxlength: '64' },
    })

    const input = wrapper.get('input')
    const id = input.attributes('id')
    expect(wrapper.get('label').attributes('for')).toBe(id)
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain(`${id}-description`)
    expect(input.attributes('aria-describedby')).toContain(`${id}-error`)
    expect(input.attributes('inputmode')).toBe('email')
    expect(input.attributes('maxlength')).toBe('64')
    expect(wrapper.get('.field').attributes('inputmode')).toBeUndefined()
    await input.setValue('hello@example.com')
    expect(wrapper.emitted('update:modelValue')).toEqual([
      ['hello@example.com'],
    ])
  })

  it('textarea exposes the same labeled validation contract', async () => {
    const wrapper = mount(Textarea, {
      props: { label: '简介', modelValue: '初始内容', error: '内容过短' },
      attrs: { maxlength: '280' },
    })

    const textarea = wrapper.get('textarea')
    expect(textarea.element.value).toBe('初始内容')
    expect(textarea.attributes('aria-invalid')).toBe('true')
    expect(textarea.attributes('maxlength')).toBe('280')
    await textarea.setValue('一段完整的简介')
    expect(wrapper.emitted('update:modelValue')).toEqual([['一段完整的简介']])
  })
})
