import { computed } from 'vue'

import { useApiClient } from '~/api/client'
import type { MomentCollectionResponse, MomentProvider } from '~/types/moments'
import type { PublicFeedQuery, PublicTag } from '~/types/public-content'
import { buildPublicFeedQuery } from '~/utils/public-content'

export function createMomentProvider(
  client: Pick<
    ReturnType<typeof useApiClient>,
    'listMomentTags' | 'listMoments'
  >,
): MomentProvider {
  return {
    listMoments: client.listMoments,
    listTags: client.listMomentTags,
  }
}

export function useMoments(provider?: MomentProvider) {
  const activeProvider = provider ?? createMomentProvider(useApiClient())
  const route = useRoute()
  const query = computed<PublicFeedQuery>(() =>
    buildPublicFeedQuery(route.query),
  )

  const collection = useAsyncData<MomentCollectionResponse | null>(
    () => `moments:${JSON.stringify(query.value)}`,
    (_nuxtApp, { signal }) => activeProvider.listMoments(query.value, signal),
    {
      deep: false,
      default: () => null,
      watch: [query],
    },
  )
  const taxonomy = useAsyncData<PublicTag[]>(
    'moments-tags',
    (_nuxtApp, { signal }) => activeProvider.listTags(signal),
    { deep: false, default: () => [] },
  )

  return {
    data: collection.data,
    error: computed(() => collection.error.value ?? taxonomy.error.value),
    pending: computed(() => collection.pending.value || taxonomy.pending.value),
    query,
    refresh: async () => {
      await Promise.all([collection.refresh(), taxonomy.refresh()])
    },
    tags: taxonomy.data,
  }
}
