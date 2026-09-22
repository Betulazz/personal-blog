import { BlogApiError } from '~/api/client'

export function adminMusicError(error: unknown) {
  if (!(error instanceof BlogApiError)) {
    return '音乐操作失败，当前输入仍然保留。'
  }
  if (error.status === 401) {
    return '会话已过期，请重新登录；当前音源配置仍然保留。'
  }
  if (error.status === 403) return '当前账号没有管理音乐播放器的权限。'
  if (error.status === 404) return '这条音乐已经不存在，可能已被删除。'
  if (error.status === 422) {
    return error.code === 'invalid_music_source'
      ? '音源地址与来源策略不匹配，请检查后重试；当前输入仍然保留。'
      : '请检查字段格式与长度，当前输入仍然保留。'
  }
  if (error.status === 0 || error.status >= 500) {
    return '后台服务暂时无法响应，当前音乐配置仍然保留。'
  }
  return '音乐操作失败，当前输入仍然保留。'
}

export function adminMusicLoadError(error: unknown) {
  if (
    error instanceof BlogApiError &&
    (error.status === 0 || error.status >= 500)
  ) {
    return '后台服务暂时无法响应，请稍后重试。'
  }
  return '音乐列表暂时无法加载，请稍后重试。'
}
