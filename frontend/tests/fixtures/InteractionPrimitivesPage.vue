<script setup lang="ts">
definePageMeta({ layout: false })

const name = ref('')
const bio = ref('')
const category = ref<string>()
const dialogOpen = ref(false)
const sheetOpen = ref(false)
const selectedAction = ref('尚未选择操作')
const hydrated = ref(false)

const categoryOptions = [
  { label: '前端开发', value: 'frontend' },
  { label: '生活随笔', value: 'life' },
  { label: '暂不可用', value: 'disabled', disabled: true },
]

const actions = [
  { label: '编辑文章', value: 'edit' },
  { label: '归档文章', value: 'archive' },
  { label: '删除文章', value: 'delete', tone: 'danger' as const },
]

useHead({ title: 'Interaction primitives acceptance' })
onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <div class="acceptance-page" :data-hydrated="hydrated">
    <UiBackgroundLayer />
    <UiPageContainer as="main" width="reading" class="acceptance-page__main">
      <UiGlassPanel as="section" aria-label="交互原语验收" padding="spacious">
        <UiSectionHeader
          eyebrow="DESIGN SYSTEM · INTERACTIONS"
          title="交互与表单原语"
          description="验证键盘、焦点、表单状态和移动端覆盖层。"
        />

        <form class="acceptance-page__form" @submit.prevent>
          <UiInput
            v-model="name"
            label="显示名称"
            description="将在个人资料中公开显示"
            placeholder="例如：星野"
          />
          <UiTextarea
            v-model="bio"
            label="个人简介"
            placeholder="写一段简短介绍"
          />
          <UiSelect
            v-model="category"
            label="默认分类"
            placeholder="选择一个分类"
            :options="categoryOptions"
          />

          <div class="acceptance-page__actions">
            <UiButton @click="dialogOpen = true">打开对话框</UiButton>
            <UiButton variant="secondary" @click="sheetOpen = true">
              打开侧边栏
            </UiButton>
            <UiTooltip label="悬停提示" content="保存前会检查必填字段" />
            <UiDropdown
              label="更多操作"
              :items="actions"
              @select="selectedAction = $event"
            />
          </div>

          <p aria-live="polite">{{ selectedAction }}</p>
          <UiButton loading>正在保存</UiButton>
        </form>
      </UiGlassPanel>
    </UiPageContainer>

    <UiDialog
      v-model:open="dialogOpen"
      title="发布确认"
      description="发布后访客将能看到这篇文章。"
    >
      <p>请确认文章标题和摘要已经完成。</p>
    </UiDialog>

    <UiSheet
      v-model:open="sheetOpen"
      title="移动端目录"
      description="从右侧打开的阅读导航。"
    >
      <nav aria-label="文章目录">第一章 · 设计基础</nav>
    </UiSheet>
  </div>
</template>

<style scoped>
.acceptance-page {
  position: relative;
  z-index: var(--z-base);
  min-height: 100svh;
}

.acceptance-page__main {
  padding-block: var(--space-section);
}

.acceptance-page__form {
  display: grid;
  gap: var(--space-6);
  margin-top: var(--space-10);
}

.acceptance-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
