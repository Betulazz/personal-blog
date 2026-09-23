export const continuousEffectSelector = '[data-continuous-effect]'

export type ContinuousEffectPauseHandle = {
  stop: () => void
}

type ContinuousEffectPauseOptions = {
  root?: Document
}

export const shouldPauseContinuousEffect = (isIntersecting: boolean) =>
  !isIntersecting

export function useContinuousEffectPause(
  options: ContinuousEffectPauseOptions = {},
): ContinuousEffectPauseHandle {
  if (
    typeof document === 'undefined' ||
    typeof IntersectionObserver === 'undefined'
  ) {
    return { stop: () => {} }
  }

  const root = options.root ?? document
  const observed = new Set<Element>()
  const intersecting = new Map<Element, boolean>()

  const applyState = (element: Element) => {
    if (shouldPauseContinuousEffect(intersecting.get(element) ?? false)) {
      element.setAttribute('data-effect-paused', 'true')
      return
    }
    element.removeAttribute('data-effect-paused')
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      intersecting.set(entry.target, entry.isIntersecting)
      applyState(entry.target)
    }
  })

  const observe = (element: Element) => {
    if (observed.has(element)) {
      return
    }
    observed.add(element)
    observer.observe(element)
  }

  const release = (element: Element) => {
    if (observed.delete(element)) {
      observer.unobserve(element)
      intersecting.delete(element)
    }
    element.removeAttribute('data-effect-paused')
  }

  const visitEffects = (node: Element, visit: (element: Element) => void) => {
    if (node.matches(continuousEffectSelector)) {
      visit(node)
    }
    for (const element of node.querySelectorAll(continuousEffectSelector)) {
      visit(element)
    }
  }

  const mutation = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const element = record.target as Element
        if (element.matches(continuousEffectSelector)) {
          observe(element)
        } else {
          release(element)
        }
        continue
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          visitEffects(node as Element, observe)
        }
      }
      for (const node of record.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          visitEffects(node as Element, release)
        }
      }
    }
  })

  const updatePageVisibility = () => {
    root.documentElement.toggleAttribute('data-page-hidden', root.hidden)
  }

  visitEffects(root.documentElement, observe)
  mutation.observe(root.documentElement, {
    attributeFilter: ['data-continuous-effect'],
    attributes: true,
    childList: true,
    subtree: true,
  })
  root.addEventListener('visibilitychange', updatePageVisibility)
  updatePageVisibility()

  return {
    stop: () => {
      mutation.disconnect()
      observer.disconnect()
      root.removeEventListener('visibilitychange', updatePageVisibility)
      root.documentElement.removeAttribute('data-page-hidden')
      for (const element of observed) {
        element.removeAttribute('data-effect-paused')
      }
      observed.clear()
      intersecting.clear()
    },
  }
}

let installed: ContinuousEffectPauseHandle | undefined

export function installContinuousEffectPause() {
  installed?.stop()
  installed = useContinuousEffectPause()
  return installed
}
