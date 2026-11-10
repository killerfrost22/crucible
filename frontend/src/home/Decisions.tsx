import { useEffect, useState } from 'react'
import { DECISION_COPY } from '../components/Verdict'
import { listSessions, userId } from '../lib/api'
import { sortDecisions, summarizeSession, type DecisionSummary } from '../lib/decisions'
import type { Arrival } from './Home'
import { Arrow } from './icons'

interface DecisionsProps {
  /** Changes when the owner returns from a meeting, which refetches the list. */
  arrival: Arrival
  onOpen: (id: string) => void
  onCount: (count: number) => void
}

type Load = { status: 'loading' | 'ready' | 'error'; items: DecisionSummary[] }

const PREVIEW = 6

const formatWhen = (ms: number) =>
  ms > 0 ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

function callLabel(item: DecisionSummary): string {
  if (!item.finished) return 'Stopped before a verdict'
  if (item.call === 'accept') return 'You accepted'
  if (item.call === 'override') return 'You overrode'
  return 'Awaiting your call'
}

export function Decisions({ arrival, onOpen, onCount }: DecisionsProps) {
  const [load, setLoad] = useState<Load>({ status: 'loading', items: [] })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    listSessions(userId(), ac.signal)
      .then((sessions) => {
        if (ac.signal.aborted) return
        const items = sortDecisions(sessions.map(summarizeSession).filter((item): item is DecisionSummary => item !== null))
        setLoad({ status: 'ready', items })
        onCount(items.length)
      })
      .catch(() => {
        if (ac.signal.aborted) return
        setLoad((current) => ({ status: 'error', items: current.items }))
      })
    return () => ac.abort()
  }, [arrival, onCount])

  const visible = expanded ? load.items : load.items.slice(0, PREVIEW)
  const hidden = load.items.length - visible.length

  return (
    <section className="hm-sec" id="decisions" aria-labelledby="decisions-title" aria-busy={load.status === 'loading'}>
      <div className="hm-col hm-band hm-band--head">
        <div className="hm-head-block" data-reveal>
          <p className="hm-eyebrow">My decisions</p>
          <h2 id="decisions-title">Come back to the board.</h2>
          <p>
            Meetings from this browser stay on the server. Reloading brings back the debate and the call you signed. Clearing this site’s data
            starts a fresh list.
          </p>
        </div>
      </div>
      <div className="hm-col hm-ledger-wrap">
        {load.status === 'loading' && load.items.length === 0 ? (
          <p className="hm-ledger__status">Looking up decisions on this browser…</p>
        ) : load.status === 'error' && load.items.length === 0 ? (
          <p className="hm-ledger__status" role="status">
            Saved decisions will show up here once the server answers. Recorded meetings above still play.
          </p>
        ) : load.items.length === 0 ? (
          <p className="hm-ledger__status">None yet. Convene the board and the meeting will be listed here, signature included.</p>
        ) : (
          <>
            <ol className="hm-ledger">
              {visible.map((item) => {
                const stamp = item.decision ? DECISION_COPY[item.decision].stamp : 'Partial'
                const when = formatWhen(item.updatedAt)
                const meta = [item.business, callLabel(item), when].filter(Boolean)
                return (
                  <li key={item.id}>
                    <button type="button" className="hm-ledger__open" onClick={() => onOpen(item.id)}>
                      <span className="hallmark-mark hm-ledger__mark" data-decision={item.decision ?? 'open'}>
                        {stamp}
                      </span>
                      <span className="hm-ledger__text">
                        <span className="hm-ledger__q">{item.question}</span>
                        {item.headline && <span className="hm-ledger__headline">{item.headline}</span>}
                        <span className="hm-ledger__meta">
                          {meta.map((part, i) => (
                            <span key={i}>{part}</span>
                          ))}
                        </span>
                      </span>
                      <span className="hm-ledger__go">
                        Open
                        <Arrow />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {hidden > 0 && (
              <button type="button" className="hm-ledger__more" onClick={() => setExpanded(true)}>
                Show {hidden} earlier {hidden === 1 ? 'decision' : 'decisions'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
