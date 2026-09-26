<script setup lang="ts">
import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminTaxonomy, AdminTaxonomyInput } from '~/types/admin'

defineProps<{ kind: 'tag' }>()

const api = useApiClient()
const session = useAdminSession()
const items = ref<AdminTaxonomy[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const deleteErrorMessage = ref<string | null>(null)
const isLoadError = ref(false)
const pendingDelete = ref<AdminTaxonomy | null>(null)
let requestNumber = 0

const copy = computed(() => ({
  description: '维护可复用的描述性标签，让文章之间保持有意义的连接。',
  eyebrow: 'Reusable labels',
  label: '标签',
  title: '标签管理',
}))

const load = async () => {
  if (!session.isAuthenticated) return
  const currentRequest = ++requestNumber
  isLoading.value = true
  errorMessage.value = null
  isLoadError.value = false
  try {
    const data = await session.withSession(() => api.listAdminTags())
    if (currentRequest === requestNumber) items.value = data
  } catch {
    if (currentRequest !== requestNumber) return
    isLoadError.value = true
    errorMessage.value = 'Taxonomy 暂时无法加载，请稍后重试。'
  } finally {
    if (currentRequest === requestNumber) isLoading.value = false
  }
}

const save = async (input: AdminTaxonomyInput & { id?: string }) => {
  isSubmitting.value = true
  errorMessage.value = null
  try {
    const saved = await session.withSession(() => {
      return input.id
        ? api.updateAdminTag(input.id, input)
        : api.createAdminTag(input)
    })
    const index = items.value.findIndex((item) => item.id === saved.id)
    if (index >= 0) items.value[index] = saved
    else
      items.value = [...items.value, saved].sort((left, right) =>
        left.name.localeCompare(right.name, 'zh-CN'),
      )
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof BlogApiError && error.code.endsWith('_conflict')
        ? `${copy.value.label}名称或 slug 已存在，请换一个。`
        : '保存失败，当前表单内容仍然保留。'
  } finally {
    isSubmitting.value = false
  }
}

const remove = async () => {
  if (!pendingDelete.value) return
  const item = pendingDelete.value
  isSubmitting.value = true
  deleteErrorMessage.value = null
  try {
    await session.withSession(() => api.deleteAdminTag(item.id))
    items.value = items.value.filter((candidate) => candidate.id !== item.id)
    pendingDelete.value = null
  } catch {
    deleteErrorMessage.value =
      '删除失败。标签及 Post 关联保持不变，请点“重试删除”；如果问题持续，请稍后联系管理员。'
  } finally {
    isSubmitting.value = false
  }
}

const openDelete = (item: AdminTaxonomy) => {
  pendingDelete.value = item
  deleteErrorMessage.value = null
}

const cancelDelete = () => {
  pendingDelete.value = null
  deleteErrorMessage.value = null
}

const deleteDescription = computed(() => {
  if (!pendingDelete.value) return ''
  const { name, postCount } = pendingDelete.value
  return postCount > 0
    ? `标签“${name}”将从 ${postCount} 篇 Post 中解除关联。Post 内容和发布状态保持不变。删除后无法恢复。`
    : `标签“${name}”当前关联 0 篇 Post。删除后无法恢复。`
})

watch(
  () => session.status,
  (status) => {
    if (status === 'authenticated') void load()
  },
  { immediate: true },
)

useHead(() => ({ title: `${copy.value.title} · 后台空间` }))
</script>

<template>
  <AdminTaxonomyManager
    :description="copy.description"
    :eyebrow="copy.eyebrow"
    :error-message="errorMessage"
    :is-load-error="isLoadError"
    :is-loading="isLoading"
    :is-submitting="isSubmitting"
    :item-label="copy.label"
    :items="items"
    :title="copy.title"
    @delete="openDelete"
    @save="save"
    @retry="load"
  />
  <UiDialog
    :open="Boolean(pendingDelete)"
    :title="`确认删除这个${copy.label}？`"
    :description="deleteDescription"
    @update:open="(open) => !open && cancelDelete()"
  >
    <p v-if="deleteErrorMessage" role="alert">
      {{ deleteErrorMessage }}
    </p>
    <template #footer>
      <UiButton variant="ghost" @click="cancelDelete">取消</UiButton>
      <UiButton variant="danger" :loading="isSubmitting" @click="remove">{{
        deleteErrorMessage ? '重试删除' : '确认删除'
      }}</UiButton>
    </template>
  </UiDialog>
</template>
