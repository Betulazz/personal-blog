<script setup lang="ts">
import { useApiClient } from '~/api/client'
import { useAdminNoteEditor } from '~/composables/useAdminNoteEditor'
import type { AdminMoment, AdminMomentInput } from '~/types/admin-notes'

const props = defineProps<{ id?: string }>()
const editor = useAdminNoteEditor<AdminMoment, AdminMomentInput>({
  resource: 'moments',
  id: props.id,
  api: useApiClient().adminMoments,
  empty: () => ({ body: '', location: '', mood: '', tag_ids: [], images: [] }),
  toInput: (record) => ({
    body: record.body,
    location: record.location ?? '',
    mood: record.mood ?? '',
    tag_ids: record.tags.map((tag) => tag.id),
    images: record.images.map((image) => ({ ...image })),
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
  else if (
    form.value.images.some(
      (image) =>
        !image.alt.trim() ||
        !/^(https?:\/\/[^\s]+|\/uploads\/[^\s]+)$/.test(image.src) ||
        !Number.isInteger(image.width) ||
        !Number.isInteger(image.height) ||
        image.width < 1 ||
        image.height < 1 ||
        image.width > 10000 ||
        image.height > 10000,
    )
  )
    validation.value = '请填写有效的图片地址、说明及 1–10000 的整数尺寸。'
  if (!validation.value) void save()
}
useHead({ title: `${props.id ? '编辑' : '新建'} Moment · 后台空间` })
</script>

<template>
  <AdminNoteFrame
    label="Moment"
    resource="moments"
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
          <UiTextarea
            v-model="form.body"
            label="正文"
            :rows="5"
            required
            description="记录此刻的生活，图片和其他信息均可留空。"
          />
          <div class="admin-note-pair">
            <UiInput
              :model-value="form.location ?? ''"
              label="地点"
              maxlength="160"
              @update:model-value="form.location = $event"
            /><UiInput
              :model-value="form.mood ?? ''"
              label="心情"
              maxlength="80"
              @update:model-value="form.mood = $event"
            />
          </div>
          <AdminNoteTags v-model="form.tag_ids" :tags="tags" />
          <div
            v-for="(image, index) in form.images"
            :key="index"
            class="admin-note-image"
            role="group"
            :aria-label="`图片 ${index + 1}`"
          >
            <UiInput
              v-model="image.src"
              label="图片地址"
              maxlength="2048"
              required
              description="使用已有的 /uploads/ 路径或 HTTP(S) 图片地址。"
            />
            <UiInput
              v-model="image.alt"
              label="图片说明"
              maxlength="200"
              required
            />
            <div class="admin-note-pair">
              <label
                >宽度<input
                  v-model.number="image.width"
                  class="field__control"
                  type="number"
                  min="1"
                  max="10000"
                  required /></label
              ><label
                >高度<input
                  v-model.number="image.height"
                  class="field__control"
                  type="number"
                  min="1"
                  max="10000"
                  required
              /></label>
            </div>
            <UiButton variant="ghost" @click="form.images.splice(index, 1)"
              >移除图片 {{ index + 1 }}</UiButton
            >
          </div>
          <UiButton
            variant="secondary"
            :disabled="form.images.length >= 20"
            @click="
              form.images.push({ src: '', alt: '', width: 800, height: 600 })
            "
            >添加图片</UiButton
          >
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
