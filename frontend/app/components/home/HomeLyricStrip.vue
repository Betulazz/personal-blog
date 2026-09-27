<script setup lang="ts">
import { AudioLines } from 'lucide-vue-next'

import { useMusicTracks } from '~/composables/useMusicTracks'
import { useMusicPlayerStore } from '~/stores/musicPlayer'
import { getActiveMusicLyricIndex } from '~/utils/music-lyrics'

const player = useMusicPlayerStore()
const { error: trackError, pending: tracksPending } = await useMusicTracks()

const currentLyric = computed(() => {
  const track = player.currentTrack
  const lyrics = player.lyrics

  if (
    !track ||
    player.error ||
    !player.hasClockPosition ||
    player.lyricsTrackId !== track.id ||
    player.lyricsStatus !== 'ready' ||
    !lyrics ||
    lyrics.status !== 'available'
  ) {
    return null
  }

  const activeIndex = getActiveMusicLyricIndex(
    lyrics.lines,
    player.currentTime * 1000,
  )
  return activeIndex < 0 ? null : (lyrics.lines[activeIndex]?.text ?? null)
})

const lyricMessage = computed(() => {
  if (!player.currentTrack) {
    if (tracksPending.value) return '正在加载音乐…'
    if (trackError.value) return '歌单暂时无法加载'
    return '暂无可播放歌曲'
  }
  if (player.error === 'source-unavailable') return '当前歌曲暂不可用'
  if (player.error === 'autoplay-blocked') return '请点击播放以继续'
  if (player.error === 'playback-failed') return '播放暂时失败'
  if (player.lyricsTrackId !== player.currentTrack.id) return '正在同步歌词…'
  if (player.lyricsStatus === 'loading' || player.lyricsStatus === 'idle') {
    return '正在同步歌词…'
  }
  if (player.lyricsStatus === 'error') return '歌词暂时无法加载'
  if (
    player.lyricsStatus === 'ready' &&
    (player.lyrics?.status !== 'available' ||
      !player.lyrics.lines.some((line) => Number.isFinite(line.timeMs)))
  ) {
    return '暂无同步歌词'
  }
  if (!player.hasClockPosition) return '播放或定位后显示同步歌词'
  return '前奏 · 歌词尚未开始'
})

const displayedText = computed(() => currentLyric.value || lyricMessage.value)
</script>

<template>
  <UiGlassPanel
    as="section"
    class="home-lyrics"
    padding="compact"
    aria-label="当前歌词"
    data-testid="home-lyric-strip"
  >
    <AudioLines class="home-lyrics__icon" :size="22" aria-hidden="true" />
    <div class="home-lyrics__content">
      <p class="home-lyrics__eyebrow">
        {{ player.currentTrack ? player.currentTrack.title : '此刻的旋律' }}
      </p>
      <Transition name="lyric-reveal" mode="out-in">
        <p :key="displayedText" class="home-lyrics__line" aria-live="off">
          {{ displayedText }}
        </p>
      </Transition>
    </div>
    <span class="home-lyrics__mark" aria-hidden="true">“</span>
  </UiGlassPanel>
</template>

<style scoped>
.home-lyrics {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 6rem;
  align-items: center;
  gap: var(--space-5);
  overflow: hidden;
  padding: var(--space-5) var(--space-8);
  border-color: rgb(144 158 255 / 23%);
  background:
    radial-gradient(ellipse at 8% 50%, rgb(99 109 216 / 18%), transparent 58%),
    var(--glass-subtle-bg);
}

.home-lyrics__icon {
  flex: 0 0 auto;
  color: var(--color-accent-soft);
}

.home-lyrics__content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: var(--space-2);
}

.home-lyrics__eyebrow,
.home-lyrics__line {
  margin: 0;
  overflow-wrap: anywhere;
}

.home-lyrics__eyebrow {
  color: var(--color-text-subtle);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-label);
}

.home-lyrics__line {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(1.05rem, 2vw, 1.4rem);
  line-height: var(--leading-body);
  text-wrap: pretty;
}

.home-lyrics__mark {
  position: absolute;
  right: var(--space-5);
  bottom: -1.8rem;
  color: rgb(170 179 255 / 9%);
  font-family: var(--font-display);
  font-size: 8rem;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.lyric-reveal-enter-active,
.lyric-reveal-leave-active {
  transition:
    opacity var(--motion-duration-normal) var(--motion-ease-standard),
    transform var(--motion-duration-normal) var(--motion-ease-standard),
    filter var(--motion-duration-normal) var(--motion-ease-standard);
}

.lyric-reveal-enter-from {
  filter: blur(3px);
  opacity: 0;
  transform: translateY(0.35rem);
}

.lyric-reveal-leave-to {
  filter: blur(2px);
  opacity: 0;
  transform: translateY(-0.2rem);
}

@media (width <= 48rem) {
  .home-lyrics {
    min-height: 5.5rem;
    gap: var(--space-4);
    padding: var(--space-5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lyric-reveal-enter-active,
  .lyric-reveal-leave-active {
    transition: none;
  }

  .lyric-reveal-enter-from,
  .lyric-reveal-leave-to {
    filter: none;
    transform: none;
  }
}
</style>
