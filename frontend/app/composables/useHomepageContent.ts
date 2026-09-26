import { computed } from 'vue'

import { useApiClient } from '~/api/client'
import {
  createHomepageContentProvider,
  type HomepageContentProvider,
} from '~/composables/homepageProvider'
import type {
  HomepageChatter,
  HomepageCollectionResponse,
  HomepageContent,
  HomepagePost,
  HomepageProject,
  HomepageSectionKey,
} from '~/types/homepage'
import { toHomepageSection } from '~/utils/homepage'

const useHomepageCollection = <T>(
  key: string,
  loader: (signal?: AbortSignal) => Promise<T>,
) =>
  useAsyncData<T | null>(key, (_nuxtApp, { signal }) => loader(signal), {
    deep: false,
    default: () => null,
  })

const createHomepageStat = (label: string, detail: string, total: number) => ({
  detail,
  label,
  value: String(total).padStart(2, '0'),
})

export async function useHomepageContent(provider?: HomepageContentProvider) {
  const activeProvider =
    provider ?? createHomepageContentProvider(useApiClient())
  const {
    data: chatter,
    error: chatterError,
    pending: chatterPending,
    refresh: refreshChatter,
  } = useHomepageCollection<HomepageCollectionResponse<HomepageChatter>>(
    'homepage-chatter',
    activeProvider.getChatter,
  )
  const {
    data: posts,
    error: postsError,
    pending: postsPending,
    refresh: refreshPosts,
  } = useHomepageCollection<HomepageCollectionResponse<HomepagePost>>(
    'homepage-posts',
    activeProvider.getPosts,
  )
  const {
    data: projects,
    error: projectsError,
    pending: projectsPending,
    refresh: refreshProjects,
  } = useHomepageCollection<HomepageCollectionResponse<HomepageProject>>(
    'homepage-projects',
    activeProvider.getProjects,
  )

  const content = computed<HomepageContent>(() => ({
    chatter: toHomepageSection(
      chatter.value,
      chatterPending.value,
      chatterError.value,
      '最近杂谈',
    ),
    posts: toHomepageSection(
      posts.value,
      postsPending.value,
      postsError.value,
      '最新文章',
    ),
    projects: toHomepageSection(
      projects.value,
      projectsPending.value,
      projectsError.value,
      '精选项目',
    ),
    stats: [
      createHomepageStat(
        '公开文章',
        '持续更新',
        posts.value?.pagination.total ?? 0,
      ),
      createHomepageStat(
        '公开杂谈',
        '随心记录',
        chatter.value?.pagination.total ?? 0,
      ),
      createHomepageStat(
        '精选项目',
        '正在维护',
        projects.value?.pagination.total ?? 0,
      ),
    ],
  }))

  const refreshers: Record<HomepageSectionKey, () => Promise<unknown>> = {
    chatter: refreshChatter,
    posts: refreshPosts,
    projects: refreshProjects,
  }

  const retry = (section: HomepageSectionKey) => refreshers[section]()

  return { content, retry }
}
