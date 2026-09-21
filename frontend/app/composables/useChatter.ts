import { computed } from 'vue'

import { useApiClient } from '~/api/client'
import type {
  ChatterCollectionResponse,
  ChatterProvider,
} from '~/types/chatter'
import type { PublicFeedQuery, PublicTag } from '~/types/public-content'
import { buildPublicFeedQuery } from '~/utils/public-content'

export function createChatterProvider(
  client: Pick<
    ReturnType<typeof useApiClient>,
    'listChatter' | 'listChatterTags'
  >,
): ChatterProvider {
  return {
    listChatter: client.listChatter,
    listTags: client.listChatterTags,
  }
}

export function useChatter(provider?: ChatterProvider) {
  const activeProvider = provider ?? createChatterProvider(useApiClient())
  const route = useRoute()
  const query = computed<PublicFeedQuery>(() =>
    buildPublicFeedQuery(route.query),
  )

  const collection = useAsyncData<ChatterCollectionResponse | null>(
    () => `chatter:${JSON.stringify(query.value)}`,
    (_nuxtApp, { signal }) => activeProvider.listChatter(query.value, signal),
    {
      deep: false,
      default: () => null,
      watch: [query],
    },
  )
  const taxonomy = useAsyncData<PublicTag[]>(
    'chatter-tags',
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
