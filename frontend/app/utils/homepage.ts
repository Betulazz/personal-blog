import type {
  HomepageCollectionResponse,
  HomepageSection,
} from '../types/homepage'

export const toHomepageSection = <T>(
  response: HomepageCollectionResponse<T> | null | undefined,
  pending: boolean,
  error: unknown,
  label: string,
): HomepageSection<T> => ({
  items: response?.data ?? [],
  status: pending
    ? 'loading'
    : error
      ? response?.data.length
        ? 'partial-error'
        : 'error'
      : response?.data.length
        ? 'ready'
        : 'empty',
  ...(error
    ? {
        error: {
          message:
            error instanceof Error && error.message
              ? error.message
              : `${label}暂时不可用，请稍后再试。`,
        },
      }
    : {}),
})

export function formatHomepageDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).format(new Date(value))
}
