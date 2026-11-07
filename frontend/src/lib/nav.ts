import type { MouseEvent } from 'react'

/** The technical explainer: how Crucible is built. */
export const UNDER_THE_HOOD = '/under-the-hood'

/** Client-side navigation: App re-reads the URL on `popstate`. */
export function navigate(href: string) {
  window.history.pushState(null, '', href)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** onClick for an `<a href>` that stays in the app; modified clicks (new tab, new window) keep browser behaviour. */
export const navigateOnClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  navigate(href)
}
