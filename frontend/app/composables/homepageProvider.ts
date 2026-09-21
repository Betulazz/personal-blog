import type { BlogApiClient } from '~/api/client'
import type {
  HomepageChatter,
  HomepageCollectionResponse,
  HomepageMoment,
  HomepagePost,
  HomepageProject,
} from '~/types/homepage'

export interface HomepageContentProvider {
  getChatter: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageChatter>>
  getMoments: (
    signal?: AbortSignal,
  ) => Promise<HomepageCollectionResponse<HomepageMoment>>
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
  getMoments: client.listHomepageMoments,
  getPosts: client.listHomepagePosts,
  getProjects: client.listHomepageProjects,
})
