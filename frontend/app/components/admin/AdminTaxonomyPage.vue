<script setup lang="ts">
import { BlogApiError, useApiClient } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'
import type { AdminTaxonomy, AdminTaxonomyInput } from '~/types/admin'

const props = defineProps<{ kind: 'category' | 'tag' }>()

const api = useApiClient()
const session = useAdminSession()
const items = ref<AdminTaxonomy[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const isLoadError = ref(false)
const pendingDelete = ref<AdminTaxonomy | null>(null)
let requestNumber = 0

const copy = computed(() =>
  props.kind === 'category'
    ? {
        description: '维护文章的主要编辑分组，并在文章列表中保持筛选清晰。',
        eyebrow: 'Primary grouping',
        label: '分类',
        title: '分类管理',
      }
    : {
        description: '维护可复用的描述性标签，让文章之间保持有意义的连接。',
        eyebrow: 'Reusable labels',
        label: '标签',
        title: '标签管理',
      },
)

const load = async () => {
  if (!session.isAuthenticated) return
  const currentRequest = ++requestNumber
  isLoading.value = true
  errorMessage.value = null
  isLoadError.value = false
  try {
    const data = await session.withSession(() =>
      props.kind === 'category'
        ? api.listAdminCategories()
        : api.listAdminTags(),
    )
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
      if (props.kind === 'category') {
        return input.id
          ? api.updateAdminCategory(input.id, input)
          : api.createAdminCategory(input)
      }
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
  pendingDelete.value = null
  isSubmitting.value = true
  errorMessage.value = null
  try {
    if (props.kind === 'category')
      await session.withSession(() => api.deleteAdminCategory(item.id))
    else await session.withSession(() => api.deleteAdminTag(item.id))
    items.value = items.value.filter((candidate) => candidate.id !== item.id)
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof BlogApiError && error.code.endsWith('_in_use')
        ? `这个${copy.value.label}仍被内容引用，请先移除引用。`
        : `删除${copy.value.label}失败，当前数据仍然保留。`
  } finally {
    isSubmitting.value = false
  }
}

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
    @delete="pendingDelete = $event"
    @save="save"
    @retry="load"
  />
  <UiDialog
    :open="Boolean(pendingDelete)"
    :title="`确认删除这个${copy.label}？`"
    :description="`删除后无法恢复；当前${copy.label}没有内容引用，可以安全移除。`"
    @update:open="(open) => !open && (pendingDelete = null)"
  >
    <template #footer>
      <UiButton variant="ghost" @click="pendingDelete = null">取消</UiButton>
      <UiButton variant="danger" :loading="isSubmitting" @click="remove"
        >确认删除</UiButton
      >
    </template>
  </UiDialog>
</template>
