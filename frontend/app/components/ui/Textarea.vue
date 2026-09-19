<script setup lang="ts">
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    description?: string
    disabled?: boolean
    error?: string
    id?: string
    label: string
    modelValue?: string
    name?: string
    placeholder?: string
    required?: boolean
    rows?: number
  }>(),
  {
    description: undefined,
    disabled: false,
    error: undefined,
    id: undefined,
    modelValue: '',
    name: undefined,
    placeholder: undefined,
    required: false,
    rows: 5,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const generatedId = useId()
const textareaId = computed(() => props.id ?? `textarea-${generatedId}`)
const describedBy = computed(
  () =>
    [
      props.description ? `${textareaId.value}-description` : undefined,
      props.error ? `${textareaId.value}-error` : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div class="field" :data-invalid="Boolean(error) || undefined">
    <label class="field__label" :for="textareaId">{{ label }}</label>
    <p
      v-if="description"
      :id="`${textareaId}-description`"
      class="field__description"
    >
      {{ description }}
    </p>
    <textarea
      v-bind="$attrs"
      :id="textareaId"
      class="field__control field__control--textarea"
      :name="name"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="
        emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
    />
    <p v-if="error" :id="`${textareaId}-error`" class="field__error">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
@import './field.css';
</style>
