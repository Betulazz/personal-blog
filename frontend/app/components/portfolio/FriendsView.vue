<script setup lang="ts">
import { computed } from 'vue'
import { useOnline } from '@vueuse/core'

import { siteIdentity } from '~/config/siteIdentity'
import type { FriendCollectionResponse } from '~/types/portfolio'

const props = defineProps<{
  error?: unknown
  pending: boolean
  response: FriendCollectionResponse | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const isOnline = useOnline()

const status = computed(() => {
  if (props.pending) return 'loading' as const
  if (!isOnline.value && !props.response) return 'offline' as const
  if (props.error) return 'error' as const
  if (!props.response || props.response.data.length === 0) {
    return 'empty' as const
  }
  return 'ready' as const
})
</script>

<template>
  <div class="friends-page" data-friends-page>
    <UiPageContainer as="section" class="friends-page__intro" width="wide">
      <UiSectionHeader
        description="一些值得慢慢访问的个人网站。这里是人工整理的公开链接，不提供自动在线检测，也不对实时可用性作承诺。"
        eyebrow="CURATED RELATIONSHIPS"
        title="友链"
        :heading-level="1"
      />
    </UiPageContainer>

    <UiPageContainer
      as="section"
      class="friends-page__content"
      width="wide"
      aria-label="友链列表"
    >
      <PublicCollectionState
        label="友链"
        recovery-href="/friends"
        :status="status"
        @retry="emit('retry')"
      >
        <div class="friends-page__grid">
          <PortfolioFriendCard
            v-for="friend in response?.data"
            :key="friend.id"
            :friend="friend"
          />
        </div>
      </PublicCollectionState>

      <UiGlassPanel
        as="aside"
        class="friends-page__application"
        tone="subtle"
        padding="spacious"
        aria-label="友链申请说明"
      >
        <div>
          <p class="friends-page__eyebrow">LINK REQUEST</p>
          <h2>想交换友链？</h2>
          <p>
            请提供站点名称、网址、简短介绍和希望展示的头像。申请会由管理员人工查看，提交并不等于即时收录。
          </p>
        </div>
        <dl>
          <div>
            <dt>本站名称</dt>
            <dd>{{ siteIdentity.name }}</dd>
          </div>
          <div>
            <dt>本站介绍</dt>
            <dd>{{ siteIdentity.description }}</dd>
          </div>
          <div>
            <dt>联系入口</dt>
            <dd>
              <a href="mailto:hello@example.com">hello@example.com</a>
            </dd>
          </div>
        </dl>
      </UiGlassPanel>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.friends-page,
.friends-page__content {
  min-height: 100%;
}

.friends-page__intro {
  padding-top: clamp(10rem, 17vw, 14rem);
  padding-bottom: var(--space-12);
}

.friends-page__content {
  display: grid;
  gap: var(--space-8);
  padding-bottom: var(--space-section);
}

.friends-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: var(--space-5);
}

.friends-page__application {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.9fr);
  gap: var(--space-10);
}

.friends-page__eyebrow {
  margin: 0 0 var(--space-3);
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
}

.friends-page__application h2 {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-h3);
}

.friends-page__application p {
  max-width: 48ch;
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.friends-page__application dl {
  display: grid;
  gap: var(--space-4);
  margin: 0;
}

.friends-page__application dt,
.friends-page__application dd {
  margin: 0;
}

.friends-page__application dt {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
}

.friends-page__application dd {
  margin-top: var(--space-1);
  color: var(--color-text);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.friends-page__application a {
  color: var(--color-accent-soft);
  text-decoration: underline;
  text-decoration-color: rgb(163 168 255 / 44%);
  text-underline-offset: 0.2em;
}

@media (width <= 64rem) {
  .friends-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 48rem) {
  .friends-page__intro {
    padding-top: 9rem;
    padding-bottom: var(--space-10);
  }

  .friends-page__grid,
  .friends-page__application {
    grid-template-columns: 1fr;
  }

  .friends-page__application {
    padding: var(--space-6);
    gap: var(--space-8);
  }
}
</style>
