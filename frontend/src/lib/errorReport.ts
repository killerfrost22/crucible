import { reportClientError, type ClientErrorReport } from './api'

/**
 * Sends front-end errors to the API's log (backend/guard.py `POST /client-errors`), so a page that breaks for a visitor
 * shows up somewhere. Only the error and the page's path are sent, never what the owner typed. Production builds only;
 * each distinct message goes once per page load, and at most a few per page.
 */
const MAX_PER_PAGE = 5
const sent = new Set<string>()

function report(kind: ClientErrorReport['kind'], error: unknown, extraStack = ''): void {
  if (!import.meta.env.PROD) return
  const message = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 500)
  if (sent.has(message) || sent.size >= MAX_PER_PAGE) return
  sent.add(message)
  const stack = `${error instanceof Error ? (error.stack ?? '') : ''}${extraStack}`.slice(0, 4000)
  reportClientError({ kind, message, stack, path: window.location.pathname.slice(0, 200) })
}

/** A render error caught by `ErrorBoundary`, with React's component stack. */
export function reportRenderError(error: unknown, componentStack?: string | null): void {
  report('render', error, componentStack ? `\n--- components ---${componentStack}` : '')
}

/** Uncaught errors and unhandled promise rejections anywhere on the page. */
export function installErrorReporting(): void {
  window.addEventListener('error', (event) => report('error', event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => report('rejection', event.reason))
}
