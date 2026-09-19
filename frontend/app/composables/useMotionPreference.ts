import { onBeforeUnmount, onMounted, ref } from 'vue'

type MotionPreferenceOptions = {
  disableOnMobile?: boolean
}

export function useMotionPreference(options: MotionPreferenceOptions = {}) {
  const motionEnabled = ref(false)
  let reducedMotionQuery: MediaQueryList | undefined
  let mobileViewportQuery: MediaQueryList | undefined

  const updatePreference = () => {
    const enabled = Boolean(
      reducedMotionQuery &&
      !reducedMotionQuery.matches &&
      (!options.disableOnMobile || !mobileViewportQuery?.matches),
    )
    motionEnabled.value = enabled
  }

  onMounted(() => {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mobileViewportQuery = window.matchMedia('(width <= 48rem)')
    updatePreference()

    reducedMotionQuery.addEventListener('change', updatePreference)
    mobileViewportQuery.addEventListener('change', updatePreference)
  })

  onBeforeUnmount(() => {
    reducedMotionQuery?.removeEventListener('change', updatePreference)
    mobileViewportQuery?.removeEventListener('change', updatePreference)
  })

  return motionEnabled
}
