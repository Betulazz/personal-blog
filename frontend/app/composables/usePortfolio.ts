import { computed } from 'vue'

import { toPublicAbout, useApiClient } from '~/api/client'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'
import type {
  AboutProfile,
  FriendCollectionResponse,
  PortfolioProvider,
  ProjectCollectionResponse,
} from '~/types/portfolio'

export function createPortfolioProvider(
  client: Pick<
    ReturnType<typeof useApiClient>,
    'getAbout' | 'listFriends' | 'listProjects'
  >,
): PortfolioProvider {
  return {
    getAbout: client.getAbout,
    listFriends: client.listFriends,
    listProjects: client.listProjects,
  }
}

export function useProjects(provider?: PortfolioProvider) {
  const activeProvider = provider ?? createPortfolioProvider(useApiClient())
  return useAsyncData<ProjectCollectionResponse>(
    'public-projects',
    (_nuxtApp, { signal }) => activeProvider.listProjects(signal),
    { deep: false },
  )
}

export function useFriends(provider?: PortfolioProvider) {
  const activeProvider = provider ?? createPortfolioProvider(useApiClient())
  return useAsyncData<FriendCollectionResponse>(
    'public-friends',
    (_nuxtApp, { signal }) => activeProvider.listFriends(signal),
    { deep: false },
  )
}

export async function useAbout(provider?: PortfolioProvider) {
  if (provider) {
    return useAsyncData<AboutProfile>(
      'public-about',
      (_nuxtApp, { signal }) => provider.getAbout(signal),
      { deep: false },
    )
  }

  const settingsResult = await usePublicSiteSettings()
  return {
    ...settingsResult,
    data: computed(() => toPublicAbout(settingsResult.settings.value)),
  }
}
