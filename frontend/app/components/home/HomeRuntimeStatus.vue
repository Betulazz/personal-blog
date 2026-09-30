<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useApiClient } from '~/api/client'
import type { RuntimeUptimeStatus } from '~/types/runtime'

const props = defineProps<{
  icp: string
  initialUptimeSeconds: number | null
  initiallyFailed: boolean
}>()
const api = useApiClient()
const localTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  second: '2-digit',
})
const uptimeSeconds = ref<number | null>(props.initialUptimeSeconds)
const lastSampleAt = ref(0)
const monotonicNow = ref(0)
const isAvailable = ref(uptimeSeconds.value !== null)
const hasRuntimeError = ref(props.initiallyFailed)
const localTime = ref('--:--:--')
const displayedUptime = computed(() => {
  if (uptimeSeconds.value === null) return null
  const elapsed =
    monotonicNow.value > 0
      ? Math.max(0, (monotonicNow.value - lastSampleAt.value) / 1_000)
      : 0
  return Math.floor(uptimeSeconds.value + elapsed)
})
const uptimeLabel = computed(() => {
  if (displayedUptime.value === null) return ''
  const days = Math.floor(displayedUptime.value / 86_400)
  const hours = Math.floor((displayedUptime.value % 86_400) / 3_600)
  const minutes = Math.floor((displayedUptime.value % 3_600) / 60)

  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分钟`
  if (minutes > 0) return `${minutes}分钟`
  return `${displayedUptime.value}秒`
})
const icp = computed(() => props.icp.trim())

const updateLocalTime = () => {
  localTime.value = localTimeFormatter.format(new Date())
}

const syncUptime = async () => {
  try {
    const status: RuntimeUptimeStatus = await api.getRuntimeUptime()
    uptimeSeconds.value = status.uptimeSeconds
    lastSampleAt.value = performance.now()
    monotonicNow.value = lastSampleAt.value
    isAvailable.value = true
    hasRuntimeError.value = false
  } catch {
    isAvailable.value = false
    hasRuntimeError.value = true
  }
}

const syncWhenVisible = () => {
  if (document.visibilityState === 'visible') void syncUptime()
}

let clockTimer: ReturnType<typeof setInterval> | undefined
let uptimeTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  const now = performance.now()
  lastSampleAt.value = now
  monotonicNow.value = now
  updateLocalTime()
  if (!isAvailable.value) void syncUptime()
  clockTimer = setInterval(() => {
    monotonicNow.value = performance.now()
    updateLocalTime()
  }, 1_000)
  uptimeTimer = setInterval(() => void syncUptime(), 60_000)
  document.addEventListener('visibilitychange', syncWhenVisible)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (uptimeTimer) clearInterval(uptimeTimer)
  document.removeEventListener('visibilitychange', syncWhenVisible)
})
</script>

<template>
  <section
    class="home-runtime-status"
    aria-label="网站运行状态"
    data-home-runtime-status
  >
    <div class="home-runtime-status__clock">
      <time aria-label="本地时间">{{ localTime }}</time>
    </div>

    <div class="home-runtime-status__details">
      <p class="home-runtime-status__uptime">
        <span
          class="home-runtime-status__indicator"
          :class="{
            'home-runtime-status__indicator--offline': !isAvailable,
          }"
          aria-hidden="true"
        />
        <span>{{ isAvailable ? '服务运行中' : '运行状态暂不可用' }}</span>
        <span
          v-if="isAvailable && uptimeLabel"
          class="home-runtime-status__elapsed"
        >
          累计运行 {{ uptimeLabel }}
        </span>
      </p>

      <ul class="home-runtime-status__stack" aria-label="项目技术栈">
        <li>Nuxt 4</li>
        <li>Vue 3</li>
        <li>FastAPI</li>
        <li>MySQL 8.4</li>
      </ul>

      <p v-if="icp" class="home-runtime-status__icp">{{ icp }}</p>
      <p v-else-if="hasRuntimeError" class="home-runtime-status__icp">
        服务恢复后会自动同步累计时长
      </p>
    </div>
  </section>
</template>

<style scoped>
.home-runtime-status {
  display: grid;
  grid-template-columns: minmax(13rem, 0.72fr) minmax(0, 2.8fr);
  overflow: hidden;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-panel);
  background: var(--glass-subtle-bg);
  box-shadow: var(--shadow-card);
}

.home-runtime-status__clock {
  display: grid;
  min-height: 5.5rem;
  align-items: center;
  padding-inline: clamp(var(--space-5), 3vw, var(--space-8));
  background: var(--color-text);
  color: var(--color-canvas-raised);
}

.home-runtime-status__clock time {
  font-family: var(--font-mono);
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.1em;
}

.home-runtime-status__details {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(12rem, 1fr) auto auto;
  align-items: center;
  gap: var(--space-4) var(--space-6);
  padding: var(--space-4) clamp(var(--space-4), 2.5vw, var(--space-8));
}

.home-runtime-status__uptime {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-small);
  font-weight: var(--font-weight-semibold);
}

.home-runtime-status__indicator {
  width: 0.55rem;
  height: 0.55rem;
  flex: 0 0 auto;
  border-radius: var(--radius-round);
  background: var(--color-success);
}

.home-runtime-status__indicator--offline {
  background: var(--color-text-subtle);
}

.home-runtime-status__elapsed {
  color: var(--color-accent-strong);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.home-runtime-status__stack {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-runtime-status__stack li {
  padding: 0.4rem 0.65rem;
  border: var(--border-hairline) solid var(--glass-border);
  border-radius: var(--radius-small);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  line-height: 1.35;
  white-space: nowrap;
}

.home-runtime-status__icp {
  max-width: 12rem;
  margin: 0;
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  line-height: 1.5;
  overflow-wrap: anywhere;
  text-align: right;
}

@media (width <= 64rem) {
  .home-runtime-status {
    grid-template-columns: minmax(10rem, 0.72fr) minmax(0, 2.8fr);
  }

  .home-runtime-status__details {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3) var(--space-4);
  }

  .home-runtime-status__uptime {
    grid-column: 1 / -1;
  }

  .home-runtime-status__stack {
    justify-content: flex-start;
  }
}

@media (width <= 48rem) {
  .home-runtime-status {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-runtime-status__clock {
    min-height: 4.75rem;
  }

  .home-runtime-status__details {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--space-4);
  }

  .home-runtime-status__uptime {
    flex-wrap: wrap;
  }

  .home-runtime-status__stack {
    justify-content: flex-start;
  }

  .home-runtime-status__icp {
    max-width: 100%;
    justify-self: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-runtime-status,
  .home-runtime-status * {
    transition: none;
  }
}
</style>
