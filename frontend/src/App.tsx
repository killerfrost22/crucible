import { useCallback, useEffect, useState } from 'react'
import { Board } from './components/Board'
import { Landing, type Arrival } from './landing/Landing'
import { draftFromIntake, emptyDraft, type IntakeDraft } from './lib/intakeDraft'
import type { RunSource } from './lib/useBoardRun'
import type { Intake } from './types'

type View = { kind: 'landing'; arrival: Arrival } | { kind: 'board'; source: RunSource; run: number }

/** `?replay=<name>` deep-links a recorded session. Live meetings are never restored from the URL: that would spend AI quota on reload. */
function viewFromUrl(prev: View | null): View {
  const name = new URLSearchParams(window.location.search).get('replay')
  if (name) return { kind: 'board', source: { mode: 'replay', name }, run: prev?.kind === 'board' ? prev.run + 1 : 0 }
  // The page builds itself on the first visit only; coming back from a meeting lands on the form.
  return { kind: 'landing', arrival: prev ? 'form' : 'fresh' }
}

const nextRun = (v: View) => (v.kind === 'board' ? v.run + 1 : 0)

export function App() {
  const [view, setView] = useState<View>(() => viewFromUrl(null))
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft)

  useEffect(() => {
    const onPop = () => setView((v) => viewFromUrl(v))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // The landing places its own scroll (top on a first visit, the form on a return).
  useEffect(() => {
    if (view.kind === 'board') window.scrollTo(0, 0)
  }, [view])

  const openReplay = useCallback((name: string) => {
    window.history.pushState(null, '', `?replay=${encodeURIComponent(name)}`)
    setView((v) => ({ kind: 'board', source: { mode: 'replay', name }, run: nextRun(v) }))
  }, [])

  const startLive = useCallback((intake: Intake) => {
    window.history.pushState(null, '', '?meeting')
    setView((v) => ({ kind: 'board', source: { mode: 'live', intake }, run: nextRun(v) }))
  }, [])

  const backToForm = () => {
    window.history.pushState(null, '', window.location.pathname)
    setView({ kind: 'landing', arrival: 'form' })
  }

  if (view.kind === 'landing') {
    return <Landing arrival={view.arrival} draft={draft} onChange={setDraft} onSubmit={startLive} onReplay={openReplay} />
  }

  const { source } = view
  return (
    <Board
      key={view.run}
      source={source}
      onNew={backToForm}
      onReplay={openReplay}
      onEdit={
        source.mode === 'live'
          ? () => {
              setDraft(draftFromIntake(source.intake))
              backToForm()
            }
          : undefined
      }
      onRetry={source.mode === 'live' ? () => startLive(source.intake) : undefined}
    />
  )
}
