import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { DECISION_COPY } from '../lib/decisionCopy'
import { sbdcFor } from '../lib/sbdc'
import type { RatifyStatus } from '../lib/useBoardRun'
import { SEAT_BY_ID } from '../seats'
import type { Decision, EscalateTo, Ratification, SeatPoint, Step, StepWhen, ToolPick, Verdict } from '../types'
import { FactText, hostOf, SourceTag, useFacts } from './facts'
import { EASE_IN_OUT, EASE_OUT, EASE_STRIKE } from './motion'

const ESCALATION: Record<Exclude<EscalateTo, 'none'>, string> = {
  attorney: 'Talk to an attorney',
  accountant: 'Talk to an accountant',
  sbdc_advisor: 'Talk to a Small Business Development Center advisor',
  regulator: 'Check with the regulator',
}

const WHEN_ORDER: StepWhen[] = ['this week', 'next 30 days', 'next 90 days']

/** Reduced motion lands every animation on its final frame at once: static, but complete. */
function useTiming() {
  const reduce = useReducedMotion()
  return (t: Transition): Transition => (reduce ? { duration: 0 } : t)
}

export function Points({ points }: { points: SeatPoint[] }) {
  return (
    <ul className="points">
      {points.map((p, i) => (
        <li key={i} style={{ '--c': `var(--seat-${p.seat})` } as CSSProperties}>
          <span className="points__seat">{SEAT_BY_ID[p.seat]?.title ?? p.seat}</span>
          <span>
            <FactText text={p.point} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The cast ingot: poured glowing, it cools to metal and the decision is struck into it. */
export function IngotBar({ verdict }: { verdict: Verdict }) {
  const copy = DECISION_COPY[verdict.decision]
  const timing = useTiming()
  return (
    <div className="ingot-bar">
      <motion.span
        className="ingot-bar__hot"
        aria-hidden="true"
        initial={{ opacity: 1 }}
        whileInView={{ opacity: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={timing({ duration: 2.4, delay: 0.5, ease: EASE_IN_OUT })}
      />
      <motion.p
        className="hallmark-mark hallmark-mark--verdict"
        initial={{ opacity: 0, scale: 1.35 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={timing({ duration: 0.26, delay: 1.5, ease: EASE_STRIKE })}
      >
        {copy.stamp}
        <span className="visually-hidden">: {copy.gloss}</span>
      </motion.p>
      <motion.p
        className="ingot-bar__reading"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={timing({ duration: 0.5, delay: 1.9, ease: EASE_OUT })}
      >
        {Math.round(verdict.confidence)}%
      </motion.p>
    </div>
  )
}

/** The next steps by when: this week, the next 30 days, the next 90 days. */
export function StepGroups({ steps, heading: Heading = 'h4' }: { steps: Step[]; heading?: 'h3' | 'h4' }) {
  const groups = WHEN_ORDER.map((when) => ({ when, items: steps.filter((s) => s.when === when) })).filter((g) => g.items.length)
  if (!groups.length) return null
  return (
    <ol className="steps">
      {groups.map((g) => (
        <li key={g.when} className="steps__group">
          <Heading className="steps__when">{g.when}</Heading>
          <ul>
            {g.items.map((s) => (
              <li key={s.action}>
                <FactText text={s.action} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

/** Who to see before acting (the legal warning, when it's an attorney), and why. */
export function Escalation({ verdict, location }: { verdict: Verdict; location?: string }) {
  const id = useId()
  if (verdict.escalate_to === 'none') return null
  const sbdc = sbdcFor(location)
  return (
    <section className="escalate" aria-labelledby={id}>
      <h3 id={id}>{ESCALATION[verdict.escalate_to]}</h3>
      {verdict.escalation_reason && (
        <p>
          <FactText text={verdict.escalation_reason} />
        </p>
      )}
      {verdict.escalate_to === 'sbdc_advisor' && (
        <a className="escalate__link" href={sbdc.url} target="_blank" rel="noreferrer">
          Find free, confidential help at {sbdc.name}
          <span aria-hidden="true"> ↗</span>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      )}
    </section>
  )
}

/** The full verdict, in the meeting transcript. `location` is the owner's, from the intake: it picks the SBDC. */
export function VerdictCard({ verdict, location }: { verdict: Verdict; location?: string }) {
  const copy = DECISION_COPY[verdict.decision]
  const timing = useTiming()
  const titleId = useId()
  const confidence = Math.round(verdict.confidence)
  return (
    <motion.article
      className="verdict"
      data-decision={verdict.decision}
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 24 }}
      // Arrives once it is on screen, so the scroll to it never swallows the moment.
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      transition={timing({ duration: 0.6, ease: EASE_OUT })}
    >
      <header className="verdict__head">
        <p className="kicker">The Chairman recommends</p>
        <IngotBar verdict={verdict} />
        <h2 id={titleId} className="verdict__headline">
          {verdict.headline}
        </h2>
        <p className="verdict__meta">
          <span>{copy.gloss}</span>
          <span aria-hidden="true"> · </span>
          <span>Chairman’s own estimate: {confidence}%</span>
        </p>
      </header>

      <p className="verdict__rationale">
        <FactText text={verdict.rationale} />
      </p>

      <div className="verdict__grid">
        {verdict.decisive_arguments.length > 0 && (
          <section className="verdict__section">
            <h3>What carried it</h3>
            <Points points={verdict.decisive_arguments} />
          </section>
        )}
        <section className="verdict__section">
          <h3>Still objecting</h3>
          {verdict.dissent.length ? <Points points={verdict.dissent} /> : <p className="seat__muted">No seat is still objecting.</p>}
        </section>
      </div>

      {verdict.conditions.length > 0 && (
        <section className="verdict__section">
          <h3>This only holds if</h3>
          <ul className="conditions">
            {verdict.conditions.map((c) => (
              <li key={c}>
                <FactText text={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {verdict.would_change && verdict.would_change.length > 0 && (
        <section className="verdict__section">
          <h3>What would change this</h3>
          <ul className="conditions conditions--change">
            {verdict.would_change.map((c) => (
              <li key={c}>
                <FactText text={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {verdict.next_steps.length > 0 && (
        <section className="verdict__section">
          <h3>Next steps</h3>
          <StepGroups steps={verdict.next_steps} />
        </section>
      )}

      <ToolComparison tools={verdict.ai_tools} noNewTool={verdict.no_new_tool?.trim() ?? ''} />

      <Escalation verdict={verdict} location={location} />
    </motion.article>
  )
}

/** Where a tool's price came from: a fact the Researcher found (with its link check), or the AI's own estimate. */
function PriceBasis({ tool }: { tool: ToolPick }) {
  const { facts } = useFacts()
  const n = /^F(\d{1,2})$/.exec(tool.price_fact?.trim() ?? '')
  const fact = n ? facts[Number(n[1]) - 1] : undefined
  if (fact && n) {
    return (
      <span className="compare__basis">
        from <FactText text={`F${n[1]}`} /> <SourceTag fact={fact} />
      </span>
    )
  }
  // The seats have no web search: a price without a fact behind it is the model's own estimate.
  if (/unknown|quote/i.test(tool.monthly_cost)) return null
  return <span className="compare__basis">AI estimate, not from a source</span>
}

/** The endorsed tools side by side, and the option of buying nothing new. */
export function ToolComparison({ tools, noNewTool }: { tools: ToolPick[]; noNewTool: string }) {
  if (!tools.length && !noNewTool) return null
  return (
    <section className="verdict__section">
      <h3>{tools.length ? 'AI tools, side by side' : 'Without a new tool'}</h3>
      <ul className="compare">
        {tools.map((t) => (
          <li key={t.name} className="compare__opt">
            <p className="compare__name">
              {t.url && hostOf(t.url) ? (
                <a href={t.url} target="_blank" rel="noreferrer">
                  {t.name}
                  <span aria-hidden="true"> ↗</span>
                  <span className="visually-hidden"> (official site, opens in a new tab)</span>
                </a>
              ) : (
                t.name
              )}
            </p>
            <p className="compare__use">{t.use}</p>
            <dl className="compare__dl">
              <div>
                <dt>Cost</dt>
                <dd>
                  <span className="compare__price">{t.monthly_cost}</span> <PriceBasis tool={t} />
                </dd>
              </div>
              <div>
                <dt>Works with</dt>
                <dd>{t.works_with}</dd>
              </div>
              <div>
                <dt>Watch out</dt>
                <dd>{t.caveat}</dd>
              </div>
              {t.pilot_test && (
                <div>
                  <dt>Pilot test</dt>
                  <dd>
                    <FactText text={t.pilot_test} />
                  </dd>
                </div>
              )}
            </dl>
          </li>
        ))}
        {noNewTool && (
          <li className="compare__opt compare__opt--none">
            <p className="compare__name">No new tool</p>
            <p className="compare__use">
              <FactText text={noNewTool} />
            </p>
          </li>
        )}
      </ul>
    </section>
  )
}

interface YourCallProps {
  decision: Decision
  /** Conditions plus unresolved Realist blocks: accepting approves the plan with these still open. */
  prerequisites: number
  ratification: Ratification | null
  status: RatifyStatus
  error: string | null
  local: boolean
  onSubmit: (action: Ratification['action'], note: string) => Promise<void>
}

const formatAt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function YourCall({ decision, prerequisites, ratification, status, error, local, onSubmit }: YourCallProps) {
  const [mode, setMode] = useState<'choose' | 'override'>('choose')
  /** `at` of the ratification being revised; a newer signature ends the edit. */
  const [editingAt, setEditingAt] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const timing = useTiming()
  useEffect(() => {
    if (mode === 'override') noteRef.current?.focus()
  }, [mode, editingAt])
  const ids = useId()
  const saving = status === 'saving'
  const stamp = DECISION_COPY[decision].stamp.toLowerCase()
  const openCount = `${prerequisites} ${prerequisites === 1 ? 'prerequisite' : 'prerequisites'}`

  const submitOverride = async (event: FormEvent) => {
    event.preventDefault()
    if (!note.trim()) {
      setNoteError(true)
      noteRef.current?.focus()
      return
    }
    await onSubmit('override', note)
  }

  if (ratification && editingAt !== ratification.at) {
    const accepted = ratification.action === 'accept'
    return (
      <section id="your-call" tabIndex={-1} className="yourcall yourcall--done" aria-labelledby={`${ids}-title`}>
        <h2 className="yourcall__title" id={`${ids}-title`}>
          Your call
        </h2>
        {/* The owner's own hallmark, struck beside the Chairman's. */}
        <motion.p
          className="hallmark-mark hallmark-mark--owner"
          data-action={ratification.action}
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={timing({ duration: 0.26, ease: EASE_STRIKE })}
        >
          {accepted ? 'Accepted' : 'Overridden'}
        </motion.p>
        <p className="yourcall__summary">
          {accepted
            ? `You accepted the recommendation to ${stamp}${prerequisites > 0 ? ', as a conditional plan' : ''}.`
            : `You overrode the recommendation to ${stamp}.`}
        </p>
        {accepted && prerequisites > 0 && (
          <p className="yourcall__open">
            <b>Not cleared to proceed yet.</b> {openCount} under{' '}
            <a href="#brief-before">Before you proceed</a> {prerequisites === 1 ? 'is' : 'are'} still open. Accepting doesn’t mark
            them done.
          </p>
        )}
        {ratification.note && <blockquote className="yourcall__note">{ratification.note}</blockquote>}
        <p className="yourcall__meta">
          Signed {formatAt(ratification.at)}
          {local ? ' · practice signature on a recording, not saved' : ' · saved to this decision'}
        </p>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => {
            setEditingAt(ratification.at)
            setMode(ratification.action === 'override' ? 'override' : 'choose')
            setNote(ratification.note)
          }}
        >
          Change my call
        </button>
      </section>
    )
  }

  return (
    <motion.section
      id="your-call"
      tabIndex={-1}
      className="yourcall"
      aria-labelledby={`${ids}-title`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={timing({ duration: 0.4, delay: 0.15, ease: EASE_OUT })}
    >
      <h2 className="yourcall__title" id={`${ids}-title`}>
        Your call
      </h2>
      {prerequisites > 0 ? (
        <p className="yourcall__lede">
          The board advises. You decide. Accepting approves this plan with its {openCount}{' '}
          still open: you’re cleared to go ahead only once each one is met. Or overrule it and say why.
        </p>
      ) : (
        <p className="yourcall__lede">The board advises. You decide. Sign off on the recommendation, or overrule it and say why.</p>
      )}
      <p className="yourcall__unsigned print-only">Not signed. No call had been made on this recommendation when it was printed.</p>
      <div className="yourcall__actions">
        <button type="button" className="btn btn--primary" disabled={saving} aria-busy={saving && mode !== 'override'} onClick={() => onSubmit('accept', '')}>
          {saving && mode !== 'override' ? 'Saving…' : prerequisites > 0 ? 'Accept the conditional plan' : 'Accept recommendation'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          aria-expanded={mode === 'override'}
          aria-controls={`${ids}-override`}
          disabled={saving}
          onClick={() => {
            setMode(mode === 'override' ? 'choose' : 'override')
          }}
        >
          Override
        </button>
      </div>
      <AnimatePresence initial={false}>
        {mode === 'override' && (
          <motion.form
            id={`${ids}-override`}
            className="yourcall__override"
            onSubmit={submitOverride}
            noValidate
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={timing({ duration: 0.22, ease: EASE_OUT })}
          >
            <label htmlFor={`${ids}-note`}>What will you do instead, and why?</label>
            <textarea
              id={`${ids}-note`}
              ref={noteRef}
              rows={3}
              value={note}
              required
              aria-invalid={noteError || undefined}
              aria-describedby={noteError ? `${ids}-note-error` : undefined}
              onChange={(e) => {
                setNote(e.target.value)
                if (e.target.value.trim()) setNoteError(false)
              }}
            />
            {noteError && (
              <p className="field-error" id={`${ids}-note-error`}>
                Add a short note so future-you knows why you overruled the board.
              </p>
            )}
            <button type="submit" className="btn btn--primary" disabled={saving} aria-busy={saving}>
              {saving ? 'Saving…' : 'Sign my override'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </motion.section>
  )
}
