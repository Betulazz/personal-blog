import { installContinuousEffectPause } from '~/composables/useContinuousEffectPause'

export default defineNuxtPlugin(() => {
  installContinuousEffectPause()
})
