<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, watch } from 'vue'

import { createAdminMarkdownExtensions } from '~/utils/admin-markdown-editor'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    modelValue?: string
  }>(),
  {
    disabled: false,
    modelValue: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const editorId = `markdown-editor-${useId()}`
let syncing = false

const editor = useEditor({
  content: props.modelValue,
  contentType: 'markdown',
  editable: !props.disabled,
  extensions: createAdminMarkdownExtensions(),
  editorProps: {
    attributes: {
      'aria-label': 'Markdown 正文',
      'aria-multiline': 'true',
      class: 'admin-markdown-editor__content',
      id: editorId,
    },
  },
  onUpdate: ({ editor: currentEditor }) => {
    if (!syncing) emit('update:modelValue', currentEditor.getMarkdown())
  },
})

const canUndo = computed(() => editor.value?.can().undo() ?? false)
const canRedo = computed(() => editor.value?.can().redo() ?? false)

const run = (command: () => boolean) => {
  if (!editor.value || props.disabled) return
  command()
  editor.value.commands.focus()
}

const setLink = () => {
  if (!editor.value || props.disabled || typeof window === 'undefined') return
  const currentHref = editor.value.getAttributes('link').href ?? ''
  const href = window.prompt('链接地址', currentHref)
  if (href === null) return
  run(() =>
    href.trim()
      ? editor.value!.chain().extendMarkRange('link').setLink({ href }).run()
      : editor.value!.chain().extendMarkRange('link').unsetLink().run(),
  )
}

const insertImage = () => {
  if (!editor.value || props.disabled || typeof window === 'undefined') return
  const src = window.prompt('图片地址')
  if (!src?.trim()) return
  const alt = window.prompt('图片替代文本', '') ?? ''
  run(() => editor.value!.chain().setImage({ alt, src: src.trim() }).run())
}

const insertTable = () => {
  run(() =>
    editor
      .value!.chain()
      .insertTable({ cols: 3, rows: 3, withHeaderRow: true })
      .run(),
  )
}

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value || editor.value.getMarkdown() === value) return
    syncing = true
    editor.value.commands.setContent(value, { contentType: 'markdown' })
    syncing = false
  },
)

watch(
  () => props.disabled,
  (disabled) => editor.value?.setEditable(!disabled),
)
</script>

<template>
  <div class="admin-markdown-editor">
    <div class="admin-markdown-editor__toolbar" aria-label="Markdown 编辑工具">
      <button
        type="button"
        aria-label="粗体"
        :aria-pressed="editor?.isActive('bold')"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleBold().run())"
      >
        B
      </button>
      <button
        type="button"
        aria-label="斜体"
        :aria-pressed="editor?.isActive('italic')"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleItalic().run())"
      >
        I
      </button>
      <button
        type="button"
        aria-label="设置二级标题"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleHeading({ level: 2 }).run())"
      >
        H2
      </button>
      <button
        type="button"
        aria-label="引用"
        :aria-pressed="editor?.isActive('blockquote')"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleBlockquote().run())"
      >
        “ ”
      </button>
      <button
        type="button"
        aria-label="代码块"
        :aria-pressed="editor?.isActive('codeBlock')"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleCodeBlock().run())"
      >
        &lt;/&gt;
      </button>
      <button
        type="button"
        aria-label="无序列表"
        :aria-pressed="editor?.isActive('bulletList')"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleBulletList().run())"
      >
        • List
      </button>
      <button
        type="button"
        aria-label="有序列表"
        :aria-pressed="editor?.isActive('orderedList')"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleOrderedList().run())"
      >
        1. List
      </button>
      <button
        type="button"
        aria-label="链接"
        :disabled="disabled"
        @click="setLink"
      >
        链接
      </button>
      <button
        type="button"
        aria-label="图片"
        :disabled="disabled"
        @click="insertImage"
      >
        图片
      </button>
      <button
        type="button"
        aria-label="表格"
        :disabled="disabled"
        @click="insertTable"
      >
        表格
      </button>
      <span class="admin-markdown-editor__spacer" aria-hidden="true" />
      <button
        type="button"
        aria-label="撤销"
        :disabled="disabled || !canUndo"
        @click="run(() => editor!.chain().undo().run())"
      >
        ↶
      </button>
      <button
        type="button"
        aria-label="重做"
        :disabled="disabled || !canRedo"
        @click="run(() => editor!.chain().redo().run())"
      >
        ↷
      </button>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
.admin-markdown-editor {
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--color-canvas-raised);
}

.admin-markdown-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-2);
  border-bottom: var(--border-hairline) solid var(--glass-border);
  background: var(--glass-card-bg);
}

.admin-markdown-editor__toolbar button {
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding-inline: var(--space-2);
  border: 0;
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.admin-markdown-editor__toolbar button:hover:not(:disabled),
.admin-markdown-editor__toolbar button[aria-pressed='true'] {
  background: var(--glass-bg-hover);
  color: var(--color-text);
}

.admin-markdown-editor__toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.admin-markdown-editor__spacer {
  flex: 1;
}

.admin-markdown-editor :deep(.admin-markdown-editor__content) {
  min-height: 28rem;
  padding: var(--space-5);
  outline: none;
  color: var(--color-text);
  line-height: 1.8;
}

.admin-markdown-editor :deep(.admin-markdown-editor__content > *) {
  margin-block: 0 var(--space-4);
}

.admin-markdown-editor :deep(.admin-markdown-editor__content > *:last-child) {
  margin-bottom: 0;
}

.admin-markdown-editor :deep(.admin-markdown-editor__content h1),
.admin-markdown-editor :deep(.admin-markdown-editor__content h2),
.admin-markdown-editor :deep(.admin-markdown-editor__content h3) {
  line-height: 1.25;
}

.admin-markdown-editor :deep(.admin-markdown-editor__content blockquote) {
  padding-inline-start: var(--space-4);
  border-inline-start: 0.2rem solid var(--color-accent-soft);
  color: var(--color-text-muted);
}

.admin-markdown-editor :deep(.admin-markdown-editor__content pre) {
  overflow-x: auto;
  padding: var(--space-4);
  border-radius: var(--radius-small);
  background: var(--color-canvas-deep);
}

.admin-markdown-editor :deep(.admin-markdown-editor__content img) {
  max-width: 100%;
  height: auto;
}

.admin-markdown-editor :deep(.admin-markdown-editor__content table) {
  width: 100%;
  border-collapse: collapse;
}

.admin-markdown-editor :deep(.admin-markdown-editor__content th),
.admin-markdown-editor :deep(.admin-markdown-editor__content td) {
  padding: var(--space-2);
  border: var(--border-hairline) solid var(--glass-border);
  text-align: start;
}

@media (width <= 30rem) {
  .admin-markdown-editor :deep(.admin-markdown-editor__content) {
    min-height: 22rem;
    padding: var(--space-4);
  }
}
</style>
