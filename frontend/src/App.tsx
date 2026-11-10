import { useCallback, useEffect, useRef, useState } from 'react'
import { Board } from './components/Board'
import { NotFound } from './components/NotFound'
import { Home, type Arrival } from './home/Home'
import { draftFromIntake, emptyDraft, type IntakeDraft } from './lib/intakeDraft'
import { navigate, UNDER_THE_HOOD } from './lib/nav'
import type { RunSource } from './lib/useBoardRun'
import type { Intake } from './types'
import { UnderTheHood } from './underthehood/UnderTheHood'

type View =
  | { kind: 'home'; arrival: Arrival }
  | { kind: 'under-the-hood' }
  | { kind: 'not-found' }
  | { kind: 'board'; source: RunSource; run: number }

/**
 * `/` is the home page, `/under-the-hood` the technical explainer, and `?replay=<name>` deep-links a recorded meeting.
 * Live meetings are never restored from the URL: that would spend AI credit on reload.
 */
function viewFromUrl(prev: View | null): View {
  const name = new URLSearchParams(window.location.search).get('replay')
  if (name) return { kind: 'board', source: { mode: 'replay', name }, run: prev?.kind === 'board' ? prev.run + 1 : 0 }
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

  if (view.kind === 'home') {
    return <Home arrival={view.arrival} draft={draft} onChange={setDraft} onSubmit={startLive} onReplay={openReplay} />
  }
  if (view.kind === 'under-the-hood') {
    return <UnderTheHood onReplay={openReplay} />
  }
  if (view.kind === 'not-found') {
    return <NotFound />
  }

  const { source } = view
  return (
    <Board
      key={view.run}
      source={source}
      onNew={() => navigate('/')}
      onReplay={openReplay}
      onEdit={
        source.mode === 'live'
          ? () => {
              setDraft(draftFromIntake(source.intake))
              navigate('/')
            }
          : undefined
      }
      onRetry={source.mode === 'live' ? () => startLive(source.intake) : undefined}
    />
  )
}
