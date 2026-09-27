import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import { motionTransitions } from '../../app/config/motion'
import {
  parseMotionDuration,
  parseMotionEase,
} from '../../app/utils/motion-tokens'

const appDirectory = resolve(process.cwd(), 'app')
const tokensFile = join(appDirectory, 'assets', 'css', 'tokens.css')

const collectSourceFiles = (directory: string): string[] => {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path))
      continue
    }
    if (/\.(?:css|vue)$/.test(entry.name)) {
      files.push(path)
    }
  }
  return files
}

const declarationsIn = (source: string) => {
  const pattern =
    /(?:animation|transition)(?:-(?:delay|duration))?\s*:\s*([^;{}]+)/g
  return [...source.matchAll(pattern)].map((match) => match[1])
}

describe('motion tokens', () => {
  const files = collectSourceFiles(appDirectory)
  const tokens = readFileSync(tokensFile, 'utf8')

  it('keeps every animation and transition free of raw time values', () => {
    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const declaration of declarationsIn(source)) {
        const times = declaration.match(/(?<![\w-])\d*\.?\d+(?:ms|s)\b/g)
        if (!times) {
          continue
        }
        for (const time of times) {
          if (time === '0.01ms') {
            continue
          }
          offenders.push(
            `${relative(appDirectory, file).split(sep).join('/')}: ${declaration.trim()}`,
          )
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('only references motion variables that tokens.css defines', () => {
    const defined = new Set(
      [...tokens.matchAll(/(--motion-[\w-]+)\s*:/g)].map((match) => match[1]),
    )
    const missing: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/var\((--motion-[\w-]+)/g)) {
        if (!defined.has(match[1])) {
          missing.push(
            `${relative(appDirectory, file).split(sep).join('/')}: ${match[1]}`,
          )
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('orders durations from fast to shimmer and removes them for reduced motion', () => {
    const read = (name: string) => {
      const raw = tokens.match(new RegExp(`${name}:\\s*([\\d.]+(?:ms|s))`))?.[1]
      return raw ? parseMotionDuration(raw, Number.NaN) * 1000 : Number.NaN
    }
    expect(read('--motion-duration-fast')).toBeLessThan(
      read('--motion-duration-normal'),
    )
    expect(read('--motion-duration-normal')).toBeLessThan(
      read('--motion-duration-slow'),
    )
    expect(read('--motion-duration-header')).toBe(500)
    expect(read('--motion-duration-ripple')).toBe(620)
    expect(read('--motion-duration-immediate')).toBe(0.01)
    expect(read('--motion-duration-slow')).toBeLessThan(
      read('--motion-duration-shimmer'),
    )
    expect(read('--motion-duration-background-crossfade')).toBe(1200)

    const reducedMotion = tokens.slice(
      tokens.indexOf('@media (prefers-reduced-motion: reduce)'),
    )
    for (const token of [
      '--motion-duration-fast',
      '--motion-duration-normal',
      '--motion-duration-slow',
      '--motion-duration-shimmer',
      '--motion-delay-entry-stagger',
      '--motion-duration-background-crossfade',
      '--motion-duration-header',
      '--motion-duration-ripple',
      '--motion-duration-immediate',
    ]) {
      expect(reducedMotion).toContain(token)
    }
  })

  it('keeps motion-v fallbacks aligned with the CSS tokens', () => {
    const tokenSeconds = (name: string) => {
      const raw = tokens.match(new RegExp(`${name}:\\s*([\\d.]+(?:ms|s))`))?.[1]
      expect(raw, name).toBeTruthy()
      return parseMotionDuration(raw!, Number.NaN)
    }

    expect(tokenSeconds('--motion-duration-slow')).toBe(
      motionTransitions.entry.duration,
    )
    expect(tokenSeconds('--motion-duration-normal')).toBe(
      motionTransitions.menu.duration,
    )
    expect(tokenSeconds('--motion-delay-entry-stagger')).toBe(
      motionTransitions.entryStagger.delay,
    )
    expect(tokenSeconds('--motion-duration-shimmer')).toBe(1.8)
  })
})

describe('motion transition configuration', () => {
  it('parses CSS durations into motion-v seconds', () => {
    expect(parseMotionDuration('480ms', 1)).toBe(0.48)
    expect(parseMotionDuration('1.8s', 1)).toBe(1.8)
    expect(parseMotionDuration('', 0.22)).toBe(0.22)
    expect(parseMotionDuration('not-a-time', 0.14)).toBe(0.14)
  })

  it('parses cubic-bezier easing and falls back for invalid values', () => {
    const fallback: [number, number, number, number] = [0, 0, 0, 0]
    expect(parseMotionEase('cubic-bezier(0.2, 0.8, 0.2, 1)', fallback)).toEqual(
      [0.2, 0.8, 0.2, 1],
    )
    expect(parseMotionEase('ease-in-out', fallback)).toEqual(fallback)
  })

  it('exposes documented fallback values without loaded stylesheets', () => {
    expect(motionTransitions.entry.duration).toBe(0.48)
    expect(motionTransitions.entry.ease).toEqual([0.2, 0.8, 0.2, 1])
    expect(motionTransitions.menu.duration).toBe(0.22)
    expect(motionTransitions.entryStagger.delay).toBe(0.14)
  })
})
