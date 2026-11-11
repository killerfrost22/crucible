import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotFound } from './components/NotFound'
import { Home, type Arrival } from './home/Home'
import { draftFromIntake, emptyDraft, type IntakeDraft } from './lib/intakeDraft'
import { navigate, UNDER_THE_HOOD } from './lib/nav'
import type { RunSource } from './lib/useBoardRun'
import type { Intake } from './types'

// The meeting room and the explainer load on first visit, with their own styles, so the home page doesn't pay for them.
const Board = lazy(() => import('./components/Board').then((m) => ({ default: m.Board })))
const UnderTheHood = lazy(() => import('./underthehood/UnderTheHood').then((m) => ({ default: m.UnderTheHood })))

type View =
  | { kind: 'home'; arrival: Arrival }
  | { kind: 'under-the-hood' }
  | { kind: 'not-found' }
  | { kind: 'board'; source: RunSource; run: number }

/**
 * `/` is the home page, `/under-the-hood` the technical explainer, `?replay=<name>` a recorded meeting, and
 * `?decision=<id>` a decision this browser made, reopened from its saved state. A live meeting (`?meeting`) is never
 * restarted from the URL: that would spend AI credit on reload. Once its session exists the URL becomes its
 * `?decision=` link, so a reload reopens what was saved instead.
 */
function viewFromUrl(prev: View | null): View {
  const params = new URLSearchParams(window.location.search)
  const run = prev?.kind === 'board' ? prev.run + 1 : 0
  const name = params.get('replay')
  if (name) return { kind: 'board', source: { mode: 'replay', name }, run }
  const id = params.get('decision')
  if (id) return { kind: 'board', source: { mode: 'saved', id }, run }
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === UNDER_THE_HOOD) return { kind: 'under-the-hood' }
  if (path !== '/') return { kind: 'not-found' }
  return { kind: 'home', arrival: prev?.kind === 'board' ? 'form' : 'fresh' }
}

/** The part of the URL that picks the view. The fragment (`#seat-card-…`, `#convene`) only scrolls within it. */
const routeOf = () => window.location.pathname + window.location.search

const nextRun = (v: View) => (v.kind === 'board' ? v.run + 1 : 0)

const TITLES: Record<View['kind'], string> = {
  home: 'Crucible — your decision, argued from five sides',
  'under-the-hood': 'How Crucible is built — Crucible',
  'not-found': 'Page not found — Crucible',
  board: 'The board is meeting — Crucible',
}

export function App() {
  const [view, setView] = useState<View>(() => viewFromUrl(null))
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft)
  const route = useRef(routeOf())

  useEffect(() => {
    const onPop = () => {
      // Anchor links (and Back/Forward between them) fire popstate too. They must never remount the view: that would
      // restart a recording, or end a live meeting.
      if (routeOf() === route.current) return
      route.current = routeOf()
      setView((v) => viewFromUrl(v))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const push = useCallback((url: string) => {
    window.history.pushState(null, '', url)
    route.current = routeOf()
  }, [])

  // Home places its own scroll (top, or the form on a return); the other views start at the top.
  useEffect(() => {
    if (view.kind !== 'home') window.scrollTo(0, 0)
    document.title = TITLES[view.kind]
  }, [view])

  const openReplay = useCallback(
    (name: string) => {
      push(`/?replay=${encodeURIComponent(name)}`)
      setView((v) => ({ kind: 'board', source: { mode: 'replay', name }, run: nextRun(v) }))
    },
    [push],
  )

  const startLive = useCallback(
    (intake: Intake) => {
      push('/?meeting')
      setView((v) => ({ kind: 'board', source: { mode: 'live', intake }, run: nextRun(v) }))
    },
    [push],
  )

  // The live meeting's session exists: its URL becomes the decision's link, without a remount or a history entry.
  const rememberSession = useCallback((id: string) => {
    window.history.replaceState(null, '', `/?decision=${encodeURIComponent(id)}`)
    route.current = routeOf()
  }, [])

  // Each view gets a fresh boundary, so a crash on one page never follows the owner to the next.
  const shell = (key: string, page: ReactNode) => (
    <ErrorBoundary key={key}>
      <Suspense fallback={<div className="page" aria-busy="true" />}>{page}</Suspense>
    </ErrorBoundary>
  )

  if (view.kind === 'home') {
    return shell('home', <Home arrival={view.arrival} draft={draft} onChange={setDraft} onSubmit={startLive} onReplay={openReplay} />)
  }
  if (view.kind === 'under-the-hood') {
    return shell('under-the-hood', <UnderTheHood onReplay={openReplay} />)
  }
  if (view.kind === 'not-found') {
    return shell('not-found', <NotFound missing={{ kind: 'page' }} />)
  }

  const { source } = view
  return shell(
    `board-${view.run}`,
    <Board
      source={source}
      onNew={() => navigate('/')}
      onReplay={openReplay}
      onSession={source.mode === 'live' ? rememberSession : undefined}
      onEdit={
        source.mode === 'replay'
          ? undefined
          : (intake) => {
              setDraft(draftFromIntake(intake))
              navigate('/')
            }
      }
      // Live: a new (paid) meeting on the same question. Saved: fetch it again; nothing reruns.
      onRetry={
        source.mode === 'live'
          ? () => startLive(source.intake)
          : source.mode === 'saved'
            ? () => setView((v) => (v.kind === 'board' ? { ...v, run: v.run + 1 } : v))
            : undefined
      }
      onAskAgain={source.mode === 'saved' ? startLive : undefined}
    />,
  )
}
