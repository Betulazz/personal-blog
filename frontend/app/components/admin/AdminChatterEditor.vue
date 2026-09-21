<script setup lang="ts">
import { useApiClient } from '~/api/client'
import { useAdminNoteEditor } from '~/composables/useAdminNoteEditor'
import type { AdminChatter, AdminChatterInput } from '~/types/admin-notes'

const props = defineProps<{ id?: string }>()
const editor = useAdminNoteEditor<AdminChatter, AdminChatterInput>({
  resource: 'chatter',
  id: props.id,
  api: useApiClient().adminChatter,
  empty: () => ({
    body: '',
    lead: null,
    mood: null,
    tag_ids: [],
    title: null,
  }),
  toInput: (record) => ({
    body: record.body,
    lead: record.lead,
    mood: record.mood,
    tag_ids: record.tags.map((tag) => tag.id),
    title: record.title,
  }),
})
const {
  form,
  record,
  tags,
  loading,
  loadFailed,
  busy,
  error,
  notice,
  load,
  save,
  act,
} = editor
const validation = ref('')

const submit = () => {
  validation.value = ''
  if (!form.value.body.trim()) validation.value = '请填写正文。'
  if (validation.value) return
  form.value.title = form.value.title?.trim() || null
  form.value.lead = form.value.lead?.trim() || null
  form.value.body = form.value.body.trim()
  form.value.mood = form.value.mood?.trim() || null
  void save()
}

useHead({ title: `${props.id ? '编辑' : '新建'} Chatter · 后台空间` })
</script>

<template>
  <AdminNoteFrame
    label="Chatter"
    resource="chatter"
    :editing="Boolean(id)"
    :record="record"
    :loading="loading"
    :load-failed="loadFailed"
    :busy="busy"
    :error="error || validation"
    :notice="notice"
    @reload="load"
    @action="act"
  >
    <UiGlassPanel>
      <form class="admin-note-form" @submit.prevent="submit">
        <fieldset class="admin-note-fields" :disabled="busy">
          <UiInput
            :model-value="form.title ?? ''"
            label="标题"
            maxlength="200"
            @update:model-value="form.title = $event"
          />
          <UiTextarea
            :model-value="form.lead ?? ''"
            label="引言"
            :rows="3"
            maxlength="500"
            description="可选的开场句，帮助读者快速理解这条记录。"
            @update:model-value="form.lead = $event"
          />
          <UiTextarea
            v-model="form.body"
            label="正文"
            :rows="7"
            required
            description="Chatter 保持短小、完整，并独立于 Moment 与 Post。"
          />
          <UiInput
            :model-value="form.mood ?? ''"
            label="心情"
            maxlength="80"
            @update:model-value="form.mood = $event"
          />
          <AdminNoteTags v-model="form.tag_ids" :tags="tags" />
          <UiButton type="submit" :loading="busy">{{
            id ? '保存修改' : '保存草稿'
          }}</UiButton>
        </fieldset>
      </form>
    </UiGlassPanel>
  </AdminNoteFrame>
</template>

<style scoped>
@import '../ui/field.css';
</style>
