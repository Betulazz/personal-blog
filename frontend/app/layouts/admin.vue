<script setup lang="ts">
import { useAdminSession } from '~/stores/adminSession'

const session = useAdminSession()
const route = useRoute()

const restoreSession = async (force = false) => {
  await session.restore(force)
  if (session.status === 'unauthenticated') {
    await navigateTo(
      {
        path: '/admin/login',
        query: { redirect: route.fullPath },
      },
      { replace: true },
    )
  }
}

onMounted(() => restoreSession())

watch(
  () => session.status,
  (status) => {
    if (status === 'unauthenticated' && import.meta.client) {
      void navigateTo(
        {
          path: '/admin/login',
          query: { redirect: route.fullPath },
        },
        { replace: true },
      )
    }
  },
)
</script>

<template>
  <AdminShell v-if="session.isAuthenticated">
    <slot />
  </AdminShell>
  <AdminState
    v-else
    :message="session.errorMessage"
    :status="session.status"
    @retry="restoreSession(true)"
  />
</template>
