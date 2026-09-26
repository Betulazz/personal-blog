import { computed } from 'vue'

import { useApiClient } from '~/api/client'
import type {
  ChatterCollectionResponse,
  ChatterProvider,
} from '~/types/chatter'
import type { PublicFeedQuery } from '~/types/public-content'
import { buildPublicFeedQuery } from '~/utils/public-content'

export function createChatterProvider(
  client: Pick<ReturnType<typeof useApiClient>, 'listChatter'>,
): ChatterProvider {
  return {
    listChatter: client.listChatter,
  }
}

export function useChatter(provider?: ChatterProvider) {
  const activeProvider = provider ?? createChatterProvider(useApiClient())
  const route = useRoute()
  const query = computed<PublicFeedQuery>(() =>
    buildPublicFeedQuery({ ...route.query, tag: undefined }),
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

  return {
    data: collection.data,
    error: computed(() => collection.error.value),
    pending: computed(() => collection.pending.value),
    query,
    refresh: async () => {
      await collection.refresh()
    },
  }
}
