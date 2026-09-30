<script setup lang="ts">
import { BlogApiError } from '~/api/client'
import { useAdminSession } from '~/stores/adminSession'

definePageMeta({ layout: false })

const session = useAdminSession()
const route = useRoute()
const identifier = ref('')
const password = ref('')
const identifierError = ref<string | undefined>()
const passwordError = ref<string | undefined>()
const formError = ref<string | null>(null)
const isSubmitting = ref(false)
const isHydrated = ref(false)

const safeRedirect = computed(() => {
  const value =
    typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return value.startsWith('/admin/') && value !== '/admin/login'
    ? value
    : '/admin'
})

const setValidationErrors = () => {
  identifierError.value = identifier.value.trim()
    ? undefined
    : '请输入用户名或邮箱。'
  passwordError.value = password.value
    ? password.value.length >= 12
      ? undefined
      : '密码至少需要 12 个字符。'
    : '请输入密码。'
  return !identifierError.value && !passwordError.value
}

const handleSubmit = async () => {
  formError.value = null
  if (!setValidationErrors()) {
    return
  }
  isSubmitting.value = true
  try {
    await session.login(identifier.value.trim(), password.value)
    await navigateTo(safeRedirect.value)
  } catch (error: unknown) {
    if (error instanceof BlogApiError && error.status === 403) {
      formError.value = '当前账号暂时没有后台访问权限。'
    } else if (
      error instanceof BlogApiError &&
      (error.status === 0 || error.status >= 500)
    ) {
      formError.value = '登录服务暂时不可用，请稍后重试。'
    } else {
      formError.value = '账号或密码不正确，请重试。'
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  isHydrated.value = true
  if (session.isAuthenticated) {
    await navigateTo(safeRedirect.value)
  }
})

useHead({ title: '进入后台' })
</script>

<template>
  <main class="admin-login-page" :data-admin-ready="isHydrated">
    <a class="admin-login-page__skip-link" href="#admin-login-form">
      跳到登录表单
    </a>
    <aside class="admin-login-page__story" aria-label="博客编辑室">
      <div class="admin-login-page__story-top">
        <span class="admin-login-page__square" aria-hidden="true" />
        <span>BIRCHTULA / FIELD NOTES</span>
        <span>PRIVATE / 01</span>
      </div>
      <div class="admin-login-page__story-copy">
        <p>EDITORIAL DESK</p>
        <strong>每一篇记录，<br />都从这里开始。</strong>
        <span>写作 / 整理 / 发布</span>
      </div>
      <p class="admin-login-page__story-foot">只为创作者保留的安静空间。</p>
    </aside>
    <section class="admin-login-card" aria-labelledby="admin-login-title">
      <div class="admin-login-card__intro">
        <p class="admin-login-card__eyebrow">SIGN IN / EDITORIAL</p>
        <h1 id="admin-login-title">进入后台</h1>
        <p>欢迎回来，继续整理你的文字与作品。</p>
      </div>

      <form
        id="admin-login-form"
        class="admin-login-form"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <p v-if="formError" class="admin-login-form__error" role="alert">
          {{ formError }}
        </p>
        <UiInput
          v-model="identifier"
          label="用户名或邮箱"
          name="identifier"
          autocomplete="username"
          :error="identifierError"
          required
        />
        <UiInput
          v-model="password"
          label="密码"
          name="password"
          type="password"
          autocomplete="current-password"
          :error="passwordError"
          required
        />
        <UiButton
          class="admin-login-form__submit"
          type="submit"
          size="large"
          :loading="isSubmitting"
        >
          登录后台
        </UiButton>
      </form>

      <a class="admin-login-card__public-link" href="/">← 返回公开站点</a>
    </section>
  </main>
</template>

<style scoped>
.admin-login-page {
  position: relative;
  display: grid;
  min-height: 100svh;
  grid-template-columns: minmax(0, 1.05fr) minmax(24rem, 0.95fr);
  overflow: hidden;
  background: var(--color-canvas-raised);
  color: var(--color-text);
}

.admin-login-page__story {
  display: flex;
  min-height: 100svh;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(1.5rem, 4vw, 4.5rem);
  border-right: 1px solid var(--color-border);
  background-color: var(--color-canvas);
  background-image: radial-gradient(
    rgb(76 83 68 / 11%) 0.5px,
    transparent 0.5px
  );
  background-size: 7px 7px;
}

.admin-login-page__story-top {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

.admin-login-page__story-top span:last-child {
  margin-left: auto;
}

.admin-login-page__square {
  width: 0.7rem;
  height: 0.7rem;
  background: var(--color-accent);
  transform: rotate(-8deg);
}

.admin-login-page__story-copy {
  display: grid;
  justify-items: start;
  gap: clamp(1rem, 2vw, 2rem);
  padding-block: 3rem;
}

.admin-login-page__story-copy p,
.admin-login-page__story-foot {
  margin: 0;
  color: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
}

.admin-login-page__story-copy strong {
  font-family: var(--font-display);
  font-size: clamp(3.4rem, 5.2vw, 6.25rem);
  font-weight: 600;
  letter-spacing: -0.07em;
  line-height: 1.2;
}

.admin-login-page__story-copy span {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-strong);
  color: var(--color-text-muted);
  font-size: 0.9rem;
  letter-spacing: 0.16em;
}

.admin-login-page__story-foot {
  color: var(--color-text-muted);
  letter-spacing: 0;
}

.admin-login-page__skip-link {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--space-4);
  left: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--glass-elevated-bg);
  color: var(--color-text);
  transform: translateY(-180%);
}

