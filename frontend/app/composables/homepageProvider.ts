import { homepageFixtures } from '~/composables/homepageFixtures'
import type {
  HomepageChatter,
  HomepageCollectionResponse,
  HomepageMoment,
  HomepagePost,
  HomepageProject,
  HomepageStat,
} from '~/types/homepage'

export interface HomepageContentProvider {
  getChatter: () => Promise<HomepageCollectionResponse<HomepageChatter>>
  getMoments: () => Promise<HomepageCollectionResponse<HomepageMoment>>
  getPosts: () => Promise<HomepageCollectionResponse<HomepagePost>>
  getProjects: () => Promise<HomepageCollectionResponse<HomepageProject>>
  getStats: () => HomepageStat[]
}

export const homepageFixtureProvider: HomepageContentProvider = {
  getChatter: () => Promise.resolve(homepageFixtures.chatter),
  getMoments: () => Promise.resolve(homepageFixtures.moments),
  getPosts: () => Promise.resolve(homepageFixtures.posts),
  getProjects: () => Promise.resolve(homepageFixtures.projects),
  getStats: () => homepageFixtures.stats,
}
