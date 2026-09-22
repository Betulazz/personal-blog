import { describe, expect, it } from 'vitest'

import {
  musicSourceStrategies,
  validateMusicArtwork,
  validateMusicSource,
} from '../../app/utils/music-source'

describe('music source strategies', () => {
  it('offers only the supported legal media strategies', () => {
    expect(musicSourceStrategies.map((strategy) => strategy.value)).toEqual([
      'local_media',
      'remote_url',
      's3_media',
    ])
    expect(
      musicSourceStrategies.every(
        (strategy) =>
          Boolean(strategy.label) &&
          Boolean(strategy.description) &&
          !/搜索|抓取|代理|镜像/.test(
            `${strategy.label}${strategy.description}`,
          ),
      ),
    ).toBe(true)
  })
})

describe('validateMusicSource', () => {
  it('accepts safe remote and S3-compatible URLs', () => {
    expect(
      validateMusicSource('remote_url', 'https://cdn.example.com/music/a.mp3'),
    ).toEqual({ message: '', valid: true })
    expect(
      validateMusicSource('s3_media', 'https://bucket.example.com/a.flac'),
    ).toEqual({ message: '', valid: true })
  })

  it('accepts only /uploads/ paths for local media', () => {
    expect(
      validateMusicSource('local_media', '/uploads/audio/ambient.mp3'),
    ).toEqual({ message: '', valid: true })
    expect(
      validateMusicSource('local_media', 'https://example.com/a.mp3').valid,
    ).toBe(false)
    expect(
      validateMusicSource('local_media', '/audio/a.mp3').message,
    ).toContain('/uploads/')
    expect(
      validateMusicSource('local_media', '/uploads/../private/a.mp3').valid,
    ).toBe(false)
    expect(
      validateMusicSource('local_media', '/uploads/%2e%2e/private/a.mp3').valid,
    ).toBe(false)
    expect(
      validateMusicSource('local_media', '/uploads/./audio/../private/a.mp3')
        .valid,
    ).toBe(false)
  })

  it('rejects remote sources that are not plain HTTP(S) media addresses', () => {
    expect(validateMusicSource('remote_url', '/uploads/a.mp3').valid).toBe(
      false,
    )
    expect(validateMusicSource('remote_url', 'javascript:alert(1)').valid).toBe(
      false,
    )
    expect(validateMusicSource('remote_url', 'not a url').valid).toBe(false)
    expect(
      validateMusicSource('remote_url', 'https://user:pass@example.com/a.mp3')
        .valid,
    ).toBe(false)
    expect(
      validateMusicSource('remote_url', 'https://example.com/a.mp3?token=1')
        .valid,
    ).toBe(false)
    expect(
      validateMusicSource('remote_url', 'https://example.com/a.mp3#secret')
        .valid,
    ).toBe(false)
    expect(
      validateMusicSource('remote_url', 'https://example.com\\a.mp3').valid,
    ).toBe(false)
  })

  it('explains every unsafe address it refuses', () => {
    for (const [strategy, value] of [
      ['local_media', 'https://example.com/a.mp3'],
      ['remote_url', '/uploads/a.mp3'],
      ['remote_url', ''],
      ['local_media', '   '],
    ] as const) {
      const result = validateMusicSource(strategy, value)
      expect(result.valid).toBe(false)
      expect(result.message.length).toBeGreaterThan(0)
    }
  })
})

describe('validateMusicArtwork', () => {
  it('treats artwork as optional', () => {
    expect(validateMusicArtwork('')).toEqual({ message: '', valid: true })
    expect(validateMusicArtwork('   ')).toEqual({ message: '', valid: true })
  })

  it('accepts safe HTTP(S) and /uploads/ artwork references', () => {
    expect(validateMusicArtwork('https://example.com/cover.webp')).toEqual({
      message: '',
      valid: true,
    })
    expect(validateMusicArtwork('/uploads/images/cover.webp')).toEqual({
      message: '',
      valid: true,
    })
  })

  it('rejects unsafe artwork references', () => {
    expect(validateMusicArtwork('//evil.example.com/cover.webp').valid).toBe(
      false,
    )
    expect(validateMusicArtwork('javascript:alert(1)').valid).toBe(false)
    expect(
      validateMusicArtwork('https://user:pass@example.com/cover.webp').valid,
    ).toBe(false)
    expect(validateMusicArtwork('/uploads/../cover.webp').valid).toBe(false)
  })
})
