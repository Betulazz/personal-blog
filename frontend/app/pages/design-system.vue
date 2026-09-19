<script setup lang="ts">
type TokenKind = 'code' | 'radius' | 'shadow' | 'size' | 'swatch' | 'type'

interface TokenItem {
  kind?: TokenKind
  label: string
  variable: string
}

interface TokenFamily {
  description: string
  id: string
  items: TokenItem[]
  title: string
}

const tokenFamilies: TokenFamily[] = [
  {
    id: 'color',
    title: 'Color · 色彩',
    description: 'A cool, quiet palette that keeps the content luminous.',
    items: [
      { label: 'Canvas', variable: '--color-canvas', kind: 'swatch' },
      { label: 'Raised', variable: '--color-canvas-raised', kind: 'swatch' },
      { label: 'Surface', variable: '--color-surface', kind: 'swatch' },
      { label: 'Hover', variable: '--color-surface-hover', kind: 'swatch' },
      { label: 'Text', variable: '--color-text', kind: 'swatch' },
      { label: 'Muted', variable: '--color-text-muted', kind: 'swatch' },
      { label: 'Accent', variable: '--color-accent', kind: 'swatch' },
      { label: 'Secondary', variable: '--color-secondary', kind: 'swatch' },
      { label: 'Success', variable: '--color-success', kind: 'swatch' },
      { label: 'Focus', variable: '--color-focus', kind: 'swatch' },
    ],
  },
  {
    id: 'typography',
    title: 'Typography · 排版',
    description:
      'Editorial display, comfortable reading, and a reliable mono voice.',
    items: [
      { label: 'Display', variable: '--font-display', kind: 'type' },
      { label: 'Interface', variable: '--font-ui', kind: 'type' },
      { label: 'Monospace', variable: '--font-mono', kind: 'type' },
      { label: 'Body size', variable: '--text-body', kind: 'size' },
      { label: 'H2 scale', variable: '--text-h2', kind: 'size' },
      { label: 'Body leading', variable: '--leading-body', kind: 'size' },
    ],
  },
  {
    id: 'spacing',
    title: 'Spacing · 间距',
    description:
      'A small rhythm that scales from touch controls to page sections.',
    items: [
      { label: 'space-1', variable: '--space-1', kind: 'size' },
      { label: 'space-2', variable: '--space-2', kind: 'size' },
      { label: 'space-4', variable: '--space-4', kind: 'size' },
      { label: 'space-6', variable: '--space-6', kind: 'size' },
      { label: 'space-10', variable: '--space-10', kind: 'size' },
      { label: 'space-16', variable: '--space-16', kind: 'size' },
      { label: 'section', variable: '--space-section', kind: 'size' },
      { label: 'page gutter', variable: '--gutter-page', kind: 'size' },
    ],
  },
  {
    id: 'shape',
    title: 'Shape · 形状',
    description:
      'Soft edges with distinct roles for controls, cards, panels, and pills.',
    items: [
      { label: 'Small', variable: '--radius-small', kind: 'radius' },
      { label: 'Medium', variable: '--radius-medium', kind: 'radius' },
      { label: 'Large', variable: '--radius-large', kind: 'radius' },
      { label: 'Panel', variable: '--radius-panel', kind: 'radius' },
      { label: 'Round', variable: '--radius-round', kind: 'radius' },
    ],
  },
  {
    id: 'glass',
    title: 'Glass · 毛玻璃',
    description:
      'Bounded surfaces share one material language and responsive blur budget.',
    items: [
      { label: 'Card background', variable: '--glass-card-bg', kind: 'swatch' },
      {
        label: 'Panel background',
        variable: '--glass-panel-bg',
        kind: 'swatch',
      },
      {
        label: 'Elevated background',
        variable: '--glass-elevated-bg',
        kind: 'swatch',
      },
      { label: 'Border', variable: '--glass-border', kind: 'swatch' },
      { label: 'Card blur', variable: '--glass-blur-card', kind: 'size' },
      { label: 'Panel blur', variable: '--glass-blur-panel', kind: 'size' },
      { label: 'Saturation', variable: '--glass-saturation', kind: 'size' },
    ],
  },
  {
    id: 'depth',
    title: 'Depth · 层次',
    description:
      'Ambient shadows, highlights, and glow create depth without grey drop shadows.',
    items: [
      { label: 'Card shadow', variable: '--shadow-card', kind: 'shadow' },
      { label: 'Panel shadow', variable: '--shadow-panel', kind: 'shadow' },
      { label: 'Focus ring', variable: '--shadow-focus', kind: 'shadow' },
      { label: 'Glow shadow', variable: '--shadow-glow', kind: 'shadow' },
      { label: 'Soft blur', variable: '--blur-soft', kind: 'size' },
      { label: 'Ambient blur', variable: '--blur-ambient', kind: 'size' },
    ],
  },
  {
    id: 'background',
    title: 'Background · 背景',
    description:
      'The atmospheric canvas layers an approved image, veil, glow, and restrained motion.',
    items: [
      { label: 'Desktop veil', variable: '--background-veil', kind: 'code' },
      {
        label: 'Mobile veil',
        variable: '--background-veil-mobile',
        kind: 'code',
      },
      { label: 'Accent glow', variable: '--glow-accent', kind: 'swatch' },
      { label: 'Secondary glow', variable: '--glow-secondary', kind: 'swatch' },
      { label: 'Glow size', variable: '--glow-size', kind: 'size' },
      {
        label: 'Media fallback',
        variable: '--media-fallback-height',
        kind: 'size',
      },
    ],
  },
  {
    id: 'motion',
    title: 'Motion · 动效',
    description:
      'Short feedback is intentional; reduced motion collapses durations and ambient movement.',
    items: [
      { label: 'Fast', variable: '--motion-duration-fast', kind: 'code' },
      { label: 'Normal', variable: '--motion-duration-normal', kind: 'code' },
      { label: 'Slow', variable: '--motion-duration-slow', kind: 'code' },
      {
        label: 'Standard easing',
        variable: '--motion-ease-standard',
        kind: 'code',
      },
      {
        label: 'Emphasized easing',
        variable: '--motion-ease-emphasized',
        kind: 'code',
      },
      {
        label: 'Small distance',
        variable: '--motion-distance-small',
        kind: 'size',
      },
    ],
  },
  {
    id: 'responsive',
    title: 'Responsive + z-index · 响应式与层级',
    description:
      'Declared breakpoints and layers keep layout and overlays predictable.',
    items: [
      { label: 'Phone', variable: '--breakpoint-phone', kind: 'code' },
      { label: 'Tablet', variable: '--breakpoint-tablet', kind: 'code' },
      { label: 'Laptop', variable: '--breakpoint-laptop', kind: 'code' },
      { label: 'Desktop', variable: '--breakpoint-desktop', kind: 'code' },
      { label: 'Sticky', variable: '--z-sticky', kind: 'code' },
      { label: 'Overlay', variable: '--z-overlay', kind: 'code' },
      { label: 'Toast', variable: '--z-toast', kind: 'code' },
    ],
  },
]

