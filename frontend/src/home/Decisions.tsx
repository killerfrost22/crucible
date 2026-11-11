import { useEffect, useState } from 'react'
import { DECISION_COPY } from '../lib/decisionCopy'
import { existingUserId, listDecisions } from '../lib/api'
import { navigateOnClick } from '../lib/nav'
import type { DecisionSummary } from '../types'

const SHOWN = 4
const WHEN = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

/**
 * The decisions this browser made, newest first, each reopening from what was saved (no new run). Hidden for a
 * browser that never convened the board, and when the list can't be fetched: the rest of the page stands without it.
 */
export function Decisions() {
  const [decisions, setDecisions] = useState<DecisionSummary[]>([])
  const [all, setAll] = useState(false)

  useEffect(() => {
    const user = existingUserId()
    if (!user) return
    const abort = new AbortController()
    listDecisions(user, abort.signal)
      .then(setDecisions)
      .catch(() => {})
    return () => abort.abort()
  }, [])

  if (!decisions.length) return null
  const shown = all ? decisions : decisions.slice(0, SHOWN)
  return (
    <section className="hm-sec hm-mine" id="decisions" aria-labelledby="decisions-title">
      <div className="hm-col hm-mine__in">
        <div className="hm-mine__head">
          <p className="hm-eyebrow">Saved in this browser</p>
          <h2 id="decisions-title">Your decisions</h2>
          <p>They open only here; anyone else with the link sees nothing. Reopening one never runs the board again.</p>
        </div>
        <ul className="hm-mine__list">
          {shown.map((d) => {
            const href = `/?decision=${encodeURIComponent(d.id)}`
            return (
              <li key={d.id}>
                <a className="hm-mine__item" href={href} onClick={navigateOnClick(href)} data-decision={d.decision ?? undefined}>
                  <span className="hm-mine__stamp">{d.decision ? DECISION_COPY[d.decision].stamp : 'Stopped'}</span>
                  <span className="hm-mine__q">{d.question}</span>
                  <span className="hm-mine__meta">
                    {WHEN.format(new Date(d.updated_at))}
                    {' · '}
                    {d.signed === 'accept' ? 'You accepted' : d.signed === 'override' ? 'You overrode it' : d.finished ? 'Not signed yet' : 'No recommendation'}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
        {decisions.length > SHOWN && (
          <button type="button" className="hm-btn hm-btn--secondary hm-mine__all" aria-expanded={all} onClick={() => setAll((a) => !a)}>
            {all ? 'Show fewer' : `Show all ${decisions.length}`}
          </button>
        )}
      </div>
    </section>
  )
}
