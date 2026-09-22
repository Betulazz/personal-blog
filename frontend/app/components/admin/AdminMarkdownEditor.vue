<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, ref, watch } from 'vue'

import {
  inspectMarkdownPolicy,
  prepareEditorMarkdown,
  sanitizePastedHtml,
  type MarkdownPolicyReport,
} from '~/utils/admin-markdown-editor-policy'
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

const emit = defineEmits<{
  ready: [value: string]
  'update:modelValue': [value: string]
}>()
const editorId = `markdown-editor-${useId()}`
const helpId = `${editorId}-help`
let syncing = false
let ready = false
let lastValue = prepareEditorMarkdown(props.modelValue)

const policyNotice = ref<MarkdownPolicyReport | null>(null)
const linkError = ref('')
const pickerOpen = ref(false)
const headingLevels = [1, 2, 3] as const

const noticeItems = computed(() => {
  const notice = policyNotice.value
  if (!notice) return []
  const items: string[] = []
  if (notice.rawHtmlTags > 0) {
    items.push(`${notice.rawHtmlTags} 处原始 HTML 已按安全策略转为纯文本`)
  }
  if (notice.unsafeLinks > 0) {
    items.push(`${notice.unsafeLinks} 个不安全链接不再作为链接保存`)
  }
  if (notice.unsafeImages > 0) {
    items.push(`${notice.unsafeImages} 个不安全的图片地址不会写入正文`)
  }
  return items
})

const inspectLoadedMarkdown = (source: string) => {
  const notice = inspectMarkdownPolicy(source)
  policyNotice.value =
    notice.rawHtmlTags || notice.unsafeLinks || notice.unsafeImages
      ? notice
      : null
}

const editor = useEditor({
  content: prepareEditorMarkdown(props.modelValue),
  contentType: 'markdown',
  editable: !props.disabled,
  extensions: createAdminMarkdownExtensions(),
  editorProps: {
    attributes: {
      'aria-describedby': helpId,
      'aria-label': 'Markdown 正文',
      'aria-multiline': 'true',
      class: 'admin-markdown-editor__content',
      id: editorId,
    },
    transformPastedHTML: (html) => sanitizePastedHtml(html),
  },
  onCreate: ({ editor: currentEditor }) => {
    void nextTick(() => {
      lastValue = currentEditor.getMarkdown()
      ready = true
      emit('ready', lastValue)
    })
  },
  onUpdate: ({ editor: currentEditor }) => {
    const markdown = currentEditor.getMarkdown()
    if (!ready || syncing || markdown === lastValue) return
    lastValue = markdown
    emit('update:modelValue', markdown)
  },
})

inspectLoadedMarkdown(props.modelValue)

const canUndo = computed(() => editor.value?.can().undo() ?? false)
const canRedo = computed(() => editor.value?.can().redo() ?? false)

const run = (command: () => boolean) => {
  if (!editor.value || props.disabled) return false
  const applied = command()
  editor.value.commands.focus()
  return applied
}

const applyExternalValue = (value: string) => {
  const normalized = prepareEditorMarkdown(value)
  if (!editor.value || editor.value.getMarkdown() === normalized) return
  inspectLoadedMarkdown(value)
  lastValue = normalized
  syncing = true
  editor.value.commands.setContent(normalized, {
    contentType: 'markdown',
    emitUpdate: false,
  })
  lastValue = editor.value.getMarkdown()
  syncing = false
  if (ready) emit('ready', lastValue)
}

const setLink = () => {
  if (!editor.value || props.disabled || typeof window === 'undefined') return
  const currentHref = editor.value.getAttributes('link').href ?? ''
  const href = window.prompt('链接地址', currentHref)
  if (href === null) return
  linkError.value = ''
  if (!href.trim()) {
    run(() => editor.value!.chain().extendMarkRange('link').unsetLink().run())
    return
  }
  const applied = run(() =>
    editor.value!.chain().extendMarkRange('link').setLink({ href }).run(),
  )
  if (!applied) {
    linkError.value =
      '这个链接地址不在允许的协议范围内（http、https、mailto、tel 或站内路径），链接没有改动。'
  }
}