const category = ref<string>()
const dialogOpen = ref(false)
const sheetOpen = ref(false)
const dropdownResult = ref('等待选择')
const validationValue = ref('')
const validValue = ref('Design system')
const longNote = ref(
  '这是一段用于确认 textarea 在窄屏中自然换行的中文内容，同时保留 a readable English sentence for mixed-language review.',
)
const hydrated = ref(false)

const categoryOptions = [
  { label: 'Design tokens', value: 'tokens' },
  { label: 'Accessible primitives', value: 'primitives' },
  { label: 'Disabled option', value: 'disabled', disabled: true },
]

useSeoMeta({
  title: 'Design System · 夜航手记',
  description: '夜航手记的设计系统 token 与交互原语可视化验收页。',
})

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <div class="design-system-page" :data-hydrated="hydrated">
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <UiPageContainer id="main-content" as="main" width="wide" class="gallery">
      <section class="gallery__hero" aria-labelledby="gallery-title">
        <UiGlowLayer
          class="gallery__hero-glow"
          position="top-end"
          intensity="subtle"
        />
        <div class="gallery__hero-copy">
          <UiBadge tone="accent">PHASE 2 · TOKENS + PRIMITIVES</UiBadge>
          <UiSectionHeader
            eyebrow="夜航手记 · DESIGN LANGUAGE"
            title="Design System gallery"
            description="一个浏览器可见的 token 与 primitive 目录：从空间、材质、排版到键盘可达的交互状态，所有后来页面都从这里出发。"
            :heading-level="1"
            title-id="gallery-title"
          />
          <p class="gallery__intro">
            Designed for quiet depth, clear hierarchy, and comfortable reading —
            with 中文和 English content living together naturally.
          </p>
        </div>
        <dl class="gallery__meta" aria-label="Gallery scope">
          <div>
            <dt>Tokens</dt>
            <dd>9 families</dd>
          </div>
          <div>
            <dt>States</dt>
            <dd>default → reduced</dd>
          </div>
          <div>
            <dt>Viewports</dt>
            <dd>375 → 1920 CSS px</dd>
          </div>
        </dl>
      </section>

      <UiGlassPanel
        as="section"
        class="gallery-section"
        aria-label="Design tokens"
        padding="spacious"
      >
        <UiSectionHeader
          eyebrow="01 · SYSTEM"
          title="Token atlas"
          description="Every visual decision is named, inspectable, and shared. The examples below use the same custom properties as the primitives."
        />

        <div class="token-grid">
          <UiGlassCard
            v-for="family in tokenFamilies"
            :key="`${family.id}-${family.title}`"
            as="article"
            class="token-card"
            padding="compact"
            :data-testid="`token-family-${family.id}`"
          >
            <header class="token-card__header">
              <h3>{{ family.title }}</h3>
              <p>{{ family.description }}</p>
              <p
                v-if="family.id === 'typography'"
                class="token-typography-sample"
              >
                中文与 English 共存的排版样本
              </p>
            </header>
            <div class="token-list">
              <div
                v-for="token in family.items"
                :key="token.variable"
                class="token-row"
              >
                <div class="token-row__label">
                  <span>{{ token.label }}</span>
                  <code>{{ token.variable }}</code>
                </div>
                <span
                  v-if="token.kind === 'swatch'"
                  class="token-swatch"
                  :style="{ background: `var(${token.variable})` }"
                  aria-hidden="true"
                />
                <span
                  v-else-if="token.kind === 'type'"
                  class="token-type-sample"
                  :style="{ fontFamily: `var(${token.variable})` }"
                >
                  Aa 中文
                </span>
                <span
                  v-else-if="token.kind === 'size'"
                  class="token-size-sample"
                  :style="{ width: `var(${token.variable})` }"
                  aria-hidden="true"
                />
                <span
                  v-else-if="token.kind === 'radius'"
                  class="token-shape-sample"
                  :style="{ borderRadius: `var(${token.variable})` }"
                  aria-hidden="true"
                />
                <span
                  v-else-if="token.kind === 'shadow'"
                  class="token-depth-sample"
                  :style="{ boxShadow: `var(${token.variable})` }"
                  aria-hidden="true"
                />
                <code v-else class="token-value"
                  >var({{ token.variable }})</code
                >
              </div>
            </div>
          </UiGlassCard>
        </div>
      </UiGlassPanel>

      <UiGlassPanel
        as="section"
        class="gallery-section"
        aria-label="Display primitives"
        padding="spacious"
      >
        <UiSectionHeader
          eyebrow="02 · MATERIAL + HIERARCHY"
          title="Display primitives"
          description="Panels, cards, badges, headers, containers, background layers, and glow establish a consistent spatial vocabulary."
        />

        <div class="primitive-grid">
          <UiGlassPanel as="section" class="primitive-card" padding="compact">
            <UiSectionHeader
              eyebrow="GLASS PANEL"
              title="A bounded reading surface"
              description="Panel padding and tone stay semantic, while long content remains readable."
              :heading-level="3"
            />
            <div class="primitive-card__stack">
              <UiBadge tone="accent">FEATURED · 精选</UiBadge>
              <p class="primitive-card__copy">
                这是一段故意较长的中文与 English
                copy，用来观察窄屏换行、行高和边界。The surface should feel
                layered, never louder than the words.
              </p>
            </div>
          </UiGlassPanel>

          <UiGlassCard
            as="article"
            class="primitive-card"
            media
            media-label="媒体内容暂不可用"
            hoverable
          >
            <UiSectionHeader
              eyebrow="GLASS CARD · HOVERABLE"
              title="Missing media is still a designed state"
              description="媒体 fallback remains explicit, legible, and accessible instead of collapsing the card."
              :heading-level="3"
            />
            <div class="primitive-card__tags">
              <UiBadge>Nuxt</UiBadge>
              <UiBadge>Vue</UiBadge>
              <UiBadge tone="success">可发布</UiBadge>
            </div>
          </UiGlassCard>

          <UiGlassCard
            as="article"
            class="primitive-card primitive-card--empty"
            aria-label="Empty state example"
          >
            <UiBadge>EMPTY STATE</UiBadge>
            <div class="empty-state">
              <span class="empty-state__mark" aria-hidden="true">◇</span>
              <h3>这里暂时没有内容</h3>
              <p>
                No posts yet. The empty state keeps its shape and recovery path.
              </p>
              <UiButton size="small" variant="secondary">创建第一篇</UiButton>
            </div>
          </UiGlassCard>
        </div>
      </UiGlassPanel>

      <UiGlassPanel
        as="section"
        class="gallery-section"
        aria-label="Interaction states"
        padding="spacious"
      >
        <UiSectionHeader
          eyebrow="03 · INTERACTION"
          title="State atlas"
          description="Controls expose default, hover, keyboard focus, disabled, loading, validation, open, and reduced-motion states without hiding their behavior."
        />

        <div class="state-grid">
          <UiGlassCard as="article" class="state-card" padding="compact">
            <h3>Button states</h3>
            <p class="state-card__description">
              Every control keeps a 44px touch target.
            </p>
            <div class="control-row">
              <UiButton data-testid="button-default">默认按钮</UiButton>
              <UiButton
                data-testid="focus-target"
                variant="secondary"
                aria-describedby="focus-help"
              >
                键盘焦点
              </UiButton>
              <UiButton disabled>已禁用</UiButton>
              <UiButton loading>正在加载</UiButton>
              <UiButton variant="danger">删除动作</UiButton>
            </div>
            <p id="focus-help" class="visually-hidden">
              使用 Tab 键查看焦点环。
            </p>
          </UiGlassCard>

          <UiGlassCard as="article" class="state-card" padding="compact">
            <h3>Form states</h3>
            <p class="state-card__description">
              Labels, helper copy, and validation stay associated.
            </p>
            <form class="form-stack" @submit.prevent>
              <UiInput
                v-model="validationValue"
                label="标题 · validation"
                description="必填字段的错误提示示例"
                error="请输入文章标题"
                placeholder="例如：一段新的记录"
              />
              <UiInput
                v-model="validValue"
                label="Slug · default"
                description="可用字段仍然保留清晰的帮助文本"
              />
              <UiTextarea
                v-model="longNote"
                label="简介 · long content"
                error="简介 validation 示例"
                :rows="3"
              />
              <UiInput
                label="锁定字段 · disabled"
                model-value="不可编辑的系统值"
                disabled
              />
              <UiSelect
                v-model="category"
                label="选择分类"
                placeholder="选择一个分类"
                error="请选择一个分类"
                :options="categoryOptions"
              />
            </form>
          </UiGlassCard>

          <UiGlassCard as="article" class="state-card" padding="compact">
            <h3>Open + feedback states</h3>
            <p class="state-card__description">
              Overlays and menus preserve focus, dismissal, and readable bounds.
            </p>
            <div class="control-row">
              <UiButton data-testid="open-dialog" @click="dialogOpen = true">
                打开 Dialog
              </UiButton>
              <UiButton
                data-testid="open-sheet"
                variant="secondary"
                @click="sheetOpen = true"
              >
                打开 Sheet
              </UiButton>
              <UiTooltip
                label="键盘提示"
                content="这是一个可通过 focus 发现的 tooltip。"
              />
              <UiDropdown
                label="更多状态"
                :items="[
                  { label: '查看规范', value: 'spec' },
                  { label: '复制 token', value: 'copy' },
                  { label: '删除示例', value: 'delete', tone: 'danger' },
                ]"
                @select="
                  dropdownResult = $event === 'spec' ? '查看规范' : $event
                "
              />
            </div>
            <p class="state-result" aria-live="polite">
              Dropdown result:
              <strong data-testid="dropdown-result">{{
                dropdownResult
              }}</strong>
            </p>
            <div
              class="motion-demo"
              data-testid="motion-preview"
              aria-label="Ambient motion preview"
            >
              <span
                class="motion-demo__orb"
                data-testid="motion-orb"
                aria-hidden="true"
              />
              <span>Ambient movement pauses for reduced-motion users.</span>
            </div>
          </UiGlassCard>
        </div>
      </UiGlassPanel>
    </UiPageContainer>

    <UiDialog
      v-model:open="dialogOpen"
      title="Dialog open state"
      description="Focus is trapped here and restored to the trigger after dismissal."
    >
      <p>
        Open overlays use the elevated glass token, a safe boundary, and an
        explicit close action.
      </p>
    </UiDialog>
    <UiSheet
      v-model:open="sheetOpen"
      title="Sheet open state"
      description="A narrow-screen surface for secondary navigation and context."
    >
      <nav aria-label="Design system sheet navigation">
        <a href="#main-content">Return to token atlas</a>
      </nav>
    </UiSheet>
  </div>
