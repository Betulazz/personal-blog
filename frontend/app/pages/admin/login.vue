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
    <div class="admin-login-page__glow" aria-hidden="true" />
    <section class="admin-login-card" aria-labelledby="admin-login-title">
      <div class="admin-login-card__intro">
        <span class="admin-login-card__mark" aria-hidden="true">✦</span>
        <p class="admin-login-card__eyebrow">Administrator workspace</p>
        <h1 id="admin-login-title">进入后台</h1>
        <p>管理公开内容、站点状态与持续写作的下一步。</p>
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

      <a class="admin-login-card__public-link" href="/"> ← 返回公开站点 </a>
    </section>
  </main>
</template>

<style scoped>
.admin-login-page {
  position: relative;
  display: grid;
  min-height: 100svh;
  place-items: center;
  overflow: hidden;
  padding: var(--space-8) var(--gutter-page);
  background:
    linear-gradient(135deg, rgb(9 14 34 / 94%), rgb(6 10 23 / 100%)),
    var(--color-canvas);
  color: var(--color-text);
}

.admin-login-page__glow {
  position: absolute;
  width: min(60vw, 48rem);
  aspect-ratio: 1;
  border-radius: var(--radius-round);
  background: radial-gradient(circle, var(--glow-accent), transparent 68%);
  filter: blur(var(--blur-ambient));
  opacity: 0.85;
  pointer-events: none;
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
  position: relative;
  z-index: var(--z-base);
  width: min(100%, 30rem);
  padding: clamp(var(--space-6), 7vw, var(--space-10));
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-panel);
  background: var(--glass-panel-bg);
  box-shadow: var(--shadow-panel), var(--glass-highlight);
  backdrop-filter: blur(var(--glass-blur-panel))
    saturate(var(--glass-saturation));
}

.admin-login-card__intro {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.admin-login-card__mark {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-medium);
  background: var(--badge-accent-bg);
  color: var(--color-accent-soft);
  font-size: 1.35rem;
}

.admin-login-card__eyebrow {
  margin: 0;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
}

.admin-login-card h1,
.admin-login-card__intro p:last-child {
  margin: 0;
}

.admin-login-card h1 {
  font-size: clamp(2rem, 7vw, 3.25rem);
  line-height: 1.1;
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
  color: #fecdd3;
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

@media (width <= 30rem) {
  .admin-login-page {
    align-items: start;
    padding-top: var(--space-6);
  }

  .admin-login-card {
    border-radius: var(--radius-large);
  }
}
</style>
