import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

/** Keep in sync with the inline script in index.html, which applies the theme before first paint. */
const STORAGE_KEY = 'crucible.theme'
const BROWSER_BAR: Record<Theme, string> = { dark: '#13100d', light: '#fdfcfa' }

const listeners = new Set<() => void>()

const current = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

function saved(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_BAR[theme])
  for (const listener of listeners) listener()
}

/** Follows the OS setting until the owner picks a theme; after that their pick wins and is remembered. */
export function initTheme() {
  apply(current())
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (event) => {
    if (!saved()) apply(event.matches ? 'light' : 'dark')
  })
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private mode: the choice still applies for this visit.
  }
  apply(theme)
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    current,
  )
}
