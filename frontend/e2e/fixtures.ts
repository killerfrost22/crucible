// The browser smoke tests' shared setup. The site is built against a fake API origin (playwright.config.ts), and every
// request to it is answered here, so no test needs a backend and none can start a (paid) meeting: each test fails if
// the page posts to /run_sse, throws, or reports a front-end error.
import { test as base, expect, type Page, type Route } from '@playwright/test'

export const API = 'http://api.test'
/** The owner id the app keeps in localStorage: a lower-case v4 UUID, the only form the API admits. */
export const OWNER = '3f2b8c1e-5d4a-4c7b-9e2f-1a2b3c4d5e6f'

export type Theme = 'dark' | 'light'

export interface ApiMock {
  /** Saved decisions the API knows, by session id: GET .../sessions/<id> answers with this state; others are 404. */
  sessions: Map<string, Record<string, unknown>>
  /** Every request to the API, as "METHOD path". */
  requests: string[]
  /** Every request to /run_sse. Must stay empty. */
  runSse: string[]
  /** Bodies posted to /client-errors. Must stay empty. */
  clientErrors: string[]
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) })

async function answer(route: Route, api: ApiMock) {
  const request = route.request()
  const method = request.method()
  const path = new URL(request.url()).pathname
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
  api.requests.push(`${method} ${path}`)
  if (path.endsWith('/run_sse')) {
    api.runSse.push(request.url())
    return route.abort()
  }
  if (path === '/client-errors') {
    api.clientErrors.push(request.postData() ?? '')
    return route.fulfill({ status: 204, headers: CORS })
  }
  const user = `/apps/crucible/users/${OWNER}`
  if (method === 'GET' && path === `${user}/decisions`) return json(route, 200, { decisions: [] })
  const session = method === 'GET' && path.startsWith(`${user}/sessions/`) ? decodeURIComponent(path.slice(user.length + 10)) : null
  const state = session === null ? undefined : api.sessions.get(session)
  if (session !== null && state) {
    return json(route, 200, { id: session, appName: 'crucible', userId: OWNER, state, events: [], lastUpdateTime: 1_794_312_000 })
  }
  return json(route, 404, { code: 'CRUCIBLE_NOT_FOUND', detail: 'Not found.' })
}

export const test = base.extend<{ theme: Theme; api: ApiMock }>({
  theme: ['dark', { option: true }],
  api: [
    async ({ page, theme }, use) => {
      const api: ApiMock = { sessions: new Map(), requests: [], runSse: [], clientErrors: [] }
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(String(error)))
      await page.addInitScript(
        ([theme, owner]) => {
          localStorage.setItem('crucible.theme', theme)
          localStorage.setItem('crucible.userId', owner)
        },
        [theme, OWNER] as const,
      )
      await page.route(`${API}/**`, (route) => answer(route, api))
      await use(api)
      expect(api.runSse, 'no page may start a meeting').toEqual([])
      expect(api.clientErrors, 'front-end errors reported to the API').toEqual([])
      expect(pageErrors, 'uncaught page errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

export const THEMES: Theme[] = ['dark', 'light']

/** Requests the page made for a path on its own origin (the recordings under /replays/). */
export function countRequests(page: Page, test: (path: string) => boolean): { count: () => number } {
  let count = 0
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin !== API && test(url.pathname)) count++
  })
  return { count: () => count }
}
