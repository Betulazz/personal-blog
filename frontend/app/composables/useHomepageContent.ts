import { computed } from 'vue'

import { toHomepageSection } from '~/utils/homepage'
import {
  homepageFixtureProvider,
  type HomepageContentProvider,
} from '~/composables/homepageProvider'
import type {
  HomepageChatter,
  HomepageCollectionResponse,
  HomepageContent,
  HomepageMoment,
  HomepagePost,
  HomepageProject,
  HomepageSectionKey,
} from '~/types/homepage'

const useHomepageCollection = <T>(key: string, loader: () => Promise<T>) =>
  useAsyncData<T>(key, loader, { deep: false })

export function useHomepageContent(
  provider: HomepageContentProvider = homepageFixtureProvider,
) {
  const {
    data: chatter,
    error: chatterError,
    pending: chatterPending,
    refresh: refreshChatter,
  } = useHomepageCollection<HomepageCollectionResponse<HomepageChatter>>(
    'homepage-chatter',
    provider.getChatter,
  )
  const {
    data: moments,
    error: momentsError,
    pending: momentsPending,
    refresh: refreshMoments,
  } = useHomepageCollection<HomepageCollectionResponse<HomepageMoment>>(
    'homepage-moments',
    provider.getMoments,
  )
  const {
    data: posts,
    error: postsError,
    pending: postsPending,
    refresh: refreshPosts,
  } = useHomepageCollection<HomepageCollectionResponse<HomepagePost>>(
    'homepage-posts',
    provider.getPosts,
  )
  const {
    data: projects,
    error: projectsError,
    pending: projectsPending,
    refresh: refreshProjects,
  } = useHomepageCollection<HomepageCollectionResponse<HomepageProject>>(
    'homepage-projects',
    provider.getProjects,
  )

  const content = computed<HomepageContent>(() => ({
    chatter: toHomepageSection(
      chatter.value,
      chatterPending.value,
      chatterError.value,
      '最近杂谈',
    ),
    moments: toHomepageSection(
      moments.value,
      momentsPending.value,
      momentsError.value,
      '最近动态',
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
    stats: provider.getStats(),
  }))

  const refreshers: Record<HomepageSectionKey, () => Promise<unknown>> = {
    chatter: refreshChatter,
    moments: refreshMoments,
    posts: refreshPosts,
    projects: refreshProjects,
  }

  const retry = (section: HomepageSectionKey) => refreshers[section]()

  return {
    content,
    retry,
  }
}
