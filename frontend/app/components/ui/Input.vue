<script setup lang="ts">
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    autocomplete?: string
    description?: string
    disabled?: boolean
    error?: string
    id?: string
    label: string
    modelValue?: string
    name?: string
    placeholder?: string
    required?: boolean
    type?: 'email' | 'password' | 'search' | 'text' | 'url'
  }>(),
  {
    autocomplete: undefined,
    description: undefined,
    disabled: false,
    error: undefined,
    id: undefined,
    modelValue: '',
    name: undefined,
    placeholder: undefined,
    required: false,
    type: 'text',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const generatedId = useId()
const inputId = computed(() => props.id ?? `input-${generatedId}`)
const describedBy = computed(
  () =>
    [
      props.description ? `${inputId.value}-description` : undefined,
      props.error ? `${inputId.value}-error` : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div class="field" :data-invalid="Boolean(error) || undefined">
    <label class="field__label" :for="inputId">{{ label }}</label>
    <p
      v-if="description"
      :id="`${inputId}-description`"
      class="field__description"
    >
      {{ description }}
    </p>
    <input
      v-bind="$attrs"
      :id="inputId"
      class="field__control"
      :type="type"
      :name="name"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="
        emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
    />
    <p v-if="error" :id="`${inputId}-error`" class="field__error">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
@import './field.css';
</style>