</template>

<style scoped>
.design-system-page {
  position: relative;
  z-index: var(--z-base);
  min-height: 100svh;
  isolation: isolate;
  padding-block: var(--space-16) var(--space-24);
}

.skip-link {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--space-4);
  left: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  color: var(--color-text);
  transform: translateY(-180%);
  transition: transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.skip-link:focus {
  transform: translateY(0);
}

.gallery {
  display: grid;
  gap: var(--space-12);
}

.gallery__hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-10);
  overflow: hidden;
  padding: clamp(var(--space-8), 7vw, var(--space-16));
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-panel);
  background: var(--glass-subtle-bg);
  box-shadow: var(--shadow-panel), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-subtle))
    saturate(var(--glass-saturation));
}

.gallery__hero-copy,
.gallery__meta {
  position: relative;
  z-index: var(--z-base);
}

.gallery__hero-copy {
  display: grid;
  max-width: 56rem;
  gap: var(--space-6);
}

.gallery__hero-copy :deep(.section-header) {
  gap: var(--space-4);
}

.gallery__hero-copy :deep(.section-header__title) {
  max-width: 15ch;
}

.gallery__intro {
  max-width: 68ch;
  margin: 0;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--leading-body);
}

.gallery__meta {
  display: grid;
  align-content: end;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
}

