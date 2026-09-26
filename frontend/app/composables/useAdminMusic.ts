import { BlogApiError } from '~/api/client'

export function adminMusicError(error: unknown) {
  if (!(error instanceof BlogApiError)) {
    return '音乐操作失败，当前输入仍然保留。'
  }
  if (error.status === 401) {
    return '会话已过期，请重新登录；当前音源配置仍然保留。'
  }
  if (error.status === 403) return '当前账号没有管理音乐播放器的权限。'
  if (error.status === 404) {
    return error.code === 'netease_track_not_found'
      ? '网易云没有找到这首歌曲，请检查歌曲 ID。'
      : '这条音乐已经不存在，可能已被删除。'
  }
  if (error.status === 409 && error.code === 'music_track_duplicate') {
    return '这首歌已经在播放列表中。'
  }
  if (error.status === 422) {
    return '歌曲 ID 或列表设置格式不正确，请检查后重试。'
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
