import type { BlogApiClient } from '~/api/client'
import type {
  HomepageChatter,
  HomepageCollectionResponse,
  HomepagePost,
  HomepageProject,
} from '~/types/homepage'

export interface HomepageContentProvider {
  getChatter: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageChatter>>
  getPosts: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepagePost>>
  getProjects: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageProject>>
}

export const createHomepageContentProvider = (
  client: BlogApiClient,
): HomepageContentProvider => ({
  getChatter: client.listHomepageChatter,
  getPosts: client.listHomepagePosts,
  getProjects: client.listHomepageProjects,
})