.gallery__meta div {
  display: grid;
  gap: var(--space-1);
  padding-block: var(--space-3);
  border-bottom: var(--border-hairline) solid var(--glass-border);
}

.gallery__meta dt,
.gallery__meta dd {
  margin: 0;
}

.gallery__meta dt {
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.gallery__meta dd {
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--text-small);
}

.gallery__hero-glow {
  z-index: 0;
}

.gallery-section {
  display: grid;
  gap: var(--space-10);
  min-width: 0;
}

/* Gallery sections are already bounded glass surfaces. Child samples keep
   their translucent fill without stacking another backdrop-filter layer. */
.gallery-section :deep(.glass-card),
.gallery-section :deep(.glass-panel) {
  backdrop-filter: none;
}

.token-grid,
.primitive-grid,
.state-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  min-width: 0;
}

.token-card,
.primitive-card,
.state-card {
  min-width: 0;
}

.token-card__header,
.state-card h3 {
  margin: 0;
}

.token-card__header h3,
.state-card h3 {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
  overflow-wrap: anywhere;
}

.token-card__header p,
.state-card__description {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  line-height: 1.65;
}

.token-card__header .token-typography-sample {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  line-height: var(--leading-display);
}

.token-list {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.token-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  padding-top: var(--space-3);
  border-top: var(--border-hairline) solid rgb(191 205 255 / 11%);
}