.admin-login-page__skip-link:focus {
  transform: translateY(0);
}

.admin-login-card {
  width: min(100%, 31rem);
  align-self: center;
  justify-self: center;
  padding: clamp(2rem, 5vw, 4rem);
}

.admin-login-card__intro {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  margin-bottom: var(--space-10);
}

.admin-login-card__eyebrow {
  margin: 0;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-mono);
  letter-spacing: 0.1em;
}

.admin-login-card h1,
.admin-login-card__intro p:last-child {
  margin: 0;
}

.admin-login-card h1 {
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 5vw, 4.5rem);
  font-weight: 600;
  letter-spacing: -0.06em;
  line-height: 1.14;
}

.admin-login-card__intro p:last-child {
  color: var(--color-text-muted);
  line-height: 1.7;
}

.admin-login-form {
  display: grid;
  gap: var(--space-5);
}

.admin-login-form__error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: var(--border-hairline) solid var(--color-danger-border);
  border-radius: var(--radius-medium);
  background: var(--color-danger-surface);
  color: var(--color-danger);
  line-height: 1.6;
}

.admin-login-form__submit {
  width: 100%;
  margin-top: var(--space-2);
}

.admin-login-card__public-link {
  display: inline-block;
  margin-top: var(--space-6);
  color: var(--color-text-subtle);
  font-size: var(--text-small);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.admin-login-card__public-link:hover {
  color: var(--color-text);
}

@media (width <= 60rem) {
  .admin-login-page {
    grid-template-columns: 1fr;
  }

  .admin-login-page__story {
    min-height: 15rem;
    padding: 1.5rem var(--gutter-page);
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .admin-login-page__story-copy {
    padding-block: 1.5rem 0;
  }

  .admin-login-page__story-copy strong {
    font-size: clamp(2rem, 5vw, 3rem);
  }

  .admin-login-page__story-copy span,
  .admin-login-page__story-foot {
    display: none;
  }

  .admin-login-card {
    width: min(100%, 34rem);
    padding: clamp(2rem, 7vw, 3.5rem) var(--gutter-page) 4rem;
  }
}

@media (width <= 30rem) {
  .admin-login-page__story-top span:last-child {
    display: none;
  }
}
</style>
