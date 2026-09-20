import { computed } from 'vue'

import { chatterFixtureProvider } from '~/composables/chatterFixtures'
import type {
  ChatterCollectionResponse,
  ChatterProvider,
} from '~/types/chatter'
import type { PublicFeedQuery, PublicTag } from '~/types/public-content'
import { buildPublicFeedQuery } from '~/utils/public-content'

export function useChatter(provider: ChatterProvider = chatterFixtureProvider) {
  const route = useRoute()
  const query = computed<PublicFeedQuery>(() =>
    buildPublicFeedQuery(route.query),
  )

  const collection = useAsyncData<ChatterCollectionResponse | null>(
    () => `chatter:${JSON.stringify(query.value)}`,
    () => provider.listChatter(query.value),
    {
      deep: false,
      default: () => null,
      watch: [query],
    },
  )
  const taxonomy = useAsyncData<PublicTag[]>(
    'chatter-tags',
    () => provider.listTags(),
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
