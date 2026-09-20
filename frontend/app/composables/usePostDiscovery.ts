import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { postFixtureProvider } from '~/composables/postFixtures'
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
  provider: PostDiscoveryProvider = postFixtureProvider,
) {
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
    () =>
      enabled.value
        ? provider.listPosts(query.value)
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

export async function usePostTaxonomy(
  provider: PostDiscoveryProvider = postFixtureProvider,
) {
  const result = await useAsyncData<{
    categories: TaxonomyCollectionResponse<PostCategory>
    tags: TaxonomyCollectionResponse<PostTag>
  }>('post-taxonomy', async () => {
    const [categories, tags] = await Promise.all([
      provider.listCategories(),
      provider.listTags(),
    ])

    return { categories, tags }
  })

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
  provider: PostDiscoveryProvider = postFixtureProvider,
) {
  const normalizedSlug = computed(() => toValue(slug))
  const result = await useAsyncData<PostDetail | null>(
    () => `post-detail:${normalizedSlug.value}`,
    () => provider.getPostBySlug(normalizedSlug.value),
    {
      deep: false,
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
  provider: PostDiscoveryProvider = postFixtureProvider,
) {
  const normalizedSlug = computed(() => toValue(slug))
  const result = await useAsyncData<PostNeighbors | null>(
    () => `post-neighbors:${normalizedSlug.value}`,
    async () => {
      const response = await provider.listPosts({
        page: 1,
        pageSize: POST_MAX_PAGE_SIZE,
      })
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
      watch: [normalizedSlug],
    },
  )

  return { ...result, slug: normalizedSlug }
}
