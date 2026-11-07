import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export const prefersReducedMotion = () => window.matchMedia(QUERY).matches

/** Live `prefers-reduced-motion: reduce`. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}

/** Smooth unless the owner asked for less motion. */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'instant' : 'smooth')
