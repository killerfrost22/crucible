import { useCallback, useEffect, useState } from 'react'
import { Board } from './components/Board'
import { Home, type Arrival } from './home/Home'
import { draftFromIntake, emptyDraft, type IntakeDraft } from './lib/intakeDraft'
import { navigate, UNDER_THE_HOOD } from './lib/nav'
import type { RunSource } from './lib/useBoardRun'
import type { Intake } from './types'
import { UnderTheHood } from './underthehood/UnderTheHood'

type View = { kind: 'home'; arrival: Arrival } | { kind: 'under-the-hood' } | { kind: 'board'; source: RunSource; run: number }

/**
 * `/` is the home page, `/under-the-hood` the technical explainer, and `?replay=<name>` deep-links a recorded meeting.
 * Live meetings are never restored from the URL: that would spend AI credit on reload.
 */
function viewFromUrl(prev: View | null): View {
  const name = new URLSearchParams(window.location.search).get('replay')
  if (name) return { kind: 'board', source: { mode: 'replay', name }, run: prev?.kind === 'board' ? prev.run + 1 : 0 }
  if (window.location.pathname === UNDER_THE_HOOD) return { kind: 'under-the-hood' }
  return { kind: 'home', arrival: prev?.kind === 'board' ? 'form' : 'fresh' }
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
    const onPop = () => setView((v) => viewFromUrl(v))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Home places its own scroll (top, or the form on a return); the other views start at the top.
  useEffect(() => {
    if (view.kind !== 'home') window.scrollTo(0, 0)
    document.title = TITLES[view.kind]
  }, [view])

  const openReplay = useCallback((name: string) => {
    window.history.pushState(null, '', `/?replay=${encodeURIComponent(name)}`)
    setView((v) => ({ kind: 'board', source: { mode: 'replay', name }, run: nextRun(v) }))
  }, [])

  const startLive = useCallback((intake: Intake) => {
    window.history.pushState(null, '', '/?meeting')
    setView((v) => ({ kind: 'board', source: { mode: 'live', intake }, run: nextRun(v) }))
  }, [])

  if (view.kind === 'home') {
    return <Home arrival={view.arrival} draft={draft} onChange={setDraft} onSubmit={startLive} onReplay={openReplay} />
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
