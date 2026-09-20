import { computed } from 'vue'

import { momentFixtureProvider } from '~/composables/momentFixtures'
import type { MomentCollectionResponse, MomentProvider } from '~/types/moments'
import type { PublicFeedQuery, PublicTag } from '~/types/public-content'
import { buildPublicFeedQuery } from '~/utils/public-content'

export function useMoments(provider: MomentProvider = momentFixtureProvider) {
  const route = useRoute()
  const query = computed<PublicFeedQuery>(() =>
    buildPublicFeedQuery(route.query),
  )

  const collection = useAsyncData<MomentCollectionResponse | null>(
    () => `moments:${JSON.stringify(query.value)}`,
    () => provider.listMoments(query.value),
    {
      deep: false,
      default: () => null,
      watch: [query],
    },
  )
  const taxonomy = useAsyncData<PublicTag[]>(
    'moments-tags',
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
