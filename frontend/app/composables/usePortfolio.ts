import { portfolioFixtureProvider } from '~/composables/portfolioFixtures'
import type {
  AboutProfile,
  FriendCollectionResponse,
  PortfolioProvider,
  ProjectCollectionResponse,
} from '~/types/portfolio'

export function useProjects(
  provider: PortfolioProvider = portfolioFixtureProvider,
) {
  return useAsyncData<ProjectCollectionResponse>(
    'public-projects',
    provider.listProjects,
    { deep: false },
  )
}

export function useFriends(
  provider: PortfolioProvider = portfolioFixtureProvider,
) {
  return useAsyncData<FriendCollectionResponse>(
    'public-friends',
    provider.listFriends,
    { deep: false },
  )
}

export function useAbout(
  provider: PortfolioProvider = portfolioFixtureProvider,
) {
  return useAsyncData<AboutProfile>('public-about', provider.getAbout, {
    deep: false,
  })
}
