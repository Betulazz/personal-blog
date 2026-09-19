<script setup lang="ts">
const route = useRoute()
const treatment = computed(() =>
  route.query.treatment === 'plain' ? 'plain' : 'atmospheric',
)

useHead({ title: 'Display primitives acceptance' })
</script>

<template>
  <div class="acceptance-page">
    <UiBackgroundLayer :treatment="treatment" />
    <UiGlowLayer tone="accent" position="top-end" intensity="subtle" />
    <UiPageContainer as="main" width="wide" class="acceptance-page__main">
      <UiGlassPanel
        as="section"
        aria-label="展示原语压力测试"
        padding="spacious"
      >
        <UiSectionHeader
          eyebrow="POSTS · 2026 · 12 MIN READ · FEATURED · 双语内容"
          title="当一段很长的中文标题 meets an equally descriptive English heading without losing its hierarchy"
          description="中文正文与 English prose should wrap naturally, remain readable, and never require consumers to truncate meaningful content."
        />

        <div class="acceptance-page__cards">
          <UiGlassCard
            as="article"
            aria-label="缺失封面的文章预览"
            media
            media-label="文章封面暂不可用"
          >
            <UiBadge tone="accent">置顶</UiBadge>
            <h2>没有封面也能保持清晰层级的文章</h2>
            <p>
              Missing media keeps an explicit accessible fallback while the
              surrounding content remains readable.
            </p>
            <div class="acceptance-page__metadata" aria-label="文章元数据">
              <UiBadge>Nuxt</UiBadge>
              <UiBadge>Vue</UiBadge>
              <UiBadge>TypeScript</UiBadge>
              <UiBadge>无障碍</UiBadge>
              <UiBadge tone="success">已发布</UiBadge>
            </div>
          </UiGlassCard>

          <UiGlassCard as="article" aria-label="长内容文章预览" hoverable>
            <UiSectionHeader
              eyebrow="CHANGELOG · DENSE METADATA"
              title="A deliberately long card heading for narrow viewport wrapping"
              description="用于确认长英文单词、中文标点和密集标签在 375px 宽度下都不会突破玻璃容器。"
              :heading-level="3"
            />
          </UiGlassCard>
        </div>
      </UiGlassPanel>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.acceptance-page {
  position: relative;
  z-index: var(--z-base);
  min-height: 100svh;
  overflow: hidden;
}

.acceptance-page__main {
  padding-block: var(--space-section);
}

.acceptance-page__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
  margin-top: var(--space-10);
}

.acceptance-page__cards h2,
.acceptance-page__cards p {
  overflow-wrap: anywhere;
}

.acceptance-page__cards h2 {
  margin: var(--space-4) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-h3);
}

.acceptance-page__cards p {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
}

.acceptance-page__metadata {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

@media (width <= 48rem) {
  .acceptance-page__cards {
    grid-template-columns: 1fr;
  }
}
</style>
