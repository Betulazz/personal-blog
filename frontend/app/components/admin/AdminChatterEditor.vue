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
    images: [],
    mood: null,
    title: null,
  }),
  toInput: (record) => ({
    body: record.body,
    images: record.images.map((image) => ({
      src: image.src,
      alt: image.alt,
      width: image.width,
      height: image.height,
    })),
    mood: record.mood,
    title: record.title,
  }),
})
const {
  form,
  record,
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
  form.value.body = form.value.body.trim()
  form.value.mood = form.value.mood?.trim() || null
  void save()
}

const moveImage = (index: number, direction: number) => {
  const target = index + direction
  const image = form.value.images[index]
  if (!image || target < 0 || target >= form.value.images.length) return
  form.value.images.splice(index, 1)
  form.value.images.splice(target, 0, image)
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
            v-model="form.body"
            label="正文"
            :rows="7"
            required
            description="写下此刻的想法，标题、心情和图片均可留空。"
          />
          <UiInput
            :model-value="form.mood ?? ''"
            label="心情"
            maxlength="80"
            @update:model-value="form.mood = $event"
          />
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
            <UiButton
              variant="secondary"
              :disabled="index === 0"
              @click="moveImage(index, -1)"
              >上移图片 {{ index + 1 }}</UiButton
            >
            <UiButton
              variant="secondary"
              :disabled="index === form.images.length - 1"
              @click="moveImage(index, 1)"
              >下移图片 {{ index + 1 }}</UiButton
            >
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
