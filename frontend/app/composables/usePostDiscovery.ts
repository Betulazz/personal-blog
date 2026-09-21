import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { useApiClient } from '~/api/client'
import {
  buildPostQuery,
  POST_MAX_PAGE_SIZE,
  type PostQueryContext,
} from '~/utils/post-discovery'
import type {
  PostCategory,
  PostCollectionResponse,
  PostDetail,
  PostDiscoveryProvider,
  PostSummary,
  PostTag,
  TaxonomyCollectionResponse,
} from '~/types/posts'

const createPostApiProvider = (): PostDiscoveryProvider => {
  const client = useApiClient()
  return {
    getPostBySlug: client.getPostBySlug,
    listCategories: client.listCategories,
    listPosts: client.listPosts,
    listTags: client.listTags,
  }
}

export interface UsePostDiscoveryOptions {
  categorySlug?: MaybeRefOrGetter<string | undefined>
  enabled?: MaybeRefOrGetter<boolean>
  tagSlug?: MaybeRefOrGetter<string | undefined>
}

const emptyResponse = (
  page: number,
  pageSize: number,
): PostCollectionResponse => ({
  data: [],
  filters: {},
  pagination: { page, pageSize, total: 0, totalPages: 0 },
})

export async function usePostDiscovery(
  options: UsePostDiscoveryOptions = {},
  provider?: PostDiscoveryProvider,
) {
  const activeProvider = provider ?? createPostApiProvider()
  const route = useRoute()
  const context = computed<PostQueryContext>(() => ({
    categorySlug: toValue(options.categorySlug),
    tagSlug: toValue(options.tagSlug),
  }))
  const query = computed(() => buildPostQuery(route.query, context.value))
  const enabled = computed(() => toValue(options.enabled) ?? true)
  const key = computed(
    () => `post-discovery:${JSON.stringify(query.value)}:${enabled.value}`,
  )

  const result = await useAsyncData<PostCollectionResponse | null>(
    key,
    (_nuxtApp, { signal }) =>
      enabled.value
        ? activeProvider.listPosts(query.value, signal)
        : Promise.resolve(
            emptyResponse(query.value.page, query.value.pageSize),
          ),
    {
      deep: false,
      default: () => null,
      watch: [query, enabled],
    },
  )

  return { ...result, query }
}

export async function usePostTaxonomy(provider?: PostDiscoveryProvider) {
  const activeProvider = provider ?? createPostApiProvider()
  const result = await useAsyncData<{
    categories: TaxonomyCollectionResponse<PostCategory>
    tags: TaxonomyCollectionResponse<PostTag>
  }>(
    'post-taxonomy',
    async (_nuxtApp, { signal }) => {
      const [categories, tags] = await Promise.all([
        activeProvider.listCategories(signal),
        activeProvider.listTags(signal),
      ])

      return { categories, tags }
    },
    { deep: false },
  )

  return {
    categories: computed(() => result.data.value?.categories.data ?? []),
    error: result.error,
    pending: result.pending,
    refresh: result.refresh,
    tags: computed(() => result.data.value?.tags.data ?? []),
  }
}

export async function usePostDetail(
  slug: MaybeRefOrGetter<string>,
  provider?: PostDiscoveryProvider,
) {
  const activeProvider = provider ?? createPostApiProvider()
  const normalizedSlug = computed(() => toValue(slug))
  const result = await useAsyncData<PostDetail | null>(
    () => `post-detail:${normalizedSlug.value}`,
    (_nuxtApp, { signal }) =>
      activeProvider.getPostBySlug(normalizedSlug.value, signal),
    {
      deep: false,
      default: () => null,
      watch: [normalizedSlug],
    },
  )

  return { ...result, slug: normalizedSlug }
}

export interface PostNeighbors {
  next: PostSummary | null
  previous: PostSummary | null
}

export async function usePostNeighbors(
  slug: MaybeRefOrGetter<string>,
  provider?: PostDiscoveryProvider,
) {
  const activeProvider = provider ?? createPostApiProvider()
  const normalizedSlug = computed(() => toValue(slug))
  const result = await useAsyncData<PostNeighbors | null>(
    () => `post-neighbors:${normalizedSlug.value}`,
    async (_nuxtApp, { signal }) => {
      const response = await activeProvider.listPosts(
        { page: 1, pageSize: POST_MAX_PAGE_SIZE },
        signal,
      )
      const index = response.data.findIndex(
        (post) => post.slug === normalizedSlug.value,
      )

      if (index === -1) {
        return null
      }

      return {
        next: response.data[index + 1] ?? null,
        previous: response.data[index - 1] ?? null,
      }
    },
    {
      deep: false,
      default: () => null,
      watch: [normalizedSlug],
    },
  )

  return { ...result, slug: normalizedSlug }
}