.token-row__label {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.token-row__label span {
  color: var(--color-text-muted);
  font-size: var(--text-small);
  overflow-wrap: anywhere;
}

code,
.token-value {
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  overflow-wrap: anywhere;
}

.token-swatch {
  display: block;
  width: 3rem;
  height: 1.75rem;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  box-shadow: var(--glass-highlight);
}

.token-type-sample {
  max-width: 8rem;
  color: var(--color-text);
  font-size: var(--text-small);
  text-align: end;
  overflow-wrap: anywhere;
}

.token-size-sample {
  display: block;
  min-width: 0.25rem;
  max-width: 7rem;
  height: 0.5rem;
  border-radius: var(--radius-round);
  background: linear-gradient(
    90deg,
    var(--color-accent-strong),
    var(--color-secondary)
  );
}

.token-shape-sample {
  display: block;
  width: 3rem;
  height: 2rem;
  border: var(--border-hairline) solid var(--glass-border-hover);
  background: var(--glass-bg-hover);
}

.token-depth-sample {
  display: block;
  width: 3.5rem;
  height: 2rem;
  border-radius: var(--radius-small);
  background: var(--glass-elevated-bg);
}

.token-value {
  max-width: 8rem;
  text-align: end;
}

.primitive-card {
  display: grid;
  align-content: start;
  gap: var(--space-5);
}

.primitive-card :deep(.section-header) {
  gap: var(--space-3);
}

.primitive-card__stack,
.primitive-card__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.primitive-card__copy {
  flex-basis: 100%;
  margin: 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.primitive-card--empty {
  min-height: 100%;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding-block: var(--space-8);
  text-align: center;
}

.empty-state__mark {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-round);
  background: var(--badge-accent-bg);
  color: var(--color-accent-soft);
  font-size: var(--text-h2);
}

.empty-state h3,
.empty-state p {
  margin: 0;
}

.empty-state h3 {
  font-family: var(--font-display);
  font-size: var(--text-h3);
}

.empty-state p {
  max-width: 28ch;
  color: var(--color-text-muted);
  line-height: 1.65;
}

.state-grid {
  grid-template-columns: 1fr;
}

.state-card:last-child {
  grid-column: 1 / -1;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.form-stack {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-6);
}

.state-result {
  margin: var(--space-5) 0 0;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-small);
}

