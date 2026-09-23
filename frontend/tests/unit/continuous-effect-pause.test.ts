import { afterEach, describe, expect, it } from 'vitest'

import {
  shouldPauseContinuousEffect,
  useContinuousEffectPause,
} from '../../app/composables/useContinuousEffectPause'

type FakeEntry = { isIntersecting: boolean; target: Element }

class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = []

  readonly root = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds = []
  readonly observed = new Set<Element>()

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this)
  }

  disconnect() {
    this.observed.clear()
  }

  observe(target: Element) {
    this.observed.add(target)
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  unobserve(target: Element) {
    this.observed.delete(target)
  }

  trigger(entries: FakeEntry[]) {
    this.callback(
      entries as unknown as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    )
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const lastObserver = () =>
  FakeIntersectionObserver.instances[
    FakeIntersectionObserver.instances.length - 1
  ]

describe('continuous effect pausing', () => {
  const originalObserver = globalThis.IntersectionObserver

  const createElement = () => {
    const element = document.createElement('div')
    element.setAttribute('data-continuous-effect', '')
    document.body.append(element)
    return element
  }

  afterEach(() => {
    globalThis.IntersectionObserver = originalObserver
    FakeIntersectionObserver.instances = []
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-page-hidden')
    Reflect.deleteProperty(document, 'hidden')
  })

  it('pauses effects that leave the viewport and resumes them in view', () => {
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    const element = createElement()
    const handle = useContinuousEffectPause()

    lastObserver().trigger([{ isIntersecting: true, target: element }])
    expect(element.hasAttribute('data-effect-paused')).toBe(false)

    lastObserver().trigger([{ isIntersecting: false, target: element }])
    expect(element.getAttribute('data-effect-paused')).toBe('true')

    lastObserver().trigger([{ isIntersecting: true, target: element }])
    expect(element.hasAttribute('data-effect-paused')).toBe(false)

    handle.stop()
  })

  it('observes effects that mount later and releases them on removal', async () => {
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    const handle = useContinuousEffectPause()
    const element = createElement()
    await flush()

    expect(lastObserver().observed.has(element)).toBe(true)

    element.remove()
    await flush()
    expect(lastObserver().observed.has(element)).toBe(false)

    handle.stop()
  })

  it('starts and stops observing when the marker attribute changes', async () => {
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    const element = document.createElement('div')
    document.body.append(element)
    const handle = useContinuousEffectPause()
    await flush()
    expect(lastObserver().observed.has(element)).toBe(false)

    element.setAttribute('data-continuous-effect', '')
    await flush()
    expect(lastObserver().observed.has(element)).toBe(true)

    element.removeAttribute('data-continuous-effect')
    await flush()
    expect(lastObserver().observed.has(element)).toBe(false)

    handle.stop()
  })

  it('marks the document hidden so running effects suspend globally', () => {
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    const handle = useContinuousEffectPause()

    expect(document.documentElement.hasAttribute('data-page-hidden')).toBe(
      false,
    )
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(document.documentElement.getAttribute('data-page-hidden')).toBe('')

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(document.documentElement.hasAttribute('data-page-hidden')).toBe(
      false,
    )

    handle.stop()
  })

  it('keeps effects running when viewport observation is unavailable', () => {
    expect(shouldPauseContinuousEffect(false)).toBe(true)
    expect(shouldPauseContinuousEffect(true)).toBe(false)

    globalThis.IntersectionObserver =
      undefined as unknown as typeof IntersectionObserver
    const element = createElement()
    const handle = useContinuousEffectPause()
    expect(element.hasAttribute('data-effect-paused')).toBe(false)
    handle.stop()
  })
})