const openMediaPicker = () => {
  if (!editor.value || props.disabled) return
  pickerOpen.value = true
}

const insertMedia = ({
  alt,
  reference,
}: {
  alt: string
  reference: string
}) => {
  if (!editor.value || !reference) return
  run(() => editor.value!.chain().setImage({ alt, src: reference }).run())
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
  (value) => applyExternalValue(value),
)

watch(
  () => props.disabled,
  (disabled) => editor.value?.setEditable(!disabled),
)
</script>

<template>
  <div class="admin-markdown-editor" data-testid="admin-markdown-editor">
    <p :id="helpId" class="admin-markdown-editor__help">
      Markdown
      是持久化格式。支持标题、列表、引用、代码、表格、链接、图片、任务列表与数学公式；
      原始 HTML 与不安全链接不会被写入正文，粘贴内容会先经过安全过滤。
    </p>

    <div
      v-if="noticeItems.length"
      class="admin-markdown-editor__notice"
      data-testid="markdown-policy-notice"
      role="status"
    >
      <p>载入时按安全策略处理了正文：{{ noticeItems.join('；') }}。</p>
      <button type="button" @click="policyNotice = null">知道了</button>
    </div>

    <p v-if="linkError" class="admin-markdown-editor__link-error" role="alert">
      {{ linkError }}
    </p>

    <div
      class="admin-markdown-editor__toolbar"
      role="toolbar"
      aria-label="Markdown 编辑工具"
    >
      <button
        v-for="level in headingLevels"
        :key="level"
        type="button"
        :aria-label="`设置 ${level} 级标题`"
        :aria-pressed="editor?.isActive('heading', { level })"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleHeading({ level }).run())"
      >
        H{{ level }}
      </button>
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
        aria-label="任务列表"
        :aria-pressed="editor?.isActive('taskList')"
        :disabled="disabled"
        @click="run(() => editor!.chain().toggleTaskList().run())"
      >
        ☑ List
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
        aria-label="插入图片"
        :disabled="disabled"
        @click="openMediaPicker"
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

    <AdminMediaPicker v-model:open="pickerOpen" @select="insertMedia" />
  </div>
</template>

<style scoped>
.admin-markdown-editor {
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--color-canvas-raised);
}

.admin-markdown-editor__help {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-hairline) solid var(--glass-border);
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  line-height: 1.7;
}

.admin-markdown-editor__notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-hairline) solid var(--glass-border-hover);
  background: var(--badge-accent-bg);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.admin-markdown-editor__notice p {
  margin: 0;
}

.admin-markdown-editor__notice button {
  min-height: 2.75rem;
  padding-inline: var(--space-3);
  border: 0;
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--color-accent-soft);
  font: inherit;
  cursor: pointer;
}

.admin-markdown-editor__link-error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-hairline) solid var(--color-danger-border);
  background: var(--color-danger-surface);
  color: var(--color-danger);
  font-size: var(--text-small);
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
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding-inline: var(--space-2);
  border: 0;
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
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

.admin-markdown-editor
  :deep(.admin-markdown-editor__content ul[data-type='taskList']) {
  padding-inline-start: 0;
  list-style: none;
}

.admin-markdown-editor
  :deep(.admin-markdown-editor__content ul[data-type='taskList'] li) {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.admin-markdown-editor
  :deep(.admin-markdown-editor__content ul[data-type='taskList'] li > label) {
  display: inline-flex;
  min-width: 1.5rem;
  min-height: 1.5rem;
  align-items: center;
}

@media (width <= 30rem) {
  .admin-markdown-editor :deep(.admin-markdown-editor__content) {
    min-height: 22rem;
    padding: var(--space-4);
  }
}
</style>