.state-result strong {
  color: var(--color-accent-soft);
}

.motion-demo {
  position: relative;
  display: flex;
  min-height: 5rem;
  align-items: center;
  gap: var(--space-4);
  overflow: hidden;
  margin-top: var(--space-6);
  padding: var(--space-4);
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-medium);
  background: var(--glass-subtle-bg);
  color: var(--color-text-muted);
  font-size: var(--text-small);
}

.motion-demo__orb {
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  border-radius: var(--radius-round);
  background: radial-gradient(
    circle at 35% 35%,
    var(--color-focus),
    var(--color-accent-strong)
  );
  box-shadow: var(--shadow-glow);
  animation: ambient-drift var(--motion-duration-slow)
    var(--motion-ease-emphasized) infinite alternate;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes ambient-drift {
  from {
    transform: translateX(0) scale(0.92);
  }
  to {
    transform: translateX(2rem) scale(1.08);
  }
}

@media (width > 48rem) {
  .gallery__hero {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.38fr);
  }

  .gallery__meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width > 48rem) and (width < 64rem) {
  .token-grid,
  .primitive-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .state-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width >= 64rem) {
  .token-grid,
  .primitive-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .state-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 48rem) {
  .design-system-page {
    padding-block: var(--space-8) var(--space-16);
  }

  .gallery {
    gap: var(--space-8);
  }

  .gallery__hero,
  .gallery-section {
    padding: var(--space-6);
    border-radius: var(--radius-large);
  }

  .gallery__hero-copy :deep(.section-header__title) {
    max-width: none;
  }

  .gallery__meta,
  .token-grid,
  .primitive-grid,
  .state-grid {
    grid-template-columns: 1fr;
  }

  .state-card:last-child {
    grid-column: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .motion-demo__orb {
    animation: none;
  }
}

@media (width <= 48rem) {
  .motion-demo__orb {
    animation: none;
  }
}
</style>
