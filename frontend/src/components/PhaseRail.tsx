import { PHASE_ORDER, type Phase } from '../lib/board'

export const PHASE_STEPS: { phase: Phase; label: string; status: string }[] = [
  { phase: 'researching', label: 'Researching', status: 'The Researcher is gathering facts about your question.' },
  { phase: 'round1', label: 'Round 1', status: 'Round 1: each advisor is forming an opening position.' },
  { phase: 'rebuttals', label: 'Rebuttals', status: 'Round 2: the advisors are answering each other.' },
  { phase: 'chairman', label: 'Chairman', status: 'The Chairman is weighing the debate.' },
  { phase: 'ratify', label: 'Your call', status: 'The Chairman has recommended. The final call is yours.' },
]

interface PhaseRailProps {
  phase: Phase
  /** Seats finished in the current round, shown beside Round 1 / Rebuttals. */
  seatsIn: number
  /** True once the owner has ratified, which completes the last step. */
  ratified: boolean
  stalled: boolean
}

export function PhaseRail({ phase, seatsIn, ratified, stalled }: PhaseRailProps) {
  // Before the first event the board is already researching from the owner's point of view.
  const current = Math.max(PHASE_ORDER.indexOf(phase), PHASE_ORDER.indexOf('researching'))
  return (
    <nav className="rail" aria-label="Meeting progress">
      <ol className="rail__list">
        {PHASE_STEPS.map((step, i) => {
          const index = PHASE_ORDER.indexOf(step.phase)
          const state =
            index < current || (step.phase === 'ratify' && ratified)
              ? 'done'
              : index === current
                ? stalled
                  ? 'stalled'
                  : 'current'
                : 'todo'
          const counting = state === 'current' && (step.phase === 'round1' || step.phase === 'rebuttals')
          return (
            <li key={step.phase} className="rail__step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="rail__dot" aria-hidden="true">
                {state === 'done' ? (
                  <svg viewBox="0 0 12 12" width="10" height="10">
                    <path d="M2.5 6.5l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="rail__label">
                {step.label}
                {counting && <span className="rail__count"> {seatsIn}/5</span>}
                <span className="visually-hidden">
                  {state === 'done' ? ' (done)' : state === 'current' ? ' (in progress)' : state === 'stalled' ? ' (stopped)' : ''}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
