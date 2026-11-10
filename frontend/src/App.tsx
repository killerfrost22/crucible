import { useCallback, useEffect, useState } from 'react'
import { Board } from './components/Board'
import { Home, type Arrival } from './home/Home'
import { draftFromIntake, emptyDraft, type IntakeDraft } from './lib/intakeDraft'
import { navigate, UNDER_THE_HOOD } from './lib/nav'
import type { RunSource } from './lib/useBoardRun'
import type { Intake } from './types'
import { UnderTheHood } from './underthehood/UnderTheHood'

type View = { kind: 'home'; arrival: Arrival } | { kind: 'under-the-hood' } | { kind: 'board'; source: RunSource; run: number }

function sameSource(a: RunSource, b: RunSource): boolean {
  if (a.mode !== b.mode) return false
  if (a.mode === 'replay' && b.mode === 'replay') return a.name === b.name
  if (a.mode === 'saved' && b.mode === 'saved') return a.sessionId === b.sessionId
  return a.mode === 'live' && b.mode === 'live' && a.intake === b.intake
}

/**
 * `/` is the home page and `/under-the-hood` the technical explainer.
 * `?replay=<name>` plays a recording. `?decision=<id>` reopens a saved meeting from the session
 * store and does not start a model run. A live meeting rewrites its own history entry to that
 * URL once the session exists, so a refresh restores it instead of spending credit again.
 */
function viewFromUrl(prev: View | null): View {
  const params = new URLSearchParams(window.location.search)
  const replay = params.get('replay')
  if (replay) return boardView(prev, { mode: 'replay', name: replay })
  const decision = params.get('decision')
  if (decision) return boardView(prev, { mode: 'saved', sessionId: decision })
  // The live URL is `/?meeting` only until the session id is known.
  if (params.has('meeting') && prev?.kind === 'board' && prev.source.mode === 'live') return prev
  if (window.location.pathname === UNDER_THE_HOOD) return { kind: 'under-the-hood' }
  const arrival: Arrival =
    window.location.hash === '#decisions' ? 'decisions' : window.location.hash === '#convene' || prev?.kind === 'board' ? 'form' : 'fresh'
  return { kind: 'home', arrival }
}

function boardView(prev: View | null, source: RunSource): View {
  if (prev?.kind === 'board' && sameSource(prev.source, source)) return prev
  return { kind: 'board', source, run: prev?.kind === 'board' ? prev.run + 1 : 0 }
}

const nextRun = (v: View) => (v.kind === 'board' ? v.run + 1 : 0)

const TITLES: Record<View['kind'], string> = {
  home: 'Crucible — your decision, argued from five sides',
  'under-the-hood': 'How Crucible is built — Crucible',
  board: 'The board is meeting — Crucible',
}

export function App() {
  const [view, setView] = useState<View>(() => viewFromUrl(null))
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft)

  useEffect(() => {
    const onPop = () =>
      setView((v) => {
        const next = viewFromUrl(v)
        if (v.kind === next.kind && v.kind === 'home' && next.kind === 'home' && v.arrival === next.arrival) return v
        if (v.kind === 'board' && next.kind === 'board' && sameSource(v.source, next.source)) return v
        if (v.kind === 'under-the-hood' && next.kind === 'under-the-hood') return v
        return next
      })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Home places its own scroll (top, the form, or My decisions); the other views start at the top.
  useEffect(() => {
    if (view.kind !== 'home') window.scrollTo(0, 0)
    if (view.kind === 'board' && view.source.mode === 'saved') document.title = 'Your decision — Crucible'
    else if (view.kind === 'board' && view.source.mode === 'replay') document.title = 'Recorded meeting — Crucible'
    else document.title = TITLES[view.kind]
  }, [view])

  const openReplay = useCallback((name: string) => {
    window.history.pushState(null, '', `/?replay=${encodeURIComponent(name)}`)
    setView((v) => ({ kind: 'board', source: { mode: 'replay', name }, run: nextRun(v) }))
  }, [])

  const openDecision = useCallback((id: string) => {
    window.history.pushState(null, '', `/?decision=${encodeURIComponent(id)}`)
    setView((v) => ({ kind: 'board', source: { mode: 'saved', sessionId: id }, run: nextRun(v) }))
  }, [])

  const startLive = useCallback((intake: Intake) => {
    window.history.pushState(null, '', '/?meeting')
    setView((v) => ({ kind: 'board', source: { mode: 'live', intake }, run: nextRun(v) }))
  }, [])

  // Once the session exists, this history entry becomes the restore URL. replaceState does not remount the live run.
  const rememberLiveSession = useCallback((id: string) => {
    const next = `/?decision=${encodeURIComponent(id)}`
    if (`${window.location.pathname}${window.location.search}` === next) return
    window.history.replaceState(null, '', next)
  }, [])

  if (view.kind === 'home') {
    return (
      <Home
        arrival={view.arrival}
        draft={draft}
        onChange={setDraft}
        onSubmit={startLive}
        onReplay={openReplay}
        onOpenDecision={openDecision}
      />
    )
  }
  if (view.kind === 'under-the-hood') {
    return <UnderTheHood onReplay={openReplay} />
  }

  const { source } = view
  return (
    <Board
      key={view.run}
      source={source}
      onNew={() => navigate('/')}
      onDecisions={() => navigate('/#decisions')}
      onReplay={openReplay}
      onLiveSession={source.mode === 'live' ? rememberLiveSession : undefined}
      onEdit={
        source.mode === 'replay'
          ? undefined
          : (intake) => {
              setDraft(draftFromIntake(intake))
              navigate('/')
            }
      }
      onRetry={source.mode === 'replay' ? undefined : (intake) => startLive(intake)}
    />
  )
}
