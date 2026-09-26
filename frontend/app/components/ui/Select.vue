<script setup lang="ts">
import { Check, ChevronDown } from 'lucide-vue-next'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

export interface SelectOption {
  disabled?: boolean
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    description?: string
    disabled?: boolean
    error?: string
    id?: string
    label: string
    modelValue?: string
    name?: string
    options: SelectOption[]
    placeholder?: string
    required?: boolean
  }>(),
  {
    description: undefined,
    disabled: false,
    error: undefined,
    id: undefined,
    modelValue: undefined,
    name: undefined,
    placeholder: '请选择',
    required: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const generatedId = useId()
const selectId = computed(() => props.id ?? `select-${generatedId}`)
const describedBy = computed(
  () =>
    [
      props.description ? `${selectId.value}-description` : undefined,
      props.error ? `${selectId.value}-error` : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div class="field" :data-invalid="Boolean(error) || undefined">
    <label :id="`${selectId}-label`" class="field__label">{{ label }}</label>
    <p
      v-if="description"
      :id="`${selectId}-description`"
      class="field__description"
    >
      {{ description }}
    </p>
    <SelectRoot
      :model-value="modelValue"
      :name="name"
      :required="required"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', String($event))"
    >
      <SelectTrigger
        v-bind="$attrs"
        :id="selectId"
        class="field__control select__trigger"
        :aria-labelledby="`${selectId}-label`"
        :aria-describedby="describedBy"
        :aria-invalid="error ? 'true' : undefined"
      >
        <SelectValue :placeholder="placeholder" />
        <SelectIcon class="select__icon">
          <ChevronDown :size="16" aria-hidden="true" />
        </SelectIcon>
      </SelectTrigger>
      <SelectPortal>
        <SelectContent
          class="select__content"
          position="popper"
          :side-offset="8"
        >
          <SelectViewport class="select__viewport">
            <SelectItem
              v-for="option in options"
              :key="option.value"
              class="select__item"
              :value="option.value"
              :disabled="option.disabled"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator class="select__indicator">
                <Check :size="16" aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
    <p v-if="error" :id="`${selectId}-error`" class="field__error">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
@import './field.css';

.select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: start;
  cursor: pointer;
}

.select__trigger[data-placeholder] {
  color: var(--color-text-subtle);
}

.select__icon {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--color-text-subtle);
}

:global(.select__content) {
  z-index: var(--z-overlay);
  min-width: var(--reka-select-trigger-width);
  max-height: min(20rem, var(--reka-select-content-available-height));
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  box-shadow: var(--shadow-panel), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-panel));
  transform-origin: var(--reka-select-content-transform-origin);
  animation: overlay-enter var(--motion-duration-normal)
    var(--motion-ease-emphasized);
}

:global(.select__viewport) {
  padding: var(--space-2);
}

:global(.select__item) {
  position: relative;
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  padding: var(--space-2) var(--space-10) var(--space-2) var(--space-3);
  border-radius: var(--radius-small);
  color: var(--color-text-muted);
  outline: none;
  cursor: pointer;
}

:global(.select__item[data-highlighted]) {
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

:global(.select__item[data-disabled]) {
  opacity: 0.45;
  cursor: not-allowed;
}

:global(.select__indicator) {
  position: absolute;
  right: var(--space-3);
  display: inline-flex;
  color: var(--color-accent-soft);
}

@keyframes overlay-enter {
  from {
    opacity: 0;
    transform: translateY(calc(var(--motion-distance-small) * -1));
  }
}
</style>
